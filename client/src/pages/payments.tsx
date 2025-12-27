import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreditCard,
  Plus,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, FilingReturn, TaxLiability } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const paymentFormSchema = z.object({
  filingReturnId: z.string().optional(),
  paymentMode: z.enum(["netbanking", "cash", "itc"]),
  cgstAmount: z.string().default("0"),
  sgstAmount: z.string().default("0"),
  igstAmount: z.string().default("0"),
  cessAmount: z.string().default("0"),
  interestAmount: z.string().default("0"),
  lateFeeAmount: z.string().default("0"),
  itcCgstUsed: z.string().default("0"),
  itcSgstUsed: z.string().default("0"),
  itcIgstUsed: z.string().default("0"),
  cashCgstPaid: z.string().default("0"),
  cashSgstPaid: z.string().default("0"),
  cashIgstPaid: z.string().default("0"),
  challanNumber: z.string().optional(),
  challanDate: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

function PaymentDialog({ filings, taxLiability }: { filings: FilingReturn[]; taxLiability?: TaxLiability }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentMode: "itc",
      cgstAmount: taxLiability?.netCgst?.toFixed(2) || "0",
      sgstAmount: taxLiability?.netSgst?.toFixed(2) || "0",
      igstAmount: taxLiability?.netIgst?.toFixed(2) || "0",
      cessAmount: "0",
      interestAmount: "0",
      lateFeeAmount: "0",
      itcCgstUsed: "0",
      itcSgstUsed: "0",
      itcIgstUsed: "0",
      cashCgstPaid: "0",
      cashSgstPaid: "0",
      cashIgstPaid: "0",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const totalAmount = 
        parseFloat(data.cgstAmount) + 
        parseFloat(data.sgstAmount) + 
        parseFloat(data.igstAmount) +
        parseFloat(data.cessAmount) +
        parseFloat(data.interestAmount) +
        parseFloat(data.lateFeeAmount);

      const res = await apiRequest("POST", "/api/payments", {
        ...data,
        totalAmount: totalAmount.toFixed(2),
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Success", description: "Payment record created" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create payment", variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    createPaymentMutation.mutate(data);
  };

  const suggestItcUtilization = () => {
    if (!taxLiability) return;
    
    const itcAvailable = taxLiability.itcAvailable;
    const cgstLiability = taxLiability.netCgst;
    const sgstLiability = taxLiability.netSgst;
    const igstLiability = taxLiability.netIgst;

    let remainingItc = itcAvailable;
    let itcForIgst = Math.min(igstLiability, remainingItc);
    remainingItc -= itcForIgst;
    let itcForCgst = Math.min(cgstLiability, remainingItc);
    remainingItc -= itcForCgst;
    let itcForSgst = Math.min(sgstLiability, remainingItc);

    form.setValue("itcIgstUsed", itcForIgst.toFixed(2));
    form.setValue("itcCgstUsed", itcForCgst.toFixed(2));
    form.setValue("itcSgstUsed", itcForSgst.toFixed(2));
    form.setValue("cashIgstPaid", Math.max(0, igstLiability - itcForIgst).toFixed(2));
    form.setValue("cashCgstPaid", Math.max(0, cgstLiability - itcForCgst).toFixed(2));
    form.setValue("cashSgstPaid", Math.max(0, sgstLiability - itcForSgst).toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-create-payment">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record GST Payment (PMT-06)</DialogTitle>
          <DialogDescription>
            Create a challan for GST payment with ITC utilization
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="filingReturnId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Return (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-filing-return">
                          <SelectValue placeholder="Select return" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filings.filter(f => f.status === "pending").map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.returnType} - {f.period}
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
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="itc">ITC + Cash</SelectItem>
                        <SelectItem value="cash">Cash Only</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">Tax Liability</h4>
                {taxLiability && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={suggestItcUtilization}
                    data-testid="button-suggest-utilization"
                  >
                    Suggest ITC Utilization
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cgstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-cgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sgstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-sgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="igstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-igst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">ITC Utilization</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="itcCgstUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ITC for CGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-itc-cgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itcSgstUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ITC for SGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-itc-sgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itcIgstUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ITC for IGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-itc-igst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Cash Payment</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cashCgstPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cash CGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-cash-cgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cashSgstPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cash SGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-cash-sgst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cashIgstPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cash IGST</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-cash-igst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interestAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-interest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lateFeeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-late-fee" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="challanNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challan Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PMT-06-XXXXXXX" data-testid="input-challan-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="challanDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challan Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-challan-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Payment Record
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Payments() {
  const currentPeriod = (() => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${month}${year}`;
  })();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: filings } = useQuery<FilingReturn[]>({
    queryKey: ["/api/filing-returns"],
  });

  const { data: taxLiability } = useQuery<TaxLiability>({
    queryKey: ["/api/tax-liability", currentPeriod],
  });

  const totalPaid = payments?.reduce((sum, p) => 
    p.status === "paid" ? sum + parseFloat(p.totalAmount || "0") : sum, 0
  ) || 0;

  const totalPending = payments?.reduce((sum, p) => 
    p.status === "pending" ? sum + parseFloat(p.totalAmount || "0") : sum, 0
  ) || 0;

  const totalItcUsed = payments?.reduce((sum, p) => 
    sum + parseFloat(p.itcCgstUsed || "0") + parseFloat(p.itcSgstUsed || "0") + parseFloat(p.itcIgstUsed || "0"), 0
  ) || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-payments-title">
            Tax Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Track GST payments and challan history
          </p>
        </div>
        <PaymentDialog filings={filings || []} taxLiability={taxLiability} />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalItcUsed)}</p>
                <p className="text-sm text-muted-foreground">ITC Utilized</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{payments?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Challans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {taxLiability && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 dark:text-blue-400">Current Period Tax:</span>
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  {formatCurrency(taxLiability.totalPayable)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 dark:text-blue-400">ITC Available:</span>
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  {formatCurrency(taxLiability.itcAvailable)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700 dark:text-blue-400">Net Cash Required:</span>
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  {formatCurrency(Math.max(0, taxLiability.totalPayable - taxLiability.itcAvailable))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>Track all GST payments and challans</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>ITC Used</TableHead>
                    <TableHead>Cash Paid</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const itcUsed = parseFloat(payment.itcCgstUsed || "0") + 
                                   parseFloat(payment.itcSgstUsed || "0") + 
                                   parseFloat(payment.itcIgstUsed || "0");
                    const cashPaid = parseFloat(payment.cashCgstPaid || "0") + 
                                    parseFloat(payment.cashSgstPaid || "0") + 
                                    parseFloat(payment.cashIgstPaid || "0");
                    return (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-medium">
                          {payment.challanNumber || "-"}
                        </TableCell>
                        <TableCell>{payment.challanDate ? formatDate(payment.challanDate) : "-"}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(payment.cgstAmount || "0"))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(payment.sgstAmount || "0"))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(payment.igstAmount || "0"))}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(itcUsed)}</TableCell>
                        <TableCell className="text-blue-600">{formatCurrency(cashPaid)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(parseFloat(payment.totalAmount || "0"))}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={payment.status === "paid" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }
                          >
                            {payment.status === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No payment records yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Your GST payment and challan history will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
