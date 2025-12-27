import { useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Truck,
  FileText,
  Upload,
  Calculator,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateForInput } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vendor, Business } from "@shared/schema";
import { indianStates, hsnCodes } from "@shared/schema";
const purchaseItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().default("Nos"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  gstRate: z.coerce.number().min(0).default(18),
});

const purchaseFormSchema = z.object({
  vendorId: z.string().min(1, "Please select a vendor"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  category: z.string().default("goods"),
  placeOfSupply: z.string().optional(),
  placeOfSupplyCode: z.string().optional(),
  isReverseCharge: z.boolean().default(false),
  itcEligibility: z.string().default("full"),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function PurchaseCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      vendorId: "",
      invoiceNumber: "",
      invoiceDate: formatDateForInput(),
      category: "goods",
      placeOfSupply: "",
      placeOfSupplyCode: "",
      isReverseCharge: false,
      itcEligibility: "full",
      items: [
        {
          description: "",
          hsnCode: "",
          quantity: 1,
          unit: "Nos",
          rate: 0,
          gstRate: 18,
        },
      ],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });

  const watchedVendorId = useWatch({
    control: form.control,
    name: "vendorId",
  });

  const watchedItcEligibility = useWatch({
    control: form.control,
    name: "itcEligibility",
  });

  const selectedVendor = vendors?.find((v) => v.id === watchedVendorId);

  const isInterState = useMemo(() => {
    if (!business?.stateCode || !selectedVendor?.stateCode) return false;
    return business.stateCode !== selectedVendor.stateCode;
  }, [business?.stateCode, selectedVendor?.stateCode]);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    watchedItems?.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const gstRate = Number(item.gstRate) || 18;
      const taxableAmount = quantity * rate;

      subtotal += taxableAmount;

      if (isInterState) {
        totalIgst += (taxableAmount * gstRate) / 100;
      } else {
        totalCgst += (taxableAmount * gstRate) / 200;
        totalSgst += (taxableAmount * gstRate) / 200;
      }
    });

    const totalGst = totalCgst + totalSgst + totalIgst;
    const total = subtotal + totalGst;

    let itcEligible = totalGst;
    if (watchedItcEligibility === "partial") {
      itcEligible = totalGst * 0.5;
    } else if (watchedItcEligibility === "none") {
      itcEligible = 0;
    }

    return {
      subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      total,
      itcEligible,
    };
  }, [watchedItems, isInterState, watchedItcEligibility]);

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      const purchaseData = {
        vendorId: data.vendorId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        category: data.category,
        placeOfSupply: data.placeOfSupply || selectedVendor?.state || "",
        placeOfSupplyCode: data.placeOfSupplyCode || selectedVendor?.stateCode || "",
        isInterState,
        isReverseCharge: data.isReverseCharge,
        items: data.items,
        subtotal: calculations.subtotal.toFixed(2),
        totalCgst: calculations.totalCgst.toFixed(2),
        totalSgst: calculations.totalSgst.toFixed(2),
        totalIgst: calculations.totalIgst.toFixed(2),
        totalAmount: calculations.total.toFixed(2),
        itcEligible: calculations.itcEligible.toFixed(2),
      };
      await apiRequest("POST", "/api/purchases", purchaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Purchase saved successfully" });
      navigate("/purchases");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save purchase",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseFormValues) => {
    createMutation.mutate(data);
  };

  const handleVendorChange = (vendorId: string) => {
    form.setValue("vendorId", vendorId);
    const vendor = vendors?.find((v) => v.id === vendorId);
    if (vendor) {
      form.setValue("placeOfSupply", vendor.state || "");
      form.setValue("placeOfSupplyCode", vendor.stateCode || "");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-purchase-create-title">
            Add Purchase
          </h1>
          <p className="text-muted-foreground mt-1">
            Record a purchase invoice from your vendor
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Vendor & Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            onValueChange={handleVendorChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vendor">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                  {vendor.gstin && ` (${vendor.gstin})`}
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="goods">Goods</SelectItem>
                              <SelectItem value="services">Services</SelectItem>
                              <SelectItem value="capital_goods">Capital Goods</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Invoice Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="INV-001"
                              {...field}
                              data-testid="input-invoice-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-invoice-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {selectedVendor && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">{selectedVendor.name}</span>
                        {selectedVendor.gstin && (
                          <Badge variant="outline">{selectedVendor.gstin}</Badge>
                        )}
                        {selectedVendor.state && (
                          <span className="text-muted-foreground">
                            {selectedVendor.city}, {selectedVendor.state}
                          </span>
                        )}
                        {isInterState && (
                          <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                            Inter-State (IGST)
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isReverseCharge"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <FormLabel className="font-medium">Reverse Charge</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              GST payable by recipient
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

                    <FormField
                      control={form.control}
                      name="itcEligibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ITC Eligibility</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-itc-eligibility">
                                <SelectValue placeholder="Select ITC eligibility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="full">Full ITC</SelectItem>
                              <SelectItem value="partial">Partial (50%)</SelectItem>
                              <SelectItem value="none">Not Eligible</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Line Items
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        description: "",
                        hsnCode: "",
                        quantity: 1,
                        unit: "Nos",
                        rate: 0,
                        gstRate: 18,
                      })
                    }
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 rounded-lg border space-y-4"
                      data-testid={`item-row-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item {index + 1}
                        </span>
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
                                  data-testid={`input-description-${index}`}
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
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-hsn-${index}`}>
                                    <SelectValue placeholder="Select or enter HSN" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {hsnCodes.slice(0, 20).map((hsn) => (
                                    <SelectItem key={hsn.code} value={hsn.code}>
                                      {hsn.code} - {hsn.description}
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
                              <FormLabel>Qty</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  data-testid={`input-quantity-${index}`}
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
                                  <SelectItem value="Pcs">Pcs</SelectItem>
                                  <SelectItem value="Kg">Kg</SelectItem>
                                  <SelectItem value="L">Liters</SelectItem>
                                  <SelectItem value="M">Meters</SelectItem>
                                  <SelectItem value="Hrs">Hours</SelectItem>
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
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  data-testid={`input-rate-${index}`}
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
                              <FormLabel>GST %</FormLabel>
                              <Select
                                onValueChange={(val) => field.onChange(Number(val))}
                                value={String(field.value)}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-gst-${index}`}>
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
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes about this purchase..."
                            rows={3}
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(calculations.subtotal)}</span>
                    </div>

                    {isInterState ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IGST</span>
                        <span>{formatCurrency(calculations.totalIgst)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CGST</span>
                          <span>{formatCurrency(calculations.totalCgst)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SGST</span>
                          <span>{formatCurrency(calculations.totalSgst)}</span>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(calculations.total)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          ITC Eligible
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {watchedItcEligibility === "full"
                            ? "Full credit available"
                            : watchedItcEligibility === "partial"
                            ? "50% credit available"
                            : "No credit available"}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                        {formatCurrency(calculations.itcEligible)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={createMutation.isPending}
                    data-testid="button-save-purchase"
                  >
                    {createMutation.isPending ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Purchase
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
