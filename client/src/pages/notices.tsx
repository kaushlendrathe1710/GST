import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileWarning,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/utils";
import type { GstNotice } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const noticeFormSchema = z.object({
  noticeNumber: z.string().min(1, "Notice number is required"),
  noticeType: z.string().min(1, "Notice type is required"),
  noticeDate: z.string().min(1, "Issue date is required"),
  responseDate: z.string().min(1, "Due date is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  demandAmount: z.string().optional(),
  notes: z.string().optional(),
});

type NoticeFormValues = z.infer<typeof noticeFormSchema>;

function NoticeDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeFormSchema),
    defaultValues: {
      noticeType: "ASMT-10",
      noticeNumber: "",
      subject: "",
      description: "",
      noticeDate: "",
      responseDate: "",
      demandAmount: "",
      notes: "",
    },
  });

  const createNoticeMutation = useMutation({
    mutationFn: async (data: NoticeFormValues) => {
      const res = await apiRequest("POST", "/api/gst-notices", {
        ...data,
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-notices"] });
      toast({ title: "Success", description: "GST notice added" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add notice", variant: "destructive" });
    },
  });

  const onSubmit = (data: NoticeFormValues) => {
    createNoticeMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-notice">
          <Plus className="h-4 w-4" />
          Add Notice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add GST Notice</DialogTitle>
          <DialogDescription>
            Track and manage GST notices received from the department
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="noticeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ZA1234567890" data-testid="input-notice-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noticeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notice-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ASMT-10">ASMT-10 (Scrutiny)</SelectItem>
                        <SelectItem value="ASMT-11">ASMT-11 (Reply)</SelectItem>
                        <SelectItem value="ASMT-12">ASMT-12 (Order)</SelectItem>
                        <SelectItem value="DRC-01">DRC-01 (Demand)</SelectItem>
                        <SelectItem value="DRC-03">DRC-03 (Payment)</SelectItem>
                        <SelectItem value="DRC-07">DRC-07 (Summary)</SelectItem>
                        <SelectItem value="REG-17">REG-17 (Show Cause)</SelectItem>
                        <SelectItem value="REG-21">REG-21 (Suspension)</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Notice subject" data-testid="input-notice-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Details of the notice" data-testid="input-notice-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="noticeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-notice-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response Due Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-response-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="demandAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demand Amount (if any)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-demand-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Additional notes" data-testid="input-notes" />
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
              <Button type="submit" disabled={createNoticeMutation.isPending} data-testid="button-submit-notice">
                {createNoticeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Notice
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getStatusBadge(status: string, responseDate: string | null) {
  if (!responseDate) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 gap-1">
        <Clock className="h-3 w-3" />
        No Due Date
      </Badge>
    );
  }

  const now = new Date();
  const due = new Date(responseDate);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === "resolved") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Resolved
      </Badge>
    );
  }

  if (daysLeft < 0) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }

  if (daysLeft <= 7) {
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

export default function Notices() {
  const { data: notices, isLoading } = useQuery<GstNotice[]>({
    queryKey: ["/api/gst-notices"],
  });

  const updateNoticeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/gst-notices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gst-notices"] });
    },
  });

  const pendingNotices = notices?.filter(n => n.status !== "resolved") || [];
  const resolvedNotices = notices?.filter(n => n.status === "resolved") || [];
  const overdueNotices = pendingNotices.filter(n => {
    if (!n.responseDate) return false;
    const daysLeft = Math.ceil((new Date(n.responseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft < 0;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-notices-title">
            GST Notices
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and respond to GST department notices
          </p>
        </div>
        <NoticeDialog />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingNotices.length}</p>
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
                <p className="text-2xl font-bold">{overdueNotices.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedNotices.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notice History</CardTitle>
          <CardDescription>All GST notices and their current status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {notices && notices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notice No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Notice Date</TableHead>
                    <TableHead>Response Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((notice) => (
                    <TableRow key={notice.id} data-testid={`row-notice-${notice.id}`}>
                      <TableCell className="font-medium">{notice.noticeNumber || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{notice.noticeType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{notice.subject}</TableCell>
                      <TableCell>{formatDate(notice.noticeDate)}</TableCell>
                      <TableCell>{notice.responseDate ? formatDate(notice.responseDate) : "-"}</TableCell>
                      <TableCell>{getStatusBadge(notice.status || "pending", notice.responseDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {notice.status !== "resolved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateNoticeMutation.mutate({ id: notice.id, status: "resolved" })}
                              data-testid={`button-resolve-${notice.id}`}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileWarning className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No notices recorded</h3>
              <p className="text-muted-foreground max-w-sm">
                GST notices from the department will appear here for tracking
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
