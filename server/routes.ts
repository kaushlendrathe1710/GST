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
  insertGstNoticeSchema,
  insertAlertSchema,
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

  app.patch("/api/purchases/:id", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { id } = req.params;
      const existingPurchase = await storage.getPurchase(id);
      if (!existingPurchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      if (existingPurchase.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const data = insertPurchaseSchema.partial().parse(req.body);
      const purchase = await storage.updatePurchase(id, data);
      res.json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase data" });
    }
  });

  app.delete("/api/purchases/:id", requireAuth, requireBusiness, async (req, res) => {
    try {
      const existingPurchase = await storage.getPurchase(req.params.id);
      if (!existingPurchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      if (existingPurchase.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deletePurchase(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase" });
    }
  });

  app.post("/api/purchases/reconcile", requireAuth, requireBusiness, async (req, res) => {
    try {
      const purchases = await storage.getPurchases(req.session.businessId!);
      const vendors = await storage.getVendors(req.session.businessId!);
      
      let matchedCount = 0;
      let mismatchedCount = 0;
      
      for (const purchase of purchases) {
        if (purchase.gstr2bStatus === "matched") continue;
        
        const vendor = vendors.find(v => v.id === purchase.vendorId);
        
        if (vendor?.gstin) {
          await storage.updatePurchase(purchase.id, { gstr2bStatus: "matched" });
          matchedCount++;
        } else {
          await storage.updatePurchase(purchase.id, { gstr2bStatus: "not_found" });
          mismatchedCount++;
        }
      }
      
      res.json({ 
        message: "Reconciliation complete",
        matched: matchedCount,
        notFound: mismatchedCount 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to run reconciliation" });
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

  // ==================== GST NOTICE ROUTES ====================
  
  app.get("/api/gst-notices", requireAuth, requireBusiness, async (req, res) => {
    try {
      const notices = await storage.getGstNotices(req.session.businessId!);
      res.json(notices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GST notices" });
    }
  });

  app.get("/api/gst-notices/:id", requireAuth, async (req, res) => {
    try {
      const notice = await storage.getGstNotice(req.params.id);
      if (!notice) {
        return res.status(404).json({ error: "Notice not found" });
      }
      res.json(notice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notice" });
    }
  });

  app.post("/api/gst-notices", requireAuth, requireBusiness, async (req, res) => {
    try {
      const data = insertGstNoticeSchema.parse({
        ...req.body,
        businessId: req.session.businessId
      });
      const notice = await storage.createGstNotice(data);
      res.status(201).json(notice);
    } catch (error) {
      res.status(400).json({ error: "Invalid notice data" });
    }
  });

  app.patch("/api/gst-notices/:id", requireAuth, requireBusiness, async (req, res) => {
    try {
      const existingNotice = await storage.getGstNotice(req.params.id);
      if (!existingNotice) {
        return res.status(404).json({ error: "Notice not found" });
      }
      if (existingNotice.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const data = insertGstNoticeSchema.partial().parse(req.body);
      const notice = await storage.updateGstNotice(req.params.id, data);
      res.json(notice);
    } catch (error) {
      res.status(400).json({ error: "Invalid notice data" });
    }
  });

  app.delete("/api/gst-notices/:id", requireAuth, requireBusiness, async (req, res) => {
    try {
      const existingNotice = await storage.getGstNotice(req.params.id);
      if (!existingNotice) {
        return res.status(404).json({ error: "Notice not found" });
      }
      if (existingNotice.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteGstNotice(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notice" });
    }
  });

  // ==================== TAX LIABILITY & ANALYTICS ROUTES ====================
  
  app.get("/api/tax-liability/:period", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { period } = req.params;
      const liability = await storage.calculateTaxLiability(req.session.businessId!, period);
      res.json(liability);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate tax liability" });
    }
  });

  app.get("/api/analytics", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { period } = req.query;
      const analytics = await storage.getMonthlyAnalytics(
        req.session.businessId!,
        period as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.post("/api/filing-returns/:id/auto-populate", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { id } = req.params;
      const filing = await storage.getFilingReturn(id);
      if (!filing) {
        return res.status(404).json({ error: "Filing return not found" });
      }
      if (filing.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const liability = await storage.calculateTaxLiability(req.session.businessId!, filing.period);
      
      const updatedFiling = await storage.updateFilingReturn(id, {
        taxLiability: liability.totalPayable.toFixed(2),
        itcClaimed: liability.itcAvailable.toFixed(2),
        jsonData: {
          outputCgst: liability.outputCgst,
          outputSgst: liability.outputSgst,
          outputIgst: liability.outputIgst,
          inputCgst: liability.inputCgst,
          inputSgst: liability.inputSgst,
          inputIgst: liability.inputIgst,
          netPayable: liability.totalPayable,
        }
      });
      
      res.json(updatedFiling);
    } catch (error) {
      res.status(500).json({ error: "Failed to auto-populate filing" });
    }
  });

  app.post("/api/filing-returns/:id/file-nil", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { id } = req.params;
      const filing = await storage.getFilingReturn(id);
      if (!filing) {
        return res.status(404).json({ error: "Filing return not found" });
      }
      if (filing.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedFiling = await storage.updateFilingReturn(id, {
        status: "filed",
        filedDate: new Date().toISOString().split('T')[0],
        taxLiability: "0",
        itcClaimed: "0",
        taxPaid: "0",
        jsonData: { isNilReturn: true }
      });
      
      res.json(updatedFiling);
    } catch (error) {
      res.status(500).json({ error: "Failed to file nil return" });
    }
  });

  // Late fee calculator endpoint
  app.get("/api/late-fee/:returnType/:dueDate", requireAuth, async (req, res) => {
    try {
      const { returnType, dueDate } = req.params;
      const today = new Date();
      const due = new Date(dueDate);
      const daysLate = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      
      let lateFeePerDay = 0;
      if (returnType === "GSTR-1" || returnType === "GSTR-3B") {
        lateFeePerDay = 50; // Rs 50 per day (Rs 25 CGST + Rs 25 SGST)
      } else if (returnType === "GSTR-9") {
        lateFeePerDay = 200; // Rs 200 per day
      } else if (returnType === "CMP-08" || returnType === "GSTR-4") {
        lateFeePerDay = 50;
      }
      
      const maxLateFee = returnType === "GSTR-9" ? 10000 : 5000;
      const lateFee = Math.min(daysLate * lateFeePerDay, maxLateFee);
      
      // Interest @ 18% p.a. on unpaid tax
      const { taxAmount = 0 } = req.query;
      const interest = (parseFloat(taxAmount as string) * 0.18 * daysLate) / 365;
      
      res.json({
        daysLate,
        lateFee,
        interest: parseFloat(interest.toFixed(2)),
        totalPenalty: lateFee + parseFloat(interest.toFixed(2))
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate late fee" });
    }
  });

  // ==================== GST INTELLIGENCE ROUTES ====================
  
  app.get("/api/insights", requireAuth, requireBusiness, async (req, res) => {
    try {
      const businessId = req.session.businessId!;
      const invoices = await storage.getInvoices(businessId);
      const purchases = await storage.getPurchases(businessId);
      const filings = await storage.getFilingReturns(businessId);
      
      const insights = [];
      
      // ITC Optimization check
      const totalItc = purchases.reduce((sum, p) => sum + parseFloat(p.itcEligible || "0"), 0);
      const blockedItc = purchases.reduce((sum, p) => sum + parseFloat(p.itcBlocked || "0"), 0);
      if (blockedItc > 0) {
        insights.push({
          type: 'itc_optimization',
          title: 'Blocked ITC Detected',
          description: `You have Rs ${blockedItc.toFixed(2)} in blocked ITC. Review blocked items for eligibility.`,
          potentialSaving: blockedItc,
          priority: 'high'
        });
      }
      
      // Compliance check
      const overdueFilings = filings.filter(f => f.status === "pending" && new Date(f.dueDate) < new Date());
      if (overdueFilings.length > 0) {
        insights.push({
          type: 'compliance',
          title: 'Overdue Returns',
          description: `You have ${overdueFilings.length} overdue return(s). File immediately to avoid penalties.`,
          priority: 'high'
        });
      }
      
      // Tax saving suggestion
      const totalGst = invoices.reduce((sum, inv) => 
        sum + parseFloat(inv.totalCgst || "0") + parseFloat(inv.totalSgst || "0") + parseFloat(inv.totalIgst || "0"), 0);
      if (totalItc < totalGst * 0.5) {
        insights.push({
          type: 'tax_saving',
          title: 'Low ITC Utilization',
          description: 'Your ITC is less than 50% of output tax. Consider registering more vendor purchases.',
          priority: 'medium'
        });
      }
      
      // Growth insight
      const thisMonth = new Date().toISOString().slice(0, 7);
      const thisMonthInvoices = invoices.filter(inv => inv.invoiceDate.startsWith(thisMonth));
      const revenue = thisMonthInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);
      insights.push({
        type: 'growth',
        title: 'Monthly Revenue',
        description: `This month's revenue: Rs ${revenue.toFixed(2)} from ${thisMonthInvoices.length} invoices.`,
        priority: 'low'
      });
      
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.get("/api/compliance-score", requireAuth, requireBusiness, async (req, res) => {
    try {
      const businessId = req.session.businessId!;
      const filings = await storage.getFilingReturns(businessId);
      
      let score = 100;
      const today = new Date();
      
      // Deduct for overdue filings
      const overdueFilings = filings.filter(f => f.status === "pending" && new Date(f.dueDate) < today);
      score -= overdueFilings.length * 15;
      
      // Deduct for late filings
      const lateFilings = filings.filter(f => f.status === "filed" && f.filedDate && 
        new Date(f.filedDate) > new Date(f.dueDate));
      score -= lateFilings.length * 5;
      
      // Bonus for on-time filings
      const onTimeFilings = filings.filter(f => f.status === "filed" && f.filedDate && 
        new Date(f.filedDate) <= new Date(f.dueDate));
      score += Math.min(onTimeFilings.length * 2, 10);
      
      score = Math.max(0, Math.min(100, score));
      
      res.json({
        score,
        rating: score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor',
        overdueCount: overdueFilings.length,
        lateCount: lateFilings.length,
        onTimeCount: onTimeFilings.length,
        suggestions: overdueFilings.length > 0 ? ['File overdue returns immediately'] : 
                     lateFilings.length > 0 ? ['Try to file before due dates'] : ['Keep up the good work!']
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate compliance score" });
    }
  });

  // Monthly summary report endpoint
  app.get("/api/reports/monthly/:period", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { period } = req.params;
      const businessId = req.session.businessId!;
      
      const liability = await storage.calculateTaxLiability(businessId, period);
      const invoices = await storage.getInvoicesByPeriod(businessId, period);
      const purchases = await storage.getPurchasesByPeriod(businessId, period);
      const business = await storage.getBusiness(businessId);
      
      const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);
      const totalPurchases = purchases.reduce((sum, pur) => sum + parseFloat(pur.totalAmount || "0"), 0);
      
      res.json({
        period,
        businessName: business?.name,
        gstin: business?.gstin,
        summary: {
          invoiceCount: invoices.length,
          purchaseCount: purchases.length,
          totalSales,
          totalPurchases,
          grossProfit: totalSales - totalPurchases,
        },
        taxSummary: {
          outputCgst: liability.outputCgst,
          outputSgst: liability.outputSgst,
          outputIgst: liability.outputIgst,
          inputCgst: liability.inputCgst,
          inputSgst: liability.inputSgst,
          inputIgst: liability.inputIgst,
          netPayable: liability.totalPayable,
          itcAvailable: liability.itcAvailable,
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly report" });
    }
  });

  // Due date reminder generation
  app.post("/api/send-reminders", requireAuth, requireBusiness, async (req, res) => {
    try {
      const businessId = req.session.businessId!;
      const userId = req.session.userId!;
      const filings = await storage.getFilingReturns(businessId);
      const user = await storage.getUser(userId);
      
      const today = new Date();
      const remindersSent = [];
      
      for (const filing of filings) {
        if (filing.status !== "pending") continue;
        
        const dueDate = new Date(filing.dueDate);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          const alert = await storage.createAlert({
            userId,
            businessId,
            type: "due_date",
            title: `${filing.returnType} Due Soon`,
            message: `Your ${filing.returnType} for period ${filing.period} is due in ${daysUntilDue} days.`,
            isRead: false,
            isSent: false,
          });
          
          if (user?.email) {
            const sent = await sendAlertEmail(
              user.email,
              `${filing.returnType} Filing Reminder`,
              `${filing.returnType} Due Soon`,
              `Your ${filing.returnType} for period ${filing.period} is due on ${filing.dueDate}. Please file before the due date to avoid penalties.`
            );
            if (sent) {
              await storage.markAlertSent(alert.id);
            }
          }
          
          remindersSent.push(filing.returnType);
        }
      }
      
      res.json({ 
        message: `Sent ${remindersSent.length} reminder(s)`,
        returns: remindersSent 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to send reminders" });
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

  // ==================== STRIPE PAYMENT ROUTES ====================
  
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Failed to get Stripe publishable key:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  app.post("/api/stripe/create-checkout-session", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const { amount, description, returnType, period, paymentType } = z.object({
        amount: z.number().positive(),
        description: z.string().min(1).max(200),
        returnType: z.string().optional(),
        period: z.string().optional(),
        paymentType: z.enum(["gst", "challan", "subscription"]).default("gst"),
      }).parse(req.body);
      
      const business = await storage.getBusiness(req.session.businessId!);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: user?.email,
        line_items: [
          {
            price_data: {
              currency: "inr",
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: description,
                description: returnType && period 
                  ? `${returnType} payment for period ${period}`
                  : "GST Tax Payment",
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          businessId: req.session.businessId!,
          userId: req.session.userId!,
          returnType: returnType || "",
          period: period || "",
          paymentType,
        },
        success_url: `${baseUrl}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payments?canceled=true`,
      });
      
      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/session/:sessionId", requireAuth, async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      
      res.json({
        id: session.id,
        status: session.payment_status,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        metadata: session.metadata,
      });
    } catch (error) {
      console.error("Stripe session retrieval error:", error);
      res.status(500).json({ error: "Failed to get session details" });
    }
  });

  app.post("/api/stripe/record-payment", requireAuth, requireBusiness, async (req, res) => {
    try {
      const { sessionId } = z.object({ sessionId: z.string().min(1) }).parse(req.body);
      
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }
      
      const metadata = session.metadata || {};
      
      if (!metadata.businessId || metadata.businessId !== req.session.businessId) {
        return res.status(403).json({ error: "Payment does not belong to this business" });
      }
      
      if (!metadata.userId || metadata.userId !== req.session.userId) {
        return res.status(403).json({ error: "Payment does not belong to this user" });
      }
      
      const existingPayments = await storage.getPayments(req.session.businessId!);
      const alreadyRecorded = existingPayments.some(p => 
        p.challanNumber === `STRIPE-${session.id.slice(-8).toUpperCase()}`
      );
      if (alreadyRecorded) {
        return res.json({ success: true, message: "Payment already recorded" });
      }
      
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      
      const payment = await storage.createPayment({
        businessId: req.session.businessId!,
        totalAmount: amount.toFixed(2),
        paymentMode: "stripe",
        challanNumber: `STRIPE-${session.id.slice(-8).toUpperCase()}`,
        challanDate: new Date().toISOString().split("T")[0],
        cgstAmount: "0.00",
        sgstAmount: "0.00",
        igstAmount: amount.toFixed(2),
        cessAmount: "0.00",
        lateFeeAmount: "0.00",
        interestAmount: "0.00",
        status: "paid",
      });
      
      res.json({ success: true, payment });
    } catch (error) {
      console.error("Record payment error:", error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  return httpServer;
}
