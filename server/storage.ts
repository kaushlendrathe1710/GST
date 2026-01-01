import { eq, and, desc, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  otpTokens,
  businesses,
  customers,
  vendors,
  invoices,
  purchases,
  itcLedger,
  filingReturns,
  payments,
  alerts,
  fileUploads,
  gstNotices,
  monthlyAnalytics,
  SUPER_ADMIN_EMAIL,
  type User,
  type InsertUser,
  type OtpToken,
  type InsertOtpToken,
  type Business,
  type InsertBusiness,
  type Customer,
  type InsertCustomer,
  type Vendor,
  type InsertVendor,
  type Invoice,
  type InsertInvoice,
  type Purchase,
  type InsertPurchase,
  type ItcLedger,
  type InsertItcLedger,
  type FilingReturn,
  type InsertFilingReturn,
  type Payment,
  type InsertPayment,
  type Alert,
  type InsertAlert,
  type FileUpload,
  type InsertFileUpload,
  type GstNotice,
  type InsertGstNotice,
  type MonthlyAnalytics,
  type InsertMonthlyAnalytics,
  type DashboardStats,
  type TaxLiability,
  type UserRole,
} from "@shared/schema";

export interface IStorage {
  // Users & Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;
  seedSuperAdmin(): Promise<void>;

  // OTP
  createOtpToken(token: InsertOtpToken): Promise<OtpToken>;
  getValidOtp(email: string, otp: string): Promise<OtpToken | undefined>;
  getValidOtpByPhone(phone: string, otp: string): Promise<OtpToken | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  markOtpUsed(id: string): Promise<void>;

  // Business
  getBusinessesByUser(userId: string): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  deleteBusiness(id: string): Promise<boolean>;

