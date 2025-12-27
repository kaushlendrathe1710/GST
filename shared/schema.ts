import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for email OTP authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: varchar("phone", { length: 15 }),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OTP tokens for email verification
export const otpTokens = pgTable("otp_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpTokenSchema = createInsertSchema(otpTokens).omit({ id: true, createdAt: true });
export type InsertOtpToken = z.infer<typeof insertOtpTokenSchema>;
export type OtpToken = typeof otpTokens.$inferSelect;

// Business Profile
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  gstin: varchar("gstin", { length: 15 }).notNull(),
  pan: varchar("pan", { length: 10 }),
  businessType: text("business_type").notNull(), // proprietor, partnership, llp, pvt_ltd
  gstScheme: text("gst_scheme").notNull(), // regular, composition
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  pincode: varchar("pincode", { length: 6 }).notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 15 }),
  logoUrl: text("logo_url"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  bankBranch: text("bank_branch"),
  invoicePrefix: varchar("invoice_prefix", { length: 10 }).default("INV"),
  invoiceStartNumber: integer("invoice_start_number").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  gstin: varchar("gstin", { length: 15 }),
  pan: varchar("pan", { length: 10 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  stateCode: varchar("state_code", { length: 2 }),
  pincode: varchar("pincode", { length: 6 }),
  email: text("email"),
  phone: varchar("phone", { length: 15 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Vendors (for purchases)
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  gstin: varchar("gstin", { length: 15 }),
  pan: varchar("pan", { length: 10 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  stateCode: varchar("state_code", { length: 2 }),
  pincode: varchar("pincode", { length: 6 }),
  email: text("email"),
  phone: varchar("phone", { length: 15 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Invoice Items
export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().default("Nos"),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["percentage", "amount"]).default("percentage"),
  gstRate: z.number().min(0).default(18),
  taxableAmount: z.number(),
  cgstAmount: z.number(),
  sgstAmount: z.number(),
  igstAmount: z.number(),
  totalAmount: z.number(),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceType: text("invoice_type").notNull(), // tax_invoice, bill_of_supply, export_invoice, debit_note, credit_note
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  placeOfSupply: text("place_of_supply").notNull(),
  placeOfSupplyCode: varchar("place_of_supply_code", { length: 2 }).notNull(),
  isInterState: boolean("is_inter_state").default(false),
  isReverseCharge: boolean("is_reverse_charge").default(false),
  isExport: boolean("is_export").default(false),
  exportType: text("export_type"), // with_payment, without_payment (LUT)
  shippingAddress: text("shipping_address"),
  items: jsonb("items").$type<InvoiceItem[]>().notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalDiscount: decimal("total_discount", { precision: 15, scale: 2 }).default("0"),
  totalCgst: decimal("total_cgst", { precision: 15, scale: 2 }).default("0"),
  totalSgst: decimal("total_sgst", { precision: 15, scale: 2 }).default("0"),
  totalIgst: decimal("total_igst", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  roundOff: decimal("round_off", { precision: 15, scale: 2 }).default("0"),
  amountInWords: text("amount_in_words"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  status: text("status").default("draft"), // draft, sent, paid, cancelled
  pdfUrl: text("pdf_url"),
  eInvoiceIrn: text("e_invoice_irn"),
  eInvoiceQrCode: text("e_invoice_qr_code"),
  linkedInvoiceId: varchar("linked_invoice_id"), // For debit/credit notes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Purchase Items
export const purchaseItemSchema = z.object({
  description: z.string().min(1),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().default("Nos"),
  rate: z.number().min(0),
  gstRate: z.number().min(0).default(18),
  taxableAmount: z.number(),
  cgstAmount: z.number(),
  sgstAmount: z.number(),
  igstAmount: z.number(),
  totalAmount: z.number(),
  isItcEligible: z.boolean().default(true),
});

export type PurchaseItem = z.infer<typeof purchaseItemSchema>;

// Purchases
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  invoiceDate: text("invoice_date").notNull(),
  placeOfSupply: text("place_of_supply").notNull(),
  placeOfSupplyCode: varchar("place_of_supply_code", { length: 2 }).notNull(),
  isInterState: boolean("is_inter_state").default(false),
  isReverseCharge: boolean("is_reverse_charge").default(false),
  category: text("category"), // goods, services, capital_goods, expense
  items: jsonb("items").$type<PurchaseItem[]>().notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalCgst: decimal("total_cgst", { precision: 15, scale: 2 }).default("0"),
  totalSgst: decimal("total_sgst", { precision: 15, scale: 2 }).default("0"),
  totalIgst: decimal("total_igst", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  itcEligible: decimal("itc_eligible", { precision: 15, scale: 2 }).default("0"),
  itcBlocked: decimal("itc_blocked", { precision: 15, scale: 2 }).default("0"),
  documentUrl: text("document_url"),
  gstr2bStatus: text("gstr2b_status"), // matched, mismatched, not_found
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// ITC Ledger
export const itcLedger = pgTable("itc_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  period: text("period").notNull(), // MMYYYY
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0"),
  itcFromPurchases: decimal("itc_from_purchases", { precision: 15, scale: 2 }).default("0"),
  itcFromGstr2b: decimal("itc_from_gstr2b", { precision: 15, scale: 2 }).default("0"),
  itcUtilized: decimal("itc_utilized", { precision: 15, scale: 2 }).default("0"),
  itcReversed: decimal("itc_reversed", { precision: 15, scale: 2 }).default("0"),
  closingBalance: decimal("closing_balance", { precision: 15, scale: 2 }).default("0"),
  mismatchAmount: decimal("mismatch_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertItcLedgerSchema = createInsertSchema(itcLedger).omit({ id: true, createdAt: true });
export type InsertItcLedger = z.infer<typeof insertItcLedgerSchema>;
export type ItcLedger = typeof itcLedger.$inferSelect;

// GST Filing Status
export const filingReturns = pgTable("filing_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  returnType: text("return_type").notNull(), // GSTR-1, GSTR-3B, CMP-08, GSTR-9, GSTR-4
  period: text("period").notNull(), // MMYYYY format
  dueDate: text("due_date").notNull(),
  status: text("status").notNull(), // pending, filed, overdue
  filedDate: text("filed_date"),
  arnNumber: varchar("arn_number", { length: 50 }),
  taxLiability: decimal("tax_liability", { precision: 15, scale: 2 }),
  itcClaimed: decimal("itc_claimed", { precision: 15, scale: 2 }),
  taxPaid: decimal("tax_paid", { precision: 15, scale: 2 }),
  lateFee: decimal("late_fee", { precision: 15, scale: 2 }),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }),
  jsonData: jsonb("json_data"), // Stores the JSON for filing
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFilingReturnSchema = createInsertSchema(filingReturns).omit({ id: true, createdAt: true });
export type InsertFilingReturn = z.infer<typeof insertFilingReturnSchema>;
export type FilingReturn = typeof filingReturns.$inferSelect;

// Payments / Challans
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  filingReturnId: varchar("filing_return_id").references(() => filingReturns.id),
  challanNumber: varchar("challan_number", { length: 50 }),
  challanDate: text("challan_date"),
  paymentMode: text("payment_mode"), // netbanking, cash, itc
  cgstAmount: decimal("cgst_amount", { precision: 15, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 15, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 15, scale: 2 }).default("0"),
  cessAmount: decimal("cess_amount", { precision: 15, scale: 2 }).default("0"),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }).default("0"),
  lateFeeAmount: decimal("late_fee_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  itcCgstUsed: decimal("itc_cgst_used", { precision: 15, scale: 2 }).default("0"),
  itcSgstUsed: decimal("itc_sgst_used", { precision: 15, scale: 2 }).default("0"),
  itcIgstUsed: decimal("itc_igst_used", { precision: 15, scale: 2 }).default("0"),
  cashCgstPaid: decimal("cash_cgst_paid", { precision: 15, scale: 2 }).default("0"),
  cashSgstPaid: decimal("cash_sgst_paid", { precision: 15, scale: 2 }).default("0"),
  cashIgstPaid: decimal("cash_igst_paid", { precision: 15, scale: 2 }).default("0"),
  status: text("status").default("pending"), // pending, paid, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Alerts / Notifications
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id),
  type: text("type").notNull(), // due_date, mismatch, overdue, payment_reminder
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isSent: boolean("is_sent").default(false), // For email/SMS
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// File uploads tracking
export const fileUploads = pgTable("file_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // logo, invoice_pdf, purchase_doc
  fileUrl: text("file_url").notNull(),
  s3Key: text("s3_key").notNull(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({ id: true, createdAt: true });
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

// HSN Codes lookup
export const hsnCodes = [
  { code: "0101", description: "Live horses, asses, mules and hinnies", gstRate: 0 },
  { code: "0201", description: "Meat of bovine animals, fresh or chilled", gstRate: 0 },
  { code: "1001", description: "Wheat and meslin", gstRate: 0 },
  { code: "1006", description: "Rice", gstRate: 5 },
  { code: "2201", description: "Waters, including mineral waters", gstRate: 18 },
  { code: "3004", description: "Medicaments", gstRate: 12 },
  { code: "6109", description: "T-shirts, singlets and other vests, knitted", gstRate: 5 },
  { code: "6203", description: "Men's suits, jackets, trousers", gstRate: 12 },
  { code: "8471", description: "Computers and peripheral equipment", gstRate: 18 },
  { code: "8517", description: "Telephone sets, smartphones", gstRate: 18 },
  { code: "8528", description: "Television receivers", gstRate: 28 },
  { code: "8703", description: "Motor cars and vehicles", gstRate: 28 },
  { code: "9401", description: "Seats and furniture", gstRate: 18 },
  { code: "9403", description: "Other furniture and parts", gstRate: 18 },
  { code: "9503", description: "Toys and games", gstRate: 12 },
  { code: "9954", description: "Construction services", gstRate: 18 },
  { code: "9971", description: "Financial and related services", gstRate: 18 },
  { code: "9972", description: "Real estate services", gstRate: 18 },
  { code: "9973", description: "Leasing or rental services", gstRate: 18 },
  { code: "9983", description: "Other professional services", gstRate: 18 },
  { code: "9984", description: "Telecommunication services", gstRate: 18 },
  { code: "9985", description: "Transport of passengers", gstRate: 5 },
  { code: "9986", description: "Transport of goods", gstRate: 5 },
  { code: "9987", description: "Supply of food/beverages", gstRate: 5 },
  { code: "9988", description: "Manufacturing services", gstRate: 18 },
  { code: "9991", description: "Public administration services", gstRate: 18 },
  { code: "9992", description: "Education services", gstRate: 0 },
  { code: "9993", description: "Health care services", gstRate: 0 },
  { code: "9995", description: "Recreation and sporting services", gstRate: 18 },
  { code: "9996", description: "Personal services", gstRate: 18 },
  { code: "9997", description: "Other services", gstRate: 18 },
];

// Indian States with codes
export const indianStates = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

// GST Notices
export const gstNotices = pgTable("gst_notices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  noticeType: text("notice_type").notNull(), // demand, reminder, show_cause, assessment, scrutiny
  noticeNumber: varchar("notice_number", { length: 100 }),
  noticeDate: text("notice_date").notNull(),
  responseDate: text("response_date"), // Due date for response
  subject: text("subject").notNull(),
  description: text("description"),
  demandAmount: decimal("demand_amount", { precision: 15, scale: 2 }),
  status: text("status").default("pending"), // pending, responded, resolved, appealed
  documentUrl: text("document_url"),
  responseUrl: text("response_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGstNoticeSchema = createInsertSchema(gstNotices).omit({ id: true, createdAt: true });
export type InsertGstNotice = z.infer<typeof insertGstNoticeSchema>;
export type GstNotice = typeof gstNotices.$inferSelect;

// Monthly Analytics
export const monthlyAnalytics = pgTable("monthly_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  period: text("period").notNull(), // MMYYYY
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).default("0"),
  totalPurchases: decimal("total_purchases", { precision: 15, scale: 2 }).default("0"),
  outputGst: decimal("output_gst", { precision: 15, scale: 2 }).default("0"),
  inputGst: decimal("input_gst", { precision: 15, scale: 2 }).default("0"),
  netGstPayable: decimal("net_gst_payable", { precision: 15, scale: 2 }).default("0"),
  itcUtilized: decimal("itc_utilized", { precision: 15, scale: 2 }).default("0"),
  cashPaid: decimal("cash_paid", { precision: 15, scale: 2 }).default("0"),
  invoiceCount: integer("invoice_count").default(0),
  purchaseCount: integer("purchase_count").default(0),
  complianceScore: integer("compliance_score").default(100), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonthlyAnalyticsSchema = createInsertSchema(monthlyAnalytics).omit({ id: true, createdAt: true });
export type InsertMonthlyAnalytics = z.infer<typeof insertMonthlyAnalyticsSchema>;
export type MonthlyAnalytics = typeof monthlyAnalytics.$inferSelect;

// Dashboard Stats type
export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  totalCustomers: number;
  gstPayable: number;
  itcAvailable: number;
  upcomingDeadlines: FilingReturn[];
  recentInvoices: Invoice[];
}

// Tax Liability calculation result
export interface TaxLiability {
  period: string;
  outputCgst: number;
  outputSgst: number;
  outputIgst: number;
  inputCgst: number;
  inputSgst: number;
  inputIgst: number;
  netCgst: number;
  netSgst: number;
  netIgst: number;
  totalPayable: number;
  itcAvailable: number;
}

// Late fee calculation result
export interface LateFeeResult {
  daysLate: number;
  lateFee: number;
  interest: number;
  totalPenalty: number;
}

// GST Intelligence insights
export interface GstInsight {
  type: 'tax_saving' | 'itc_optimization' | 'compliance' | 'growth';
  title: string;
  description: string;
  potentialSaving?: number;
  priority: 'high' | 'medium' | 'low';
}
