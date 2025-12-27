import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, FilingReturn } from "@shared/schema";

export default function Payments() {
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: filings } = useQuery<FilingReturn[]>({
    queryKey: ["/api/filing-returns"],
  });

  const pendingPayments = payments?.filter((p) => p.status === "pending") || [];
  const completedPayments = payments?.filter((p) => p.status === "paid") || [];

  const totalPending = pendingPayments.reduce((acc, p) => acc + Number(p.totalAmount), 0);
  const totalPaid = completedPayments.reduce((acc, p) => acc + Number(p.totalAmount), 0);

  const getFilingPeriod = (filingId: string | null) => {
    if (!filingId) return "-";
    const filing = filings?.find((f) => f.id === filingId);
    return filing ? `${filing.returnType} - ${filing.period}` : "-";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-payments-title">
            GST Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Track tax payments and generate challans
          </p>
        </div>
        <Button className="gap-2" data-testid="button-create-challan">
          <Plus className="h-4 w-4" />
          Create Challan
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-pending-amount">
                  {formatCurrency(totalPending)}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-paid-amount">
                  {formatCurrency(totalPaid)}
                </p>
                <p className="text-sm text-muted-foreground">Total Paid (FY)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-total-challans">
                  {payments?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Challans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>
            All GST payments and challans
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No payments yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a challan to make GST payments
              </p>
              <Button className="gap-2" data-testid="button-create-first-challan">
                <Plus className="h-4 w-4" />
                Create Challan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Return Period</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">
                        {payment.challanNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {payment.challanDate ? formatDate(payment.challanDate) : "-"}
                        </div>
                      </TableCell>
                      <TableCell>{getFilingPeriod(payment.filingReturnId)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(payment.cgstAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(payment.sgstAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(payment.igstAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(payment.totalAmount))}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" data-testid={`button-download-${payment.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Breakdown</CardTitle>
          <CardDescription>
            Tax paid vs ITC utilized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-4">Cash Payment</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-medium">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.cashCgstPaid || 0), 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-medium">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.cashSgstPaid || 0), 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-medium">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.cashIgstPaid || 0), 0) || 0)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-4">ITC Utilized</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.itcCgstUsed || 0), 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.itcSgstUsed || 0), 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(payments?.reduce((acc, p) => acc + Number(p.itcIgstUsed || 0), 0) || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
