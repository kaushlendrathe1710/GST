import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  Users,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessRequired } from "@/components/business-required";
import { formatCurrency, formatDate, getDaysUntilDue, getStatusColor } from "@/lib/utils";
import type { DashboardStats } from "@shared/schema";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <TrendingUp className={`h-3 w-3 ${!trend.isPositive && 'rotate-180'}`} />
            <span>{trend.value}% from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineCard({ deadline }: { deadline: { returnType: string; period: string; dueDate: string; status: string } }) {
  const daysLeft = getDaysUntilDue(deadline.dueDate);
  const isUrgent = daysLeft <= 5 && daysLeft >= 0;
  const isOverdue = daysLeft < 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : isUrgent ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          <FileCheck className={`h-4 w-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{deadline.returnType}</p>
          <p className="text-xs text-muted-foreground">{deadline.period}</p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant="outline" className={getStatusColor(deadline.status)}>
          {isOverdue ? 'Overdue' : `${daysLeft} days left`}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(deadline.dueDate)}</p>
      </div>
    </div>
  );
}

function RecentInvoiceRow({ invoice }: { invoice: { invoiceNumber: string; invoiceDate: string; totalAmount: string; status: string; customerId: string } }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-sm">{formatCurrency(parseFloat(invoice.totalAmount))}</p>
        <Badge variant="outline" className={getStatusColor(invoice.status)}>
          {invoice.status}
        </Badge>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
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
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your GST compliance overview.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/invoices/new">
            <Button className="gap-2" data-testid="button-create-invoice">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={stats?.totalInvoices?.toString() || "0"}
          icon={FileText}
          description="This financial year"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={IndianRupee}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="GST Payable"
          value={formatCurrency(stats?.gstPayable || 0)}
          icon={TrendingUp}
          description="Current month"
        />
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers?.toString() || "0"}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              <CardDescription>GST return filing due dates</CardDescription>
            </div>
            <Link href="/filing">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-filing">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.upcomingDeadlines && stats.upcomingDeadlines.length > 0 ? (
              stats.upcomingDeadlines.slice(0, 4).map((deadline, index) => (
                <DeadlineCard key={index} deadline={deadline} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No upcoming deadlines</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <CardDescription>Latest invoices created</CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-invoices">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              <div className="divide-y divide-border">
                {stats.recentInvoices.slice(0, 5).map((invoice, index) => (
                  <RecentInvoiceRow key={index} invoice={invoice} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-3">No invoices yet</p>
                <Link href="/invoices/new">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Invoice
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">
              Compliance Reminder
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Remember to file your GSTR-3B before the 20th of each month to avoid late fees. 
              Keep all your invoices updated for accurate return filing.
            </p>
          </div>
          <Link href="/filing">
            <Button variant="outline" size="sm" className="whitespace-nowrap border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300">
              Check Status
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
    </BusinessRequired>
  );
}
