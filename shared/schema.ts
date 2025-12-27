import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Business Profile
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
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
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

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
  businessId: varchar("business_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceType: text("invoice_type").notNull(), // tax_invoice, bill_of_supply, export_invoice, debit_note, credit_note
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  placeOfSupply: text("place_of_supply").notNull(),
  placeOfSupplyCode: varchar("place_of_supply_code", { length: 2 }).notNull(),
  isInterState: boolean("is_inter_state").default(false),
  isReverseCharge: boolean("is_reverse_charge").default(false),
  items: jsonb("items").$type<InvoiceItem[]>().notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalDiscount: decimal("total_discount", { precision: 15, scale: 2 }).default("0"),
  totalCgst: decimal("total_cgst", { precision: 15, scale: 2 }).default("0"),
  totalSgst: decimal("total_sgst", { precision: 15, scale: 2 }).default("0"),
  totalIgst: decimal("total_igst", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  amountInWords: text("amount_in_words"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  status: text("status").default("draft"), // draft, sent, paid, cancelled
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// GST Filing Status
export const filingReturns = pgTable("filing_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  returnType: text("return_type").notNull(), // GSTR-1, GSTR-3B, CMP-08, GSTR-9
  period: text("period").notNull(), // MMYYYY format
  dueDate: text("due_date").notNull(),
  status: text("status").notNull(), // pending, filed, overdue
  filedDate: text("filed_date"),
  arnNumber: varchar("arn_number", { length: 50 }),
  taxLiability: decimal("tax_liability", { precision: 15, scale: 2 }),
  itcClaimed: decimal("itc_claimed", { precision: 15, scale: 2 }),
  taxPaid: decimal("tax_paid", { precision: 15, scale: 2 }),
  lateFee: decimal("late_fee", { precision: 15, scale: 2 }),
});

export const insertFilingReturnSchema = createInsertSchema(filingReturns).omit({ id: true });
export type InsertFilingReturn = z.infer<typeof insertFilingReturnSchema>;
export type FilingReturn = typeof filingReturns.$inferSelect;

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

// Users table for basic auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
