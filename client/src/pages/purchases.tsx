import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Calendar,
  Truck,
  MoreVertical,
  FileText,
  Trash2,
  Upload,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BusinessRequired } from "@/components/business-required";
import type { Purchase, Vendor } from "@shared/schema";

export default function Purchases() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Purchase deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedPurchase(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase",
        variant: "destructive",
      });
    },
  });

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "matched":
        return <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Matched</Badge>;
      case "mismatched":
        return <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">Mismatch</Badge>;
      case "not_found":
        return <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Not in GSTR-2B</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getCategoryBadge = (category: string | null) => {
    const colors: Record<string, string> = {
      goods: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      services: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      capital_goods: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300",
      expense: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    };
    return (
      <Badge variant="secondary" className={colors[category || "goods"] || colors.goods}>
        {category?.replace("_", " ") || "Goods"}
      </Badge>
    );
  };

  const filteredPurchases = purchases?.filter((purchase) => {
    const matchesSearch =
      purchase.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getVendorName(purchase.vendorId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || purchase.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalGst = filteredPurchases?.reduce((acc, p) => {
    return acc + 
      Number(p.totalCgst || 0) + 
      Number(p.totalSgst || 0) + 
      Number(p.totalIgst || 0);
  }, 0) || 0;

  const totalItc = filteredPurchases?.reduce((acc, p) => {
    return acc + Number(p.itcEligible || 0);
  }, 0) || 0;

  return (
    <BusinessRequired>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-purchases-title">
            Purchase Register
          </h1>
          <p className="text-muted-foreground mt-1">
            Track purchases, GST inputs, and ITC eligibility
          </p>
        </div>
        <Link href="/purchases/new">
          <Button className="gap-2" data-testid="button-add-purchase">
            <Plus className="h-4 w-4" />
            Add Purchase
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-total-purchases">
                  {filteredPurchases?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-total-gst">
                  {formatCurrency(totalGst)}
                </p>
                <p className="text-sm text-muted-foreground">Total GST Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold" data-testid="text-itc-eligible">
                  {formatCurrency(totalItc)}
                </p>
                <p className="text-sm text-muted-foreground">ITC Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <CardTitle className="text-lg">All Purchases</CardTitle>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full md:w-64"
                data-testid="input-search-purchases"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="goods">Goods</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="capital_goods">Capital Goods</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPurchases?.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No purchases found</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first purchase invoice
              </p>
              <Link href="/purchases/new">
                <Button className="gap-2" data-testid="button-add-first-purchase">
                  <Plus className="h-4 w-4" />
                  Add Purchase
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">ITC</TableHead>
                    <TableHead>GSTR-2B</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases?.map((purchase) => (
                    <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                      <TableCell className="font-medium">
                        {purchase.invoiceNumber}
                      </TableCell>
                      <TableCell>{getVendorName(purchase.vendorId)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(purchase.invoiceDate)}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(purchase.category)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(purchase.totalAmount))}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {formatCurrency(Number(purchase.itcEligible || 0))}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.gstr2bStatus)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-purchase-actions-${purchase.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {purchase.documentUrl && (
                              <DropdownMenuItem asChild>
                                <a href={purchase.documentUrl} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Document
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase? This will also affect your ITC calculations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPurchase && deleteMutation.mutate(selectedPurchase.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </BusinessRequired>
  );
}
