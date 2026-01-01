import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users,
  Building2,
  FileText,
  IndianRupee,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "user" | "admin" | "super_admin";
  isRegistered: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Business {
  id: string;
  name: string;
  gstin: string;
  ownerEmail?: string;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalBusinesses: number;
  totalInvoices: number;
  totalRevenue: number;
  recentUsers: User[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
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
      </CardContent>
    </Card>
  );
}

function getRoleBadge(role: string) {
  switch (role) {
    case "super_admin":
      return (
        <Badge variant="default" className="bg-purple-600 dark:bg-purple-700">
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    case "admin":
      return (
        <Badge variant="default" className="bg-blue-600 dark:bg-blue-700">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          User
        </Badge>
      );
  }
}

export default function Admin() {
  const { toast } = useToast();
  const { user: currentUser, isSuperAdmin, isAdmin } = useAuth();
  const [location] = useLocation();
  
  // Determine current view based on route
  const getCurrentView = () => {
    if (location.includes("/admin/users")) return "users";
    if (location.includes("/admin/businesses")) return "businesses";
    return "overview";
  };
  const currentView = getCurrentView();

  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: businesses, isLoading: businessesLoading } = useQuery<Business[]>({
    queryKey: ["/api/admin/businesses"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User role updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
              Contact an administrator if you need access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get page title based on current view
  const getPageTitle = () => {
    switch (currentView) {
      case "users": return "User Management";
      case "businesses": return "All Businesses";
      default: return "Admin Overview";
    }
  };

  const getPageDescription = () => {
    switch (currentView) {
      case "users": return "View and manage all users on the platform";
      case "businesses": return "View all registered businesses on the platform";
      default: return "System overview and statistics";
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{getPageTitle()}</h1>
            <p className="text-muted-foreground">
              {getPageDescription()}
            </p>
          </div>
          {getRoleBadge(currentUser?.role || "user")}
        </div>

        {/* Overview Content */}
        {currentView === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statsLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Users"
                    value={stats?.totalUsers?.toString() || "0"}
                    icon={Users}
                    description="Registered users on the platform"
                  />
                  <StatCard
                    title="Total Businesses"
                    value={stats?.totalBusinesses?.toString() || "0"}
                    icon={Building2}
                    description="Active business profiles"
                  />
                  <StatCard
                    title="Total Invoices"
                    value={stats?.totalInvoices?.toString() || "0"}
                    icon={FileText}
                    description="Invoices created platform-wide"
                  />
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats?.totalRevenue || 0)}
                    icon={IndianRupee}
                    description="Combined invoice value"
                  />
                </>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Latest registered users on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.recentUsers?.slice(0, 5).map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.name || "-"}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                      {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No users yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Content */}
        {currentView === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and roles</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role !== "super_admin" && (
                              <>
                                <Select
                                  value={user.role}
                                  onValueChange={(role) =>
                                    updateRoleMutation.mutate({ userId: user.id, role })
                                  }
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <SelectTrigger className="w-24" data-testid={`select-role-${user.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive"
                                      data-testid={`button-delete-${user.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {user.email}? This action
                                        cannot be undone and will remove all their data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(user.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            {user.role === "super_admin" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Protected
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!users || users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Businesses Content */}
        {currentView === "businesses" && (
          <Card>
            <CardHeader>
              <CardTitle>Registered Businesses</CardTitle>
              <CardDescription>All business profiles on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {businessesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses?.map((business) => (
                      <TableRow key={business.id} data-testid={`row-business-${business.id}`}>
                        <TableCell className="font-medium">{business.name}</TableCell>
                        <TableCell>{business.gstin}</TableCell>
                        <TableCell>{business.ownerEmail || "-"}</TableCell>
                        <TableCell>{formatDate(business.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {(!businesses || businesses.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No businesses found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
