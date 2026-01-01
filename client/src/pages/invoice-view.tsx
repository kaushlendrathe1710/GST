import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Download,
  Edit,
  Send,
  FileText,
  Calendar,
  Building,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, Customer, Business } from "@shared/schema";

export default function InvoiceView() {
  const params = useParams();
  const invoiceId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading: invoiceLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const customer = customers?.find((c) => c.id === invoice?.customerId);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoice.invoiceNumber} downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendWhatsApp = () => {
    if (!invoice) return;
    const phone = customer?.phone?.replace(/\D/g, "") || "";
    const dueDateText = invoice.dueDate ? `\nDue Date: ${formatDate(invoice.dueDate)}` : "";
    const message = encodeURIComponent(
      `Invoice ${invoice.invoiceNumber}\nAmount: ${formatCurrency(parseFloat(invoice.totalAmount))}${dueDateText}`
    );
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  if (invoiceLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground mb-4">The invoice you're looking for doesn't exist.</p>
        <Link href="/invoices">
          <Button>Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const items = (invoice.items as any[]) || [];
  const gstTotal = parseFloat(invoice.totalCgst || "0") + 
                   parseFloat(invoice.totalSgst || "0") + 
                   parseFloat(invoice.totalIgst || "0");

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-invoice-number">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground">
              {invoice.invoiceType || "Tax Invoice"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={getStatusColor(invoice.status || 'draft')}>
            {invoice.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} data-testid="button-download-pdf">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendWhatsApp} data-testid="button-send-whatsapp">
            <Send className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button size="sm" data-testid="button-edit-invoice">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Date: {formatDate(invoice.invoiceDate)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Due: {formatDate(invoice.dueDate)}</span>
              </div>
            )}
            {invoice.placeOfSupply && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Place of Supply: {invoice.placeOfSupply}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{customer?.name || "Customer"}</span>
            </div>
            {customer?.gstin && (
              <p className="text-sm text-muted-foreground pl-6">GSTIN: {customer.gstin}</p>
            )}
            {customer?.address && (
              <p className="text-sm text-muted-foreground pl-6">{customer.address}</p>
            )}
            {customer?.phone && (
              <p className="text-sm text-muted-foreground pl-6">Phone: {customer.phone}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">#</th>
                  <th className="text-left py-2 font-medium">Description</th>
                  <th className="text-left py-2 font-medium">HSN/SAC</th>
                  <th className="text-right py-2 font-medium">Qty</th>
                  <th className="text-right py-2 font-medium">Rate</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2">{item.description || item.name}</td>
                    <td className="py-2">{item.hsnCode || "-"}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(parseFloat(item.rate || item.unitPrice || "0"))}</td>
                    <td className="py-2 text-right">{formatCurrency(parseFloat(item.amount || (item.quantity * (item.rate || item.unitPrice)) || "0"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col items-end gap-2">
            <div className="flex justify-between w-48">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(parseFloat(invoice.subtotal || invoice.totalAmount || "0"))}</span>
            </div>
            {invoice.totalCgst && parseFloat(invoice.totalCgst) > 0 && (
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">CGST:</span>
                <span>{formatCurrency(parseFloat(invoice.totalCgst))}</span>
              </div>
            )}
            {invoice.totalSgst && parseFloat(invoice.totalSgst) > 0 && (
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">SGST:</span>
                <span>{formatCurrency(parseFloat(invoice.totalSgst))}</span>
              </div>
            )}
            {invoice.totalIgst && parseFloat(invoice.totalIgst) > 0 && (
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">IGST:</span>
                <span>{formatCurrency(parseFloat(invoice.totalIgst))}</span>
              </div>
            )}
            <Separator className="w-48" />
            <div className="flex justify-between w-48 font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(parseFloat(invoice.totalAmount))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {invoice.termsAndConditions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.termsAndConditions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
