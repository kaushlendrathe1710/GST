import { useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  FileText,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  formatCurrency,
  formatDateForInput,
  generateInvoiceNumber,
  numberToWords,
} from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, Business, InvoiceItem } from "@shared/schema";
import { indianStates, hsnCodes } from "@shared/schema";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().default("Nos"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  discount: z.coerce.number().min(0).default(0),
  discountType: z.enum(["percentage", "amount"]).default("percentage"),
  gstRate: z.coerce.number().min(0).default(18),
});

const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  invoiceType: z.string().default("tax_invoice"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  placeOfSupply: z.string().min(1, "Place of supply is required"),
  placeOfSupplyCode: z.string().min(1),
  isReverseCharge: z.boolean().default(false),
  isExport: z.boolean().default(false),
  exportType: z.string().optional(),
  shippingAddress: z.string().optional(),
  linkedInvoiceId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function InvoicePreview({
  formData,
  items,
  customer,
  business,
  isInterState,
  invoiceType,
  exportType,
}: {
  formData: Partial<InvoiceFormValues>;
  items: any[];
  customer?: Customer;
  business?: Business;
  isInterState: boolean;
  invoiceType: string;
  exportType?: string;
}) {
  const isBillOfSupply = invoiceType === "bill_of_supply";
  const isExportInvoice = invoiceType === "export_invoice";
  const isExportWithoutPayment = isExportInvoice && exportType === "without_payment";
  const noGst = isBillOfSupply || isExportWithoutPayment;
  
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : (item.quantity || 0);
      const rate = typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : (item.rate || 0);
      const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : (item.discount || 0);
      const discountType = item.discountType || "percentage";
      const gstRate = noGst ? 0 : (typeof item.gstRate === 'string' ? parseFloat(item.gstRate) || 18 : (item.gstRate || 18));

      let baseAmount = quantity * rate;
      let discountAmount = 0;
      if (discountType === "percentage") {
        discountAmount = (baseAmount * discount) / 100;
      } else {
        discountAmount = discount;
      }
      const taxableAmount = baseAmount - discountAmount;

      let cgst = 0,
        sgst = 0,
        igst = 0;
      if (!noGst) {
        if (isInterState || isExportInvoice) {
          igst = (taxableAmount * gstRate) / 100;
        } else {
          cgst = (taxableAmount * gstRate) / 200;
          sgst = (taxableAmount * gstRate) / 200;
        }
      }

      return {
        ...item,
        taxableAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: taxableAmount + cgst + sgst + igst,
      };
    });
  }, [items, isInterState, noGst, isExportInvoice]);

  const totals = useMemo(() => {
    return calculatedItems.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (item.taxableAmount || 0),
        cgst: acc.cgst + (item.cgstAmount || 0),
        sgst: acc.sgst + (item.sgstAmount || 0),
        igst: acc.igst + (item.igstAmount || 0),
        total: acc.total + (item.totalAmount || 0),
      }),
      { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [calculatedItems]);

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border border-border rounded-lg p-4 bg-background">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{business?.name || "Your Business"}</p>
                <p className="text-xs text-muted-foreground">
                  GSTIN: {business?.gstin || "XXXXXXXXXXXXXXXXX"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">
                {invoiceType === "tax_invoice" && "TAX INVOICE"}
                {invoiceType === "bill_of_supply" && "BILL OF SUPPLY"}
                {invoiceType === "export_invoice" && "EXPORT INVOICE"}
                {invoiceType === "debit_note" && "DEBIT NOTE"}
                {invoiceType === "credit_note" && "CREDIT NOTE"}
              </p>
              <p className="text-sm text-muted-foreground">
                {generateInvoiceNumber()}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Bill To
              </p>
              <p className="font-medium">{customer?.name || "Select Customer"}</p>
              {customer && (
                <>
                  <p className="text-muted-foreground text-xs">
                    GSTIN: {customer.gstin || "N/A"}
                  </p>
                  <p className="text-muted-foreground text-xs">{customer.city}</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Invoice Date
              </p>
              <p className="font-medium">
                {formData.invoiceDate
                  ? new Date(formData.invoiceDate).toLocaleDateString("en-IN")
                  : new Date().toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {calculatedItems.length > 0 ? (
              calculatedItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 text-sm py-2 border-b border-border last:border-0"
                >
                  <div className="col-span-5">
                    <p className="font-medium truncate">{item.description || "-"}</p>
                    {item.hsnCode && (
                      <p className="text-xs text-muted-foreground">
                        HSN: {item.hsnCode}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    {item.quantity || 0} {item.unit}
                  </div>
                  <div className="col-span-2 text-right">
                    {formatCurrency(item.rate || 0)}
                  </div>
                  <div className="col-span-3 text-right font-medium">
                    {formatCurrency(item.taxableAmount || 0)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Add items to see preview
              </p>
            )}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {!noGst && (
              <>
                {(isInterState || isExportInvoice) ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST</span>
                    <span>{formatCurrency(totals.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span>{formatCurrency(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span>{formatCurrency(totals.sgst)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            {noGst && (
              <div className="flex justify-between text-muted-foreground italic">
                <span>GST</span>
                <span>Not Applicable</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          {totals.total > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Amount in Words
              </p>
              <p className="text-sm font-medium">{numberToWords(totals.total)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvoiceCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: "",
      invoiceType: "tax_invoice",
      invoiceDate: formatDateForInput(),
      dueDate: "",
      placeOfSupply: "",
      placeOfSupplyCode: "",
      isReverseCharge: false,
      isExport: false,
      exportType: "",
      shippingAddress: "",
      linkedInvoiceId: "",
      items: [
        {
          description: "",
          hsnCode: "",
          quantity: 1,
          unit: "Nos",
          rate: 0,
          discount: 0,
          discountType: "percentage",
          gstRate: 18,
        },
      ],
      notes: "",
      termsAndConditions: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);
  const placeOfSupplyCode = form.watch("placeOfSupplyCode");
  const isInterState = business?.stateCode !== placeOfSupplyCode && !!placeOfSupplyCode;
  const watchedInvoiceType = form.watch("invoiceType");
  
  const isBillOfSupply = watchedInvoiceType === "bill_of_supply";
  const isExportInvoice = watchedInvoiceType === "export_invoice";
  const isDebitNote = watchedInvoiceType === "debit_note";
  const isCreditNote = watchedInvoiceType === "credit_note";
  const isDebitOrCreditNote = isDebitNote || isCreditNote;
  
  const { data: existingInvoices } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: isDebitOrCreditNote,
  });
  
  // Use useWatch for items to ensure reactive updates to preview
  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });
  const items = watchedItems || [];

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const isBillOfSupplyType = data.invoiceType === "bill_of_supply";
      const isExportWithoutPayment = data.invoiceType === "export_invoice" && data.exportType === "without_payment";
      const noGst = isBillOfSupplyType || isExportWithoutPayment;
      
      const calculatedItems = data.items.map((item) => {
        const quantity = item.quantity || 0;
        const rate = item.rate || 0;
        const discount = item.discount || 0;
        const discountType = item.discountType || "percentage";
        const gstRate = noGst ? 0 : (item.gstRate || 18);

        let baseAmount = quantity * rate;
        let discountAmount = 0;
        if (discountType === "percentage") {
          discountAmount = (baseAmount * discount) / 100;
        } else {
          discountAmount = discount;
        }
        const taxableAmount = baseAmount - discountAmount;

        let cgst = 0,
          sgst = 0,
          igst = 0;
        if (!noGst) {
          if (isInterState || data.invoiceType === "export_invoice") {
            igst = (taxableAmount * gstRate) / 100;
          } else {
            cgst = (taxableAmount * gstRate) / 200;
            sgst = (taxableAmount * gstRate) / 200;
          }
        }

        return {
          ...item,
          gstRate,
          taxableAmount,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalAmount: taxableAmount + cgst + sgst + igst,
        };
      });

      const totals = calculatedItems.reduce(
        (acc, item) => ({
          subtotal: acc.subtotal + item.taxableAmount,
          cgst: acc.cgst + item.cgstAmount,
          sgst: acc.sgst + item.sgstAmount,
          igst: acc.igst + item.igstAmount,
          total: acc.total + item.totalAmount,
        }),
        { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
      );

      const invoiceData = {
        ...data,
        businessId: business?.id || "default",
        invoiceNumber: generateInvoiceNumber(),
        isInterState: isInterState || data.invoiceType === "export_invoice",
        isExport: data.invoiceType === "export_invoice",
        items: calculatedItems,
        subtotal: totals.subtotal.toString(),
        totalCgst: totals.cgst.toString(),
        totalSgst: totals.sgst.toString(),
        totalIgst: totals.igst.toString(),
        totalAmount: totals.total.toString(),
        amountInWords: numberToWords(totals.total),
        status: "draft",
      };

      return apiRequest("POST", "/api/invoices", invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Invoice Created",
        description: "Your invoice has been created successfully.",
      });
      navigate("/invoices");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    createInvoiceMutation.mutate(data);
  };

  const handleStateChange = (stateCode: string) => {
    const state = indianStates.find((s) => s.code === stateCode);
    if (state) {
      form.setValue("placeOfSupply", state.name);
      form.setValue("placeOfSupplyCode", state.code);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/invoices">
          <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back-to-invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-create-invoice-title">
          Create New Invoice
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a GST compliant tax invoice
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-customer">
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers?.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                  {customer.gstin && ` (${customer.gstin})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-invoice-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
                              <SelectItem value="bill_of_supply">Bill of Supply</SelectItem>
                              <SelectItem value="export_invoice">Export Invoice</SelectItem>
                              <SelectItem value="debit_note">Debit Note</SelectItem>
                              <SelectItem value="credit_note">Credit Note</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isExportInvoice && (
                    <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                      <FormField
                        control={form.control}
                        name="exportType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Export Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-export-type">
                                  <SelectValue placeholder="Select export type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="with_payment">With Payment (IGST)</SelectItem>
                                <SelectItem value="without_payment">Without Payment (LUT/Bond)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shippingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shipping/Export Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter shipping address"
                                {...field}
                                data-testid="input-shipping-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {isDebitOrCreditNote && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <FormField
                        control={form.control}
                        name="linkedInvoiceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Original Invoice Reference
                              <span className="text-muted-foreground ml-2 font-normal">
                                (Select the invoice this {isDebitNote ? "debit" : "credit"} note refers to)
                              </span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-linked-invoice">
                                  <SelectValue placeholder="Select original invoice" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {existingInvoices?.filter(inv => inv.invoiceType === "tax_invoice").map((invoice) => (
                                  <SelectItem key={invoice.id} value={invoice.id}>
                                    {invoice.invoiceNumber} - {formatCurrency(parseFloat(invoice.totalAmount))}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {isBillOfSupply && (
                    <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                      <p className="text-sm">
                        Bill of Supply is issued when the supplier is under composition scheme or for exempt/nil-rated supplies. GST will not be charged on this invoice.
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-invoice-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="placeOfSupplyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place of Supply</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleStateChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-place-of-supply">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.code} - {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isReverseCharge"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Reverse Charge</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Enable if GST is payable on reverse charge basis
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-reverse-charge"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isInterState && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Inter-State Supply:</strong> IGST will be applied as the place of
                        supply is different from your registered state.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Invoice Items</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      append({
                        description: "",
                        hsnCode: "",
                        quantity: 1,
                        unit: "Nos",
                        rate: 0,
                        discount: 0,
                        discountType: "percentage",
                        gstRate: 18,
                      })
                    }
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-border rounded-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Item {index + 1}</Label>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Product or service description"
                                  {...field}
                                  data-testid={`input-item-description-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.hsnCode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HSN/SAC Code</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const hsn = hsnCodes.find((h) => h.code === value);
                                  if (hsn) {
                                    form.setValue(`items.${index}.gstRate`, hsn.gstRate);
                                  }
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-hsn-code-${index}`}>
                                    <SelectValue placeholder="Select HSN/SAC" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {hsnCodes.map((hsn) => (
                                    <SelectItem key={hsn.code} value={hsn.code}>
                                      {hsn.code} - {hsn.description} ({hsn.gstRate}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
                                  data-testid={`input-item-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-unit-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Nos">Nos</SelectItem>
                                  <SelectItem value="Kg">Kg</SelectItem>
                                  <SelectItem value="Ltr">Ltr</SelectItem>
                                  <SelectItem value="Mtr">Mtr</SelectItem>
                                  <SelectItem value="Hrs">Hrs</SelectItem>
                                  <SelectItem value="Sqft">Sqft</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.rate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rate</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
                                  data-testid={`input-item-rate-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.gstRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Rate (%)</FormLabel>
                              <Select
                                onValueChange={(value) =>
                                  field.onChange(parseFloat(value))
                                }
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-gst-rate-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="5">5%</SelectItem>
                                  <SelectItem value="12">12%</SelectItem>
                                  <SelectItem value="18">18%</SelectItem>
                                  <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes for the customer"
                            className="min-h-[80px]"
                            {...field}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Terms and conditions for this invoice"
                            className="min-h-[80px]"
                            {...field}
                            data-testid="textarea-terms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-3 justify-end sticky bottom-6">
                <Link href="/invoices">
                  <Button variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-save-invoice"
                >
                  <Save className="h-4 w-4" />
                  {createInvoiceMutation.isPending ? "Saving..." : "Save Invoice"}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <InvoicePreview
                formData={form.getValues()}
                items={items}
                customer={selectedCustomer}
                business={business}
                isInterState={isInterState}
                invoiceType={watchedInvoiceType}
                exportType={form.watch("exportType")}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
