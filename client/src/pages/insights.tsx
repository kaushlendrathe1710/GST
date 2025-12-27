import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  IndianRupee,
  FileText,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { GstInsight, TaxLiability } from "@shared/schema";
import { useState } from "react";

interface ComplianceScore {
  score: number;
  rating: string;
  overdueCount: number;
  lateCount: number;
  onTimeCount: number;
  suggestions: string[];
}

interface MonthlyReport {
  period: string;
  businessName: string;
  gstin: string;
  summary: {
    invoiceCount: number;
    purchaseCount: number;
    totalSales: number;
    totalPurchases: number;
    grossProfit: number;
  };
  taxSummary: {
    outputCgst: number;
    outputSgst: number;
    outputIgst: number;
    inputCgst: number;
    inputSgst: number;
    inputIgst: number;
    netPayable: number;
    itcAvailable: number;
  };
  generatedAt: string;
}

function InsightCard({ insight }: { insight: GstInsight }) {
  const getIcon = () => {
    switch (insight.type) {
      case 'tax_saving':
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      case 'itc_optimization':
        return <IndianRupee className="h-5 w-5 text-green-600" />;
      case 'compliance':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'growth':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      default:
        return <Brain className="h-5 w-5 text-purple-600" />;
    }
  };

  const getPriorityColor = () => {
    switch (insight.priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-medium">{insight.title}</h3>
              <Badge variant="outline" className={getPriorityColor()}>
                {insight.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
            {insight.potentialSaving && (
              <div className="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <IndianRupee className="h-3 w-3" />
                Potential saving: {formatCurrency(insight.potentialSaving)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceScoreCard({ score }: { score: ComplianceScore }) {
  const getScoreColor = () => {
    if (score.score >= 90) return 'text-green-600';
    if (score.score >= 70) return 'text-yellow-600';
    if (score.score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (score.score >= 90) return 'bg-green-600';
    if (score.score >= 70) return 'bg-yellow-600';
    if (score.score >= 50) return 'bg-orange-600';
    return 'bg-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Compliance Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className={`text-5xl font-bold ${getScoreColor()}`}>{score.score}</p>
            <p className="text-sm text-muted-foreground">{score.rating}</p>
          </div>
          <div className="flex-1 space-y-3">
            <Progress value={score.score} className={getProgressColor()} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-lg font-semibold text-green-600">{score.onTimeCount}</p>
                <p className="text-xs text-muted-foreground">On-time</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-lg font-semibold text-yellow-600">{score.lateCount}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-lg font-semibold text-red-600">{score.overdueCount}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>
        {score.suggestions.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-1">Suggestions:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {score.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyReportCard({ report, isLoading }: { report: MonthlyReport | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Monthly GST Summary</CardTitle>
            <CardDescription>Period: {report.period} | GSTIN: {report.gstin}</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Business Summary</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-semibold">{formatCurrency(report.summary.totalSales)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-xl font-semibold">{formatCurrency(report.summary.totalPurchases)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-xl font-semibold">{report.summary.invoiceCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(report.summary.grossProfit)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Tax Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Output CGST</span>
                <span className="font-medium">{formatCurrency(report.taxSummary.outputCgst)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Output SGST</span>
                <span className="font-medium">{formatCurrency(report.taxSummary.outputSgst)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Output IGST</span>
                <span className="font-medium">{formatCurrency(report.taxSummary.outputIgst)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-green-600">ITC Available</span>
                <span className="font-medium text-green-600">
                  -{formatCurrency(report.taxSummary.itcAvailable)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 bg-primary/10 rounded-lg px-2 mt-2">
                <span className="font-medium">Net GST Payable</span>
                <span className="font-bold text-lg">{formatCurrency(report.taxSummary.netPayable)}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Generated on: {formatDate(report.generatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Insights() {
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${month}${year}`;
  });

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<GstInsight[]>({
    queryKey: ["/api/insights"],
  });

  const { data: complianceScore, isLoading: scoreLoading } = useQuery<ComplianceScore>({
    queryKey: ["/api/compliance-score"],
  });

  const { data: monthlyReport, isLoading: reportLoading } = useQuery<MonthlyReport>({
    queryKey: ["/api/reports/monthly", selectedPeriod],
  });

  const { data: taxLiability } = useQuery<TaxLiability>({
    queryKey: ["/api/tax-liability", selectedPeriod],
  });

  const periods = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    periods.push({
      value: `${month}${year}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    });
  }

  if (insightsLoading && scoreLoading) {
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

  const highPriorityInsights = insights?.filter(i => i.priority === 'high') || [];
  const otherInsights = insights?.filter(i => i.priority !== 'high') || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-insights-title">
            GST Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart insights, compliance tracking, and tax optimization
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => refetchInsights()}
            data-testid="button-refresh-insights"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {taxLiability ? formatCurrency(taxLiability.outputCgst + taxLiability.outputSgst + taxLiability.outputIgst) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Output Tax</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {taxLiability ? formatCurrency(taxLiability.itcAvailable) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">ITC Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {taxLiability ? formatCurrency(taxLiability.totalPayable) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Net Payable</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{insights?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Active Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {complianceScore && <ComplianceScoreCard score={complianceScore} />}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Action Required
            </CardTitle>
            <CardDescription>High priority items that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {highPriorityInsights.length > 0 ? (
              <div className="space-y-3">
                {highPriorityInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">No urgent actions required</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MonthlyReportCard report={monthlyReport || null} isLoading={reportLoading} />

      {otherInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommendations & Insights
            </CardTitle>
            <CardDescription>Tips to optimize your GST compliance and tax efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {otherInsights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
