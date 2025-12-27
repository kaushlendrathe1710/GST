import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import { storage } from "./storage";
import { sendOtpEmail, sendAlertEmail } from "./email";
import { uploadToS3, getSignedUploadUrl } from "./s3";
import {
  insertBusinessSchema,
  insertCustomerSchema,
  insertVendorSchema,
  insertInvoiceSchema,
  insertPurchaseSchema,
  insertFilingReturnSchema,
  insertPaymentSchema,
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    businessId?: string;
  }
}

const upload = multer({ storage: multer.memoryStorage() });

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireBusiness(req: Request, res: Response, next: NextFunction) {
  if (!req.session.businessId) {
    return res.status(400).json({ error: "Business not selected" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== AUTH ROUTES ====================
  
  // Request OTP
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtpToken({ email, otp, expiresAt, isUsed: false });
      
      const sent = await sendOtpEmail(email, otp);
      if (!sent) {
        console.log(`[DEV] OTP for ${email}: ${otp}`);
      }
      
      res.json({ message: "OTP sent to your email", email });
    } catch (error) {
      console.error("OTP request error:", error);
      res.status(400).json({ error: "Failed to send OTP" });
    }
  });
  
  // Verify OTP and login
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = z.object({ 
        email: z.string().email(),
        otp: z.string().length(6)
      }).parse(req.body);
      
      const token = await storage.getValidOtp(email, otp);
      if (!token) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      
      await storage.markOtpUsed(token.id);
      
      // Get or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ email, isVerified: true });
      } else if (!user.isVerified) {
        await storage.updateUser(user.id, { isVerified: true });
      }
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Set session
      req.session.userId = user.id;
      
      // Get user's businesses
      const businesses = await storage.getBusinessesByUser(user.id);
      if (businesses.length === 1) {
        req.session.businessId = businesses[0].id;
      }
      
      res.json({ 
        user: { id: user.id, email: user.email, name: user.name },
        businesses,
        currentBusinessId: req.session.businessId
      });
    } catch (error) {
      console.error("OTP verify error:", error);
      res.status(400).json({ error: "Verification failed" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null, businesses: [], currentBusinessId: null });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.json({ user: null, businesses: [], currentBusinessId: null });
      }
      
      const businesses = await storage.getBusinessesByUser(user.id);
      
      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        businesses,
        currentBusinessId: req.session.businessId || null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // Switch business
  app.post("/api/auth/switch-business", requireAuth, async (req, res) => {
    try {
      const { businessId } = z.object({ businessId: z.string() }).parse(req.body);
      
      const business = await storage.getBusiness(businessId);
      if (!business || business.userId !== req.session.userId) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      req.session.businessId = businessId;
      res.json({ currentBusinessId: businessId });
    } catch (error) {
      res.status(400).json({ error: "Failed to switch business" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // ==================== BUSINESS ROUTES ====================
  
  app.get("/api/businesses", requireAuth, async (req, res) => {
    try {
      const businesses = await storage.getBusinessesByUser(req.session.userId!);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });
  
  app.get("/api/business", requireAuth, async (req, res) => {
    try {
      if (!req.session.businessId) {
        return res.json(null);
      }
      const business = await storage.getBusiness(req.session.businessId);
      res.json(business || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  app.post("/api/business", requireAuth, async (req, res) => {
    try {
      const data = insertBusinessSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const business = await storage.createBusiness(data);
      
      // Auto-select if first business
      const businesses = await storage.getBusinessesByUser(req.session.userId!);
      if (businesses.length === 1) {
        req.session.businessId = business.id;
      }
      
      res.status(201).json(business);
    } catch (error) {
      console.error("Business creation error:", error);
      res.status(400).json({ error: "Invalid business data" });
    }
  });

  app.patch("/api/business/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getBusiness(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const data = insertBusinessSchema.partial().parse(req.body);
      const business = await storage.updateBusiness(id, data);
      res.json(business);
    } catch (error) {
      res.status(400).json({ error: "Invalid business data" });
    }
  });

  // ==================== CUSTOMER ROUTES ====================
  
  app.get("/api/customers", requireAuth, requireBusiness, async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.session.businessId!);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertCustomerSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ==================== VENDOR ROUTES ====================
  
  app.get("/api/vendors", requireAuth, requireBusiness, async (req, res) => {
    try {
      const vendors = await storage.getVendors(req.session.businessId!);
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertVendorSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const vendor = await storage.createVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.patch("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, data);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.delete("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteVendor(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // ==================== INVOICE ROUTES ====================
  
  app.get("/api/invoices", requireAuth, requireBusiness, async (req, res) => {
    try {
      const invoices = await storage.getInvoices(req.session.businessId!);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertInvoiceSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(id, data);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  app.get("/api/invoices/next-number", requireAuth, requireBusiness, async (req, res) => {
    try {
      const lastNumber = await storage.getLastInvoiceNumber(req.session.businessId!);
      res.json({ lastNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get invoice number" });
    }
  });

  // ==================== PURCHASE ROUTES ====================
  
  app.get("/api/purchases", requireAuth, requireBusiness, async (req, res) => {
    try {
      const purchases = await storage.getPurchases(req.session.businessId!);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertPurchaseSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const purchase = await storage.createPurchase(data);
      res.status(201).json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.patch("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertPurchaseSchema.partial().parse(req.body);
      const purchase = await storage.updatePurchase(id, data);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.delete("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePurchase(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase" });
    }
  });

  // ==================== FILING RETURNS ROUTES ====================
  
  app.get("/api/filing-returns", requireAuth, requireBusiness, async (req, res) => {
    try {
      const returns = await storage.getFilingReturns(req.session.businessId!);
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch filing returns" });
    }
  });

  app.get("/api/filing-returns/:id", requireAuth, async (req, res) => {
    try {
      const filing = await storage.getFilingReturn(req.params.id);
      if (!filing) {
        return res.status(404).json({ error: "Filing return not found" });
      }
      res.json(filing);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch filing return" });
    }
  });

  app.post("/api/filing-returns", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertFilingReturnSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const filing = await storage.createFilingReturn(data);
      res.status(201).json(filing);
    } catch (error) {
      res.status(400).json({ error: "Invalid filing data" });
    }
  });

  app.patch("/api/filing-returns/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertFilingReturnSchema.partial().parse(req.body);
      const filing = await storage.updateFilingReturn(id, data);
      if (!filing) {
        return res.status(404).json({ error: "Filing return not found" });
      }
      res.json(filing);
    } catch (error) {
      res.status(400).json({ error: "Invalid filing data" });
    }
  });

  // ==================== PAYMENT ROUTES ====================
  
  app.get("/api/payments", requireAuth, requireBusiness, async (req, res) => {
    try {
      const payments = await storage.getPayments(req.session.businessId!);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertPaymentSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const payment = await storage.createPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment data" });
    }
  });

  // ==================== ALERT ROUTES ====================
  
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const alerts = await storage.getAlerts(req.session.userId!);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      await storage.markAlertRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.post("/api/alerts/mark-all-read", requireAuth, async (req, res) => {
    try {
      await storage.markAllAlertsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alerts as read" });
    }
  });

  app.delete("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // ==================== FILE UPLOAD ROUTES ====================
  
  app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      const { folder = "uploads" } = req.body;
      const result = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
      );
      
      if (!result) {
        return res.status(500).json({ error: "Upload failed" });
      }
      
      // Save file record
      const fileRecord = await storage.createFileUpload({
        userId: req.session.userId!,
        businessId: req.session.businessId || null,
        fileName: req.file.originalname,
        fileType: folder,
        fileUrl: result.url,
        s3Key: result.key,
        fileSize: req.file.size,
      });
      
      res.json(fileRecord);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/upload/signed-url", requireAuth, async (req, res) => {
    try {
      const { fileName, contentType, folder } = z.object({
        fileName: z.string(),
        contentType: z.string(),
        folder: z.string().optional(),
      }).parse(req.query);
      
      const result = await getSignedUploadUrl(fileName, contentType, folder);
      if (!result) {
        return res.status(500).json({ error: "Failed to generate upload URL" });
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ==================== DASHBOARD ====================
  
  app.get("/api/dashboard", requireAuth, requireBusiness, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.businessId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== ITC LEDGER ====================
  
  app.get("/api/itc-ledger", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { period } = req.query;
      const ledger = await storage.getItcLedger(
        req.session.businessId!,
        period as string | undefined
      );
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ITC ledger" });
    }
  });

  return httpServer;
}
