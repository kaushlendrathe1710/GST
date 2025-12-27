import { useQuery } from "@tanstack/react-query";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Filter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getDaysUntilDue, getStatusColor } from "@/lib/utils";
import type { FilingReturn } from "@shared/schema";
import { useState } from "react";

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

function FilingCard({ 
  returnType, 
  description, 
  dueDay, 
  frequency 
}: { 
  returnType: string; 
  description: string; 
  dueDay: string;
  frequency: string;
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
          <Button variant="outline" size="sm" className="gap-1 shrink-0">
            File Now
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Filing() {
  const [yearFilter, setYearFilter] = useState("2024-25");
  
  const { data: filingReturns, isLoading } = useQuery<FilingReturn[]>({
    queryKey: ["/api/filing-returns"],
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
            {returnTypes.map((rt) => (
              <FilingCard
                key={rt.type}
                returnType={rt.type}
                description={rt.description}
                dueDay={rt.dueDay}
                frequency={rt.frequency}
              />
            ))}
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
                  Direct GST portal filing requires GSTN approval. Currently, you can generate 
                  JSON files for manual upload or use assisted filing through a CA. We're working 
                  on integrating direct filing capabilities.
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
                        <TableHead>Status</TableHead>
                        <TableHead>Filed Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filingReturns.map((filing) => (
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
                            <ReturnStatusBadge status={filing.status} dueDate={filing.dueDate} />
                          </TableCell>
                          <TableCell>
                            {filing.filedDate ? formatDate(filing.filedDate) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
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
  );
}
