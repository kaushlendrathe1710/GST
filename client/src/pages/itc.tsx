import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Purchase, ItcLedger, Vendor } from "@shared/schema";

export default function ITC() {
  const { toast } = useToast();
  
  const { data: purchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const { data: itcLedger } = useQuery<ItcLedger[]>({
    queryKey: ["/api/itc-ledger"],
  });

  const matchedPurchases = purchases?.filter((p) => p.gstr2bStatus === "matched") || [];
  const mismatchedPurchases = purchases?.filter((p) => p.gstr2bStatus === "mismatched") || [];
  const notFoundPurchases = purchases?.filter((p) => p.gstr2bStatus === "not_found") || [];

  const totalItcFromPurchases = purchases?.reduce((acc, p) => acc + Number(p.itcEligible || 0), 0) || 0;
  const totalItcBlocked = purchases?.reduce((acc, p) => acc + Number(p.itcBlocked || 0), 0) || 0;
  const matchedItc = matchedPurchases.reduce((acc, p) => acc + Number(p.itcEligible || 0), 0);
  const mismatchedAmount = mismatchedPurchases.reduce((acc, p) => acc + Number(p.itcEligible || 0), 0);

  const matchRate = totalItcFromPurchases > 0 ? (matchedItc / totalItcFromPurchases) * 100 : 0;
  
  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find(v => v.id === vendorId);
    return vendor?.name || vendorId;
  };
  
  const updateGstr2bStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: string; status: string }) => {
      await apiRequest("PATCH", `/api/purchases/${purchaseId}`, { gstr2bStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });
  
  const runReconciliationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/purchases/reconcile", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ 
        title: "Reconciliation Complete",
        description: "Purchases have been matched with GSTR-2B data" 
      });
    },
    onError: () => {
      toast({ 
        title: "Reconciliation Failed", 
        description: "Could not complete GSTR-2B reconciliation",
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-itc-title">
              ITC Ledger & Reconciliation
            </h1>
            <p className="text-muted-foreground mt-1">
              Track Input Tax Credit and GSTR-2B reconciliation status
            </p>
          </div>
          <Button
            onClick={() => runReconciliationMutation.mutate()}
            disabled={runReconciliationMutation.isPending}
            className="gap-2"
            data-testid="button-run-reconciliation"
          >
            <RefreshCw className={`h-4 w-4 ${runReconciliationMutation.isPending ? 'animate-spin' : ''}`} />
            {runReconciliationMutation.isPending ? "Running..." : "Run Reconciliation"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-total-itc">
                  {formatCurrency(totalItcFromPurchases)}
                </p>
                <p className="text-sm text-muted-foreground">Total ITC Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-matched-itc">
                  {formatCurrency(matchedItc)}
                </p>
                <p className="text-sm text-muted-foreground">Matched with GSTR-2B</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-mismatch-amount">
                  {formatCurrency(mismatchedAmount)}
                </p>
                <p className="text-sm text-muted-foreground">Mismatch Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-blocked-itc">
                  {formatCurrency(totalItcBlocked)}
                </p>
                <p className="text-sm text-muted-foreground">ITC Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">GSTR-2B Reconciliation Status</CardTitle>
          <CardDescription>
            Match rate: {matchRate.toFixed(1)}% of your ITC is matched with GSTR-2B
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={matchRate} className="h-3" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-2xl font-semibold">{matchedPurchases.length}</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Matched</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-2xl font-semibold">{mismatchedPurchases.length}</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Mismatched</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300">
                  <XCircle className="h-5 w-5" />
                  <span className="text-2xl font-semibold">{notFoundPurchases.length}</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">Not in GSTR-2B</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
          <TabsTrigger value="mismatches" data-testid="tab-mismatches">Mismatches</TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">Monthly Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ITC Summary by Tax Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Utilized</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">CGST</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalCgst || 0), 0) || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalCgst || 0), 0) || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">SGST</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalSgst || 0), 0) || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalSgst || 0), 0) || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">IGST</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalIgst || 0), 0) || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(purchases?.reduce((acc, p) => acc + Number(p.totalIgst || 0), 0) || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mismatches">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchases Requiring Attention</CardTitle>
              <CardDescription>
                Review and reconcile these purchases with your vendors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mismatchedPurchases.length === 0 && notFoundPurchases.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">All Clear!</h3>
                  <p className="text-muted-foreground">
                    All your purchases are matched with GSTR-2B
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...mismatchedPurchases, ...notFoundPurchases].map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.invoiceNumber}
                        </TableCell>
                        <TableCell>{getVendorName(purchase.vendorId)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(purchase.totalAmount))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              purchase.gstr2bStatus === "mismatched"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            }
                          >
                            {purchase.gstr2bStatus === "mismatched" ? "Mismatch" : "Not Found"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {purchase.gstr2bStatus === "mismatched"
                            ? "Amount differs from GSTR-2B"
                            : "Not reported by vendor"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => updateGstr2bStatusMutation.mutate({ 
                                purchaseId: purchase.id, 
                                status: "matched" 
                              })}
                              disabled={updateGstr2bStatusMutation.isPending}
                              data-testid={`button-mark-matched-${purchase.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => updateGstr2bStatusMutation.mutate({ 
                                purchaseId: purchase.id, 
                                status: "mismatched" 
                              })}
                              disabled={updateGstr2bStatusMutation.isPending}
                              data-testid={`button-mark-mismatch-${purchase.id}`}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly ITC Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {!itcLedger || itcLedger.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No ledger entries yet</h3>
                  <p className="text-muted-foreground">
                    ITC ledger will be populated as you file returns
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">ITC Availed</TableHead>
                      <TableHead className="text-right">ITC Utilized</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itcLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.period}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(entry.openingBalance || 0))}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          <div className="flex items-center justify-end gap-1">
                            <ArrowUpRight className="h-4 w-4" />
                            {formatCurrency(Number(entry.itcFromPurchases || 0))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          <div className="flex items-center justify-end gap-1">
                            <ArrowDownRight className="h-4 w-4" />
                            {formatCurrency(Number(entry.itcUtilized || 0))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(entry.closingBalance || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
