import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Filter,
  RefreshCw,
  FileX,
  Calculator,
  Send,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getDaysUntilDue } from "@/lib/utils";
import type { FilingReturn } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BusinessRequired } from "@/components/business-required";
import { useAuth } from "@/lib/auth";

function ReturnStatusBadge({ status, dueDate }: { status: string; dueDate: string }) {
  const daysLeft = getDaysUntilDue(dueDate);
  const isUrgent = daysLeft <= 5 && daysLeft >= 0 && status === "pending";
  const isOverdue = daysLeft < 0 && status === "pending";

  if (status === "filed") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Filed
      </Badge>
    );
  }

  if (isOverdue) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }

  if (isUrgent) {
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1">
        <Clock className="h-3 w-3" />
        Due Soon ({daysLeft}d)
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

interface LateFeeResult {
  daysLate: number;
  lateFee: number;
  interest: number;
  totalPenalty: number;
}

function LateFeeDialog({ returnType, dueDate, taxAmount }: { returnType: string; dueDate: string; taxAmount: number }) {
  const { data: lateFee, isLoading } = useQuery<LateFeeResult>({
    queryKey: ["/api/late-fee", returnType, dueDate, taxAmount],
    queryFn: async () => {
      const res = await fetch(`/api/late-fee/${returnType}/${dueDate}?taxAmount=${taxAmount}`);
      return res.json();
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Calculator className="h-3 w-3" />
          Calculate Penalty
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Late Fee & Interest Calculator</DialogTitle>
          <DialogDescription>
            Penalty calculation for {returnType} due on {formatDate(dueDate)}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : lateFee ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Days Late</p>
                  <p className="text-2xl font-bold text-red-600">{lateFee.daysLate}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Late Fee</p>
                  <p className="text-2xl font-bold">{formatCurrency(lateFee.lateFee)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Interest (18% p.a.)</p>
                  <p className="text-2xl font-bold">{formatCurrency(lateFee.interest)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Penalty</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(lateFee.totalPenalty)}</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              Late fee: Rs 50/day (GSTR-1/3B), Rs 200/day (GSTR-9). Max cap applies.
              Interest calculated at 18% p.a. on outstanding tax.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FilingCard({ 
  returnType, 
  description, 
  dueDay, 
  frequency,
  filingId,
  onAutoPopulate,
  onFileNil,
  onCreateReturn,
  isPending
}: { 
  returnType: string; 
  description: string; 
  dueDay: string;
  frequency: string;
  filingId?: string;
  onAutoPopulate?: () => void;
  onFileNil?: () => void;
  onCreateReturn?: () => void;
  isPending?: boolean;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{returnType}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {frequency}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {dueDay}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {onAutoPopulate && (
              <Button 
                variant="default" 
                size="sm" 
                className="gap-1" 
                onClick={onAutoPopulate}
                disabled={isPending}
                data-testid={`button-auto-populate-${returnType}`}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Auto-Populate
              </Button>
            )}
            {onFileNil && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1" 
                onClick={onFileNil}
                disabled={isPending}
                data-testid={`button-file-nil-${returnType}`}
              >
                <FileX className="h-3 w-3" />
                File Nil Return
              </Button>
            )}
            {onCreateReturn && (
              <Button 
                variant="default" 
                size="sm" 
                className="gap-1" 
                onClick={onCreateReturn}
                disabled={isPending}
                data-testid={`button-create-return-${returnType}`}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
                Start Filing
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Filing() {
  const [yearFilter, setYearFilter] = useState("2024-25");
  const { toast } = useToast();
  const { currentBusinessId } = useAuth();
  
  const { data: filingReturns, isLoading } = useQuery<FilingReturn[]>({
    queryKey: ["/api/filing-returns"],
  });

  const autoPopulateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/filing-returns/${id}/auto-populate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filing-returns"] });
      toast({ title: "Success", description: "Return auto-populated from invoices" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to auto-populate return", variant: "destructive" });
    }
  });

  const fileNilMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/filing-returns/${id}/file-nil`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filing-returns"] });
      toast({ title: "Success", description: "Nil return filed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to file nil return", variant: "destructive" });
    }
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/send-reminders");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Reminders Sent", 
        description: `Sent ${data.returns?.length || 0} reminder(s) via email` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send reminders", variant: "destructive" });
    }
  });

  const createReturnMutation = useMutation({
    mutationFn: async (returnType: string) => {
      if (!currentBusinessId) {
        throw new Error("No business selected");
      }
      
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const period = `${month}${year}`;
      
      let dueDate = new Date();
      if (returnType === "GSTR-1") {
        dueDate = new Date(year, now.getMonth() + 1, 11);
      } else if (returnType === "GSTR-3B") {
        dueDate = new Date(year, now.getMonth() + 1, 20);
      } else if (returnType === "GSTR-4") {
        dueDate = new Date(year + 1, 3, 30);
      } else if (returnType === "GSTR-9") {
        dueDate = new Date(year + 1, 11, 31);
      } else if (returnType === "CMP-08") {
        const quarterEnd = Math.floor(now.getMonth() / 3) * 3 + 2;
        dueDate = new Date(year, quarterEnd + 1, 18);
      }

      const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
      
      const res = await apiRequest("POST", "/api/filing-returns", {
        businessId: currentBusinessId,
        returnType,
        period,
        dueDate: dueDateStr,
        status: "pending"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/filing-returns"] });
      toast({ 
        title: "Return Created", 
        description: `${data.returnType} return created. Use Auto-Populate to fill from invoices.` 
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to create return";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  });

  const pendingReturns = filingReturns?.filter((r) => r.status !== "filed") || [];
  const filedReturns = filingReturns?.filter((r) => r.status === "filed") || [];

  const returnTypes = [
    {
      type: "GSTR-1",
      description: "Details of outward supplies of goods or services",
      dueDay: "11th of next month",
      frequency: "Monthly/Quarterly",
    },
    {
      type: "GSTR-3B",
      description: "Summary return for tax payment",
      dueDay: "20th of next month",
      frequency: "Monthly",
    },
    {
      type: "GSTR-4",
      description: "Annual return for composition scheme taxpayers",
      dueDay: "30th April",
      frequency: "Yearly",
    },
    {
      type: "GSTR-9",
      description: "Annual return for regular taxpayers",
      dueDay: "31st December",
      frequency: "Yearly",
    },
    {
      type: "CMP-08",
      description: "Statement for composition taxpayers",
      dueDay: "18th of next month after quarter",
      frequency: "Quarterly",
    },
  ];

  const getFilingForType = (type: string) => {
    return pendingReturns.find(r => r.returnType === type);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <BusinessRequired>
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-filing-title">
            GST Filing Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your GST return filings
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => sendRemindersMutation.mutate()}
            disabled={sendRemindersMutation.isPending}
            data-testid="button-send-reminders"
          >
            {sendRemindersMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Reminders
          </Button>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-year-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-25">FY 2024-25</SelectItem>
              <SelectItem value="2023-24">FY 2023-24</SelectItem>
              <SelectItem value="2022-23">FY 2022-23</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filedReturns.length}</p>
                <p className="text-sm text-muted-foreground">Filed</p>
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
                <p className="text-2xl font-bold">{pendingReturns.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingReturns.filter((r) => getDaysUntilDue(r.dueDate) < 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingReturns.filter((r) => {
                    const days = getDaysUntilDue(r.dueDate);
                    return days >= 0 && days <= 7;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="returns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="returns" data-testid="tab-return-types">Return Types</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-filing-history">Filing History</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {returnTypes.map((rt) => {
              const filing = getFilingForType(rt.type);
              return (
                <FilingCard
                  key={rt.type}
                  returnType={rt.type}
                  description={rt.description}
                  dueDay={rt.dueDay}
                  frequency={rt.frequency}
                  filingId={filing?.id}
                  onAutoPopulate={filing ? () => autoPopulateMutation.mutate(filing.id) : undefined}
                  onFileNil={filing ? () => fileNilMutation.mutate(filing.id) : undefined}
                  onCreateReturn={!filing ? () => createReturnMutation.mutate(rt.type) : undefined}
                  isPending={autoPopulateMutation.isPending || fileNilMutation.isPending || createReturnMutation.isPending}
                />
              );
            })}
          </div>

          <Card className="mt-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="flex items-start gap-4 py-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-800 dark:text-blue-300">
                  About GST Filing
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Use Auto-Populate to calculate tax liability from your invoices automatically.
                  File Nil Return if you had no transactions for the period. Direct GST portal 
                  filing requires GSTN approval - we can generate JSON files for manual upload.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filing History</CardTitle>
              <CardDescription>Track all your GST return filings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filingReturns && filingReturns.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Tax Liability</TableHead>
                        <TableHead>ITC Claimed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Filed Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filingReturns.map((filing) => {
                        const isOverdue = getDaysUntilDue(filing.dueDate) < 0 && filing.status === "pending";
                        return (
                          <TableRow key={filing.id} data-testid={`row-filing-${filing.id}`}>
                            <TableCell className="font-medium">{filing.returnType}</TableCell>
                            <TableCell>{filing.period}</TableCell>
                            <TableCell>{formatDate(filing.dueDate)}</TableCell>
                            <TableCell>
                              {filing.taxLiability 
                                ? formatCurrency(parseFloat(filing.taxLiability)) 
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {filing.itcClaimed 
                                ? formatCurrency(parseFloat(filing.itcClaimed)) 
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <ReturnStatusBadge status={filing.status} dueDate={filing.dueDate} />
                            </TableCell>
                            <TableCell>
                              {filing.filedDate ? formatDate(filing.filedDate) : "-"}
                            </TableCell>
                            <TableCell>
                              {isOverdue && (
                                <LateFeeDialog 
                                  returnType={filing.returnType}
                                  dueDate={filing.dueDate}
                                  taxAmount={parseFloat(filing.taxLiability || "0")}
                                />
                              )}
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
                    <FileCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No filing history yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Your GST filing history will appear here once you start filing returns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </BusinessRequired>
  );
}
