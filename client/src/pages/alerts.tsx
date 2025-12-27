import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import type { Alert } from "@shared/schema";

export default function Alerts() {
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/alerts/${id}`, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/alerts/mark-all-read", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "All alerts marked as read" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const unreadAlerts = alerts?.filter((a) => !a.isRead) || [];
  const readAlerts = alerts?.filter((a) => a.isRead) || [];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "due_date":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "overdue":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "mismatch":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "payment_reminder":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      due_date: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
      overdue: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
      mismatch: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
      payment_reminder: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    };
    const labels: Record<string, string> = {
      due_date: "Due Date",
      overdue: "Overdue",
      mismatch: "ITC Mismatch",
      payment_reminder: "Payment",
    };
    return (
      <Badge variant="secondary" className={styles[type] || ""}>
        {labels[type] || type}
      </Badge>
    );
  };

  const renderAlert = (alert: Alert, showActions = true) => (
    <div
      key={alert.id}
      className={`p-4 rounded-lg border ${
        alert.isRead ? "bg-background" : "bg-muted/50"
      }`}
      data-testid={`alert-${alert.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">{getAlertIcon(alert.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{alert.title}</h4>
            {getTypeBadge(alert.type)}
            {!alert.isRead && (
              <Badge variant="default" className="ml-auto">New</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{formatDate(alert.createdAt?.toString() || "")}</span>
            {alert.isSent && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email sent
              </span>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-1 shrink-0">
            {!alert.isRead && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => markReadMutation.mutate(alert.id)}
                data-testid={`button-mark-read-${alert.id}`}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(alert.id)}
              data-testid={`button-delete-alert-${alert.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-alerts-title">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on compliance deadlines and important alerts
          </p>
        </div>
        {unreadAlerts.length > 0 && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-unread-count">
                  {unreadAlerts.length}
                </p>
                <p className="text-sm text-muted-foreground">Unread Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-due-soon">
                  {alerts?.filter((a) => a.type === "due_date" && !a.isRead).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-overdue">
                  {alerts?.filter((a) => a.type === "overdue" && !a.isRead).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll receive alerts for upcoming deadlines and important updates
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unreadAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  New Notifications
                  <Badge variant="default">{unreadAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unreadAlerts.map((alert) => renderAlert(alert))}
              </CardContent>
            </Card>
          )}

          {readAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">
                  Earlier Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {readAlerts.slice(0, 10).map((alert) => renderAlert(alert))}
                {readAlerts.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-4">
                    Showing 10 of {readAlerts.length} earlier notifications
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
