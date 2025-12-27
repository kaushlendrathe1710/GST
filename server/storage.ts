import { 
  type User, 
  type InsertUser, 
  type Business, 
  type InsertBusiness,
  type Customer,
  type InsertCustomer,
  type Invoice,
  type InsertInvoice,
  type FilingReturn,
  type InsertFilingReturn,
  type DashboardStats,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Business
  getBusiness(): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getLastInvoiceNumber(): Promise<number>;
  
  // Filing Returns
  getFilingReturns(): Promise<FilingReturn[]>;
  getFilingReturn(id: string): Promise<FilingReturn | undefined>;
  createFilingReturn(filing: InsertFilingReturn): Promise<FilingReturn>;
  updateFilingReturn(id: string, filing: Partial<InsertFilingReturn>): Promise<FilingReturn | undefined>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private business: Business | undefined;
  private customers: Map<string, Customer>;
  private invoices: Map<string, Invoice>;
  private filingReturns: Map<string, FilingReturn>;
  private invoiceCounter: number;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.invoices = new Map();
    this.filingReturns = new Map();
    this.invoiceCounter = 0;
    
    this.initializeSampleData();
  }

  private initializeSampleData() {
    this.business = {
      id: "default",
      name: "Sample Business Pvt Ltd",
      gstin: "27AADCS0472N1Z1",
      pan: "AADCS0472N",
      businessType: "pvt_ltd",
      gstScheme: "regular",
      address: "123 Business Park, Sector 5",
      city: "Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "400001",
      email: "contact@samplebusiness.com",
      phone: "+91 98765 43210",
      logoUrl: null,
    };

    const sampleCustomers: Customer[] = [
      {
        id: randomUUID(),
        businessId: "default",
        name: "Tech Solutions India Pvt Ltd",
        gstin: "29AABCT1234F1ZX",
        pan: "AABCT1234F",
        address: "456 Tech Park, Whitefield",
        city: "Bangalore",
        state: "Karnataka",
        stateCode: "29",
        pincode: "560066",
        email: "accounts@techsolutions.in",
        phone: "+91 80123 45678",
      },
      {
        id: randomUUID(),
        businessId: "default",
        name: "Global Traders",
        gstin: "07AADCG5678H1ZY",
        pan: "AADCG5678H",
        address: "789 Trade Center, Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        stateCode: "07",
        pincode: "110001",
        email: "info@globaltraders.com",
        phone: "+91 11234 56789",
      },
      {
        id: randomUUID(),
        businessId: "default",
        name: "Sunrise Enterprises",
        gstin: "27AABCS9012J1ZW",
        pan: "AABCS9012J",
        address: "101 Industrial Area",
        city: "Pune",
        state: "Maharashtra",
        stateCode: "27",
        pincode: "411001",
        email: "purchase@sunrise.co.in",
        phone: "+91 20123 45678",
      },
    ];

    sampleCustomers.forEach((customer) => {
      this.customers.set(customer.id, customer);
    });

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    const nextMonthGSTR1 = new Date(today.getFullYear(), today.getMonth() + 1, 11);
    
    const sampleFilings: FilingReturn[] = [
      {
        id: randomUUID(),
        businessId: "default",
        returnType: "GSTR-3B",
        period: `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear()}`,
        dueDate: nextMonth.toISOString().split('T')[0],
        status: "pending",
        filedDate: null,
        arnNumber: null,
        taxLiability: "25000",
        itcClaimed: "15000",
        taxPaid: null,
        lateFee: null,
      },
      {
        id: randomUUID(),
        businessId: "default",
        returnType: "GSTR-1",
        period: `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear()}`,
        dueDate: nextMonthGSTR1.toISOString().split('T')[0],
        status: "pending",
        filedDate: null,
        arnNumber: null,
        taxLiability: null,
        itcClaimed: null,
        taxPaid: null,
        lateFee: null,
      },
      {
        id: randomUUID(),
        businessId: "default",
        returnType: "GSTR-3B",
        period: `${today.getMonth().toString().padStart(2, '0')}${today.getFullYear()}`,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0],
        status: "filed",
        filedDate: new Date(today.getFullYear(), today.getMonth(), 18).toISOString().split('T')[0],
        arnNumber: "AA2712345678901",
        taxLiability: "18500",
        itcClaimed: "12000",
        taxPaid: "6500",
        lateFee: "0",
      },
    ];

    sampleFilings.forEach((filing) => {
      this.filingReturns.set(filing.id, filing);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBusiness(): Promise<Business | undefined> {
    return this.business;
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = randomUUID();
    const business: Business = { ...insertBusiness, id };
    this.business = business;
    return business;
  }

  async updateBusiness(id: string, updates: Partial<InsertBusiness>): Promise<Business | undefined> {
    if (this.business && this.business.id === id) {
      this.business = { ...this.business, ...updates };
      return this.business;
    }
    return undefined;
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { ...insertCustomer, id };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (customer) {
      const updated = { ...customer, ...updates };
      this.customers.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    this.invoiceCounter++;
    const invoice: Invoice = { ...insertInvoice, id };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (invoice) {
      const updated = { ...invoice, ...updates };
      this.invoices.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoices.delete(id);
  }

  async getLastInvoiceNumber(): Promise<number> {
    return this.invoiceCounter;
  }

  async getFilingReturns(): Promise<FilingReturn[]> {
    return Array.from(this.filingReturns.values()).sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  }

  async getFilingReturn(id: string): Promise<FilingReturn | undefined> {
    return this.filingReturns.get(id);
  }

  async createFilingReturn(insertFiling: InsertFilingReturn): Promise<FilingReturn> {
    const id = randomUUID();
    const filing: FilingReturn = { ...insertFiling, id };
    this.filingReturns.set(id, filing);
    return filing;
  }

  async updateFilingReturn(id: string, updates: Partial<InsertFilingReturn>): Promise<FilingReturn | undefined> {
    const filing = this.filingReturns.get(id);
    if (filing) {
      const updated = { ...filing, ...updates };
      this.filingReturns.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const invoices = await this.getInvoices();
    const customers = await this.getCustomers();
    const filingReturns = await this.getFilingReturns();

    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const pendingAmount = invoices
      .filter((inv) => inv.status === "sent" || inv.status === "draft")
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    
    const gstPayable = invoices.reduce((sum, inv) => {
      return sum + parseFloat(inv.totalCgst || "0") + parseFloat(inv.totalSgst || "0") + parseFloat(inv.totalIgst || "0");
    }, 0);

    const upcomingDeadlines = filingReturns
      .filter((f) => f.status === "pending")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    return {
      totalInvoices: invoices.length,
      totalRevenue,
      pendingAmount,
      totalCustomers: customers.length,
      gstPayable,
      itcAvailable: gstPayable * 0.6,
      upcomingDeadlines,
      recentInvoices: invoices.slice(0, 5),
    };
  }
}

export const storage = new MemStorage();