  // Customers
  getCustomers(businessId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Vendors
  getVendors(businessId: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;

  // Invoices
  getInvoices(businessId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getLastInvoiceNumber(businessId: string): Promise<number>;

  // Purchases
  getPurchases(businessId: string): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;

  // ITC Ledger
  getItcLedger(businessId: string, period?: string): Promise<ItcLedger[]>;
  createItcLedger(itc: InsertItcLedger): Promise<ItcLedger>;
  updateItcLedger(id: string, itc: Partial<InsertItcLedger>): Promise<ItcLedger | undefined>;

  // Filing Returns
  getFilingReturns(businessId: string): Promise<FilingReturn[]>;
  getFilingReturn(id: string): Promise<FilingReturn | undefined>;
  createFilingReturn(filing: InsertFilingReturn): Promise<FilingReturn>;
  updateFilingReturn(id: string, filing: Partial<InsertFilingReturn>): Promise<FilingReturn | undefined>;

  // Payments
  getPayments(businessId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Alerts
  getAlerts(userId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: string): Promise<void>;
  markAlertSent(id: string): Promise<void>;
  markAllAlertsRead(userId: string): Promise<void>;
  deleteAlert(id: string): Promise<void>;

  // Files
  createFileUpload(file: InsertFileUpload): Promise<FileUpload>;
  getFileUploads(businessId: string): Promise<FileUpload[]>;
  deleteFileUpload(id: string): Promise<boolean>;

  // GST Notices
  getGstNotices(businessId: string): Promise<GstNotice[]>;
  getGstNotice(id: string): Promise<GstNotice | undefined>;
  createGstNotice(notice: InsertGstNotice): Promise<GstNotice>;
  updateGstNotice(id: string, notice: Partial<InsertGstNotice>): Promise<GstNotice | undefined>;
  deleteGstNotice(id: string): Promise<boolean>;

  // Monthly Analytics
  getMonthlyAnalytics(businessId: string, period?: string): Promise<MonthlyAnalytics[]>;
  createOrUpdateMonthlyAnalytics(analytics: InsertMonthlyAnalytics): Promise<MonthlyAnalytics>;

  // Tax Calculations
  calculateTaxLiability(businessId: string, period: string): Promise<TaxLiability>;
  getInvoicesByPeriod(businessId: string, period: string): Promise<Invoice[]>;
  getPurchasesByPeriod(businessId: string, period: string): Promise<Purchase[]>;

  // Dashboard
  getDashboardStats(businessId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // Users & Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;
    
    // Prevent deleting super admin
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Cannot delete super admin user");
    }
    
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async seedSuperAdmin(): Promise<void> {
    const existingAdmin = await this.getUserByEmail(SUPER_ADMIN_EMAIL);
    if (!existingAdmin) {
      await db.insert(users).values({
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        name: "Super Admin",
        role: "super_admin",
        isVerified: true,
        isRegistered: true,
      });
      console.log("Super admin user seeded:", SUPER_ADMIN_EMAIL);
    } else if (existingAdmin.role !== "super_admin") {
      await db.update(users)
        .set({ role: "super_admin", isRegistered: true })
        .where(eq(users.id, existingAdmin.id));
      console.log("Super admin role updated for:", SUPER_ADMIN_EMAIL);
    }
  }

  // OTP
  async createOtpToken(token: InsertOtpToken): Promise<OtpToken> {
    const [created] = await db.insert(otpTokens).values({
      ...token,
      email: token.email?.toLowerCase() || null,
    }).returning();
    return created;
  }

  async getValidOtp(email: string, otp: string): Promise<OtpToken | undefined> {
    const now = new Date();
    const [token] = await db
      .select()
      .from(otpTokens)
      .where(
        and(
          eq(otpTokens.email, email.toLowerCase()),
          eq(otpTokens.otp, otp),
          eq(otpTokens.isUsed, false),
          gte(otpTokens.expiresAt, now)
        )
      );
    return token;
  }

  async getValidOtpByPhone(phone: string, otp: string): Promise<OtpToken | undefined> {
    const now = new Date();
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const [token] = await db
      .select()
      .from(otpTokens)
      .where(
        and(
          eq(otpTokens.phone, normalizedPhone),
          eq(otpTokens.otp, otp),
          eq(otpTokens.isUsed, false),
          gte(otpTokens.expiresAt, now)
        )
      );
    return token;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const [user] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
    return user;
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpTokens).set({ isUsed: true }).where(eq(otpTokens.id, id));
  }

  // Business
  async getBusinessesByUser(userId: string): Promise<Business[]> {
    return db.select().from(businesses).where(eq(businesses.userId, userId));
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [updated] = await db.update(businesses).set(business).where(eq(businesses.id, id)).returning();
    return updated;
  }

  async deleteBusiness(id: string): Promise<boolean> {
    const result = await db.delete(businesses).where(eq(businesses.id, id));
    return true;
  }

  // Customers
  async getCustomers(businessId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.businessId, businessId));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  // Vendors
  async getVendors(businessId: string): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.businessId, businessId));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return updated;
  }

  async deleteVendor(id: string): Promise<boolean> {
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Invoices
  async getInvoices(businessId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice as any).returning();
    return created;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(invoice as any).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  }

  async getLastInvoiceNumber(businessId: string): Promise<number> {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    
    if (result.length === 0) return 0;
    
    const match = result[0].invoiceNumber.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  // Purchases
  async getPurchases(businessId: string): Promise<Purchase[]> {
    return db
      .select()
      .from(purchases)
      .where(eq(purchases.businessId, businessId))
      .orderBy(desc(purchases.createdAt));
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [created] = await db.insert(purchases).values(purchase as any).returning();
    return created;
  }

  async updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [updated] = await db.update(purchases).set(purchase as any).where(eq(purchases.id, id)).returning();
    return updated;
  }

  async deletePurchase(id: string): Promise<boolean> {
    await db.delete(purchases).where(eq(purchases.id, id));
    return true;
  }

  // ITC Ledger
  async getItcLedger(businessId: string, period?: string): Promise<ItcLedger[]> {
    if (period) {
      return db
        .select()
        .from(itcLedger)
        .where(and(eq(itcLedger.businessId, businessId), eq(itcLedger.period, period)));
    }
    return db.select().from(itcLedger).where(eq(itcLedger.businessId, businessId));
  }

  async createItcLedger(itc: InsertItcLedger): Promise<ItcLedger> {
    const [created] = await db.insert(itcLedger).values(itc).returning();
    return created;
  }

  async updateItcLedger(id: string, itc: Partial<InsertItcLedger>): Promise<ItcLedger | undefined> {
    const [updated] = await db.update(itcLedger).set(itc).where(eq(itcLedger.id, id)).returning();
    return updated;
  }

  // Filing Returns
  async getFilingReturns(businessId: string): Promise<FilingReturn[]> {
    return db
      .select()
      .from(filingReturns)
      .where(eq(filingReturns.businessId, businessId))
      .orderBy(desc(filingReturns.dueDate));
  }

  async getFilingReturn(id: string): Promise<FilingReturn | undefined> {
    const [filing] = await db.select().from(filingReturns).where(eq(filingReturns.id, id));
    return filing;
  }

  async createFilingReturn(filing: InsertFilingReturn): Promise<FilingReturn> {
    const [created] = await db.insert(filingReturns).values(filing).returning();
    return created;
  }

  async updateFilingReturn(id: string, filing: Partial<InsertFilingReturn>): Promise<FilingReturn | undefined> {
    const [updated] = await db
      .update(filingReturns)
      .set(filing)
      .where(eq(filingReturns.id, id))
      .returning();
    return updated;
  }

  // Payments
  async getPayments(businessId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.businessId, businessId))
      .orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
    return updated;
  }

  // Alerts
  async getAlerts(userId: string): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async markAlertRead(id: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async markAlertSent(id: string): Promise<void> {
    await db.update(alerts).set({ isSent: true, sentAt: new Date() }).where(eq(alerts.id, id));
  }

  async markAllAlertsRead(userId: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.userId, userId));
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  // Files
  async createFileUpload(file: InsertFileUpload): Promise<FileUpload> {
    const [created] = await db.insert(fileUploads).values(file).returning();
    return created;
  }

  async getFileUploads(businessId: string): Promise<FileUpload[]> {
    return db.select().from(fileUploads).where(eq(fileUploads.businessId, businessId));
  }

  async deleteFileUpload(id: string): Promise<boolean> {
    await db.delete(fileUploads).where(eq(fileUploads.id, id));
    return true;
  }

  // GST Notices
  async getGstNotices(businessId: string): Promise<GstNotice[]> {
    return db.select().from(gstNotices).where(eq(gstNotices.businessId, businessId)).orderBy(desc(gstNotices.createdAt));
  }

  async getGstNotice(id: string): Promise<GstNotice | undefined> {
    const [notice] = await db.select().from(gstNotices).where(eq(gstNotices.id, id));
    return notice;
  }

  async createGstNotice(notice: InsertGstNotice): Promise<GstNotice> {
    const [created] = await db.insert(gstNotices).values(notice).returning();
    return created;
  }

  async updateGstNotice(id: string, notice: Partial<InsertGstNotice>): Promise<GstNotice | undefined> {
    const [updated] = await db.update(gstNotices).set(notice).where(eq(gstNotices.id, id)).returning();
    return updated;
  }

  async deleteGstNotice(id: string): Promise<boolean> {
    await db.delete(gstNotices).where(eq(gstNotices.id, id));
    return true;
  }

  // Monthly Analytics
  async getMonthlyAnalytics(businessId: string, period?: string): Promise<MonthlyAnalytics[]> {
    if (period) {
      return db.select().from(monthlyAnalytics)
        .where(and(eq(monthlyAnalytics.businessId, businessId), eq(monthlyAnalytics.period, period)));
    }
    return db.select().from(monthlyAnalytics)
      .where(eq(monthlyAnalytics.businessId, businessId))
      .orderBy(desc(monthlyAnalytics.period));
  }

  async createOrUpdateMonthlyAnalytics(analytics: InsertMonthlyAnalytics): Promise<MonthlyAnalytics> {
    const existing = await db.select().from(monthlyAnalytics)
      .where(and(
        eq(monthlyAnalytics.businessId, analytics.businessId),
        eq(monthlyAnalytics.period, analytics.period)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(monthlyAnalytics)
        .set(analytics)
        .where(eq(monthlyAnalytics.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(monthlyAnalytics).values(analytics).returning();
    return created;
  }

  // Tax Calculations
  async getInvoicesByPeriod(businessId: string, period: string): Promise<Invoice[]> {
    const month = parseInt(period.substring(0, 2));
    const year = parseInt(period.substring(2));
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const allInvoices = await this.getInvoices(businessId);
    return allInvoices.filter(inv => {
      const invDate = inv.invoiceDate;
      return invDate >= startDate && invDate <= endDate;
    });
  }

  async getPurchasesByPeriod(businessId: string, period: string): Promise<Purchase[]> {
    const month = parseInt(period.substring(0, 2));
    const year = parseInt(period.substring(2));
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const allPurchases = await this.getPurchases(businessId);
    return allPurchases.filter(pur => {
      const purDate = pur.invoiceDate;
      return purDate >= startDate && purDate <= endDate;
    });
  }

  async calculateTaxLiability(businessId: string, period: string): Promise<TaxLiability> {
    const periodInvoices = await this.getInvoicesByPeriod(businessId, period);
    const periodPurchases = await this.getPurchasesByPeriod(businessId, period);

    const outputCgst = periodInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalCgst || "0"), 0);
    const outputSgst = periodInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalSgst || "0"), 0);
    const outputIgst = periodInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalIgst || "0"), 0);

    const inputCgst = periodPurchases.reduce((sum, pur) => sum + parseFloat(pur.totalCgst || "0"), 0);
    const inputSgst = periodPurchases.reduce((sum, pur) => sum + parseFloat(pur.totalSgst || "0"), 0);
    const inputIgst = periodPurchases.reduce((sum, pur) => sum + parseFloat(pur.totalIgst || "0"), 0);

    const netCgst = Math.max(0, outputCgst - inputCgst);
    const netSgst = Math.max(0, outputSgst - inputSgst);
    const netIgst = Math.max(0, outputIgst - inputIgst);

    return {
      period,
      outputCgst,
      outputSgst,
      outputIgst,
      inputCgst,
      inputSgst,
      inputIgst,
      netCgst,
      netSgst,
      netIgst,
      totalPayable: netCgst + netSgst + netIgst,
      itcAvailable: inputCgst + inputSgst + inputIgst,
    };
  }

  // Dashboard
  async getDashboardStats(businessId: string): Promise<DashboardStats> {
    const allInvoices = await this.getInvoices(businessId);
    const allCustomers = await this.getCustomers(businessId);
    const allFilings = await this.getFilingReturns(businessId);

    const totalRevenue = allInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount || "0"),
      0
    );
    const pendingAmount = allInvoices
      .filter((inv) => inv.status === "sent" || inv.status === "draft")
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);

    const gstPayable = allInvoices.reduce((sum, inv) => {
      return (
        sum +
        parseFloat(inv.totalCgst || "0") +
        parseFloat(inv.totalSgst || "0") +
        parseFloat(inv.totalIgst || "0")
      );
    }, 0);

    const upcomingDeadlines = allFilings
      .filter((f) => f.status === "pending")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    return {
      totalInvoices: allInvoices.length,
      totalRevenue,
      pendingAmount,
      totalCustomers: allCustomers.length,
      gstPayable,
      itcAvailable: gstPayable * 0.6,
      upcomingDeadlines,
      recentInvoices: allInvoices.slice(0, 5),
    };
  }
}

export const storage = new DatabaseStorage();
