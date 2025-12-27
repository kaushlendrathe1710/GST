import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBusinessSchema, insertCustomerSchema, insertInvoiceSchema, insertFilingReturnSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Dashboard
  app.get("/api/dashboard", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Business Profile
  app.get("/api/business", async (req, res) => {
    try {
      const business = await storage.getBusiness();
      res.json(business || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  app.post("/api/business", async (req, res) => {
    try {
      const data = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(data);
      res.status(201).json(business);
    } catch (error) {
      res.status(400).json({ error: "Invalid business data" });
    }
  });

  app.patch("/api/business/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertBusinessSchema.partial().parse(req.body);
      const business = await storage.updateBusiness(id, data);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      res.status(400).json({ error: "Invalid business data" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
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

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
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

  app.delete("/api/customers/:id", async (req, res) => {
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

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
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

  app.post("/api/invoices", async (req, res) => {
    try {
      const data = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
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

  app.delete("/api/invoices/:id", async (req, res) => {
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

  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const lastNumber = await storage.getLastInvoiceNumber();
      res.json({ lastNumber });
    } catch (error) {
      res.status(500).json({ error: "Failed to get invoice number" });
    }
  });

  // Filing Returns
  app.get("/api/filing-returns", async (req, res) => {
    try {
      const returns = await storage.getFilingReturns();
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch filing returns" });
    }
  });

  app.get("/api/filing-returns/:id", async (req, res) => {
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

  app.post("/api/filing-returns", async (req, res) => {
    try {
      const data = insertFilingReturnSchema.parse(req.body);
      const filing = await storage.createFilingReturn(data);
      res.status(201).json(filing);
    } catch (error) {
      res.status(400).json({ error: "Invalid filing data" });
    }
  });

  app.patch("/api/filing-returns/:id", async (req, res) => {
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

  return httpServer;
}
