import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  FileCheck,
  Settings,
  Plus,
  Building2,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  Bell,
  LogOut,
  ChevronDown,
  Brain,
  FileWarning,
  ShieldCheck,
  Crown,
  UserCog,
  BarChart3,
  Building,
  ArrowLeftRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

const salesItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
];

const purchaseItems = [
  {
    title: "Purchases",
    url: "/purchases",
    icon: ShoppingCart,
  },
  {
    title: "Vendors",
    url: "/vendors",
    icon: Truck,
  },
];

const complianceItems = [
  {
    title: "ITC Ledger",
    url: "/itc",
    icon: Receipt,
  },
  {
    title: "Filing Returns",
    url: "/filing",
    icon: FileCheck,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCard,
  },
  {
    title: "GST Intelligence",
    url: "/insights",
    icon: Brain,
  },
];

const settingsItems = [
  {
    title: "GST Notices",
    url: "/notices",
    icon: FileWarning,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    title: "Business Setup",
    url: "/business-setup",
    icon: Building2,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

// Admin Panel menu items - shown when in admin mode
const adminOverviewItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: BarChart3,
  },
];

const adminUserItems = [
  {
    title: "User Management",
    url: "/admin?tab=users",
    icon: UserCog,
  },
];

const adminBusinessItems = [
  {
    title: "All Businesses",
    url: "/admin?tab=businesses",
    icon: Building,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, businesses, currentBusinessId, logout, switchBusiness, isAdmin, isSuperAdmin } = useAuth();
  const [adminMode, setAdminMode] = useState(() => {
    // Persist admin mode preference in localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminMode") === "true";
    }
    return false;
  });

  const handleAdminModeToggle = () => {
    const newMode = !adminMode;
    setAdminMode(newMode);
    localStorage.setItem("adminMode", String(newMode));
  };

  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);
  const showAdminToggle = isAdmin || isSuperAdmin;

  const renderMenuItems = (items: typeof salesItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          location === item.url ||
          (item.url !== "/" && location.startsWith(item.url));
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
            >
              <Link href={item.url}>
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          data-testid="link-home-logo"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Tax Buddy</span>
            <span className="text-xs text-muted-foreground">
              Invoice & Filing
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Mode Toggle for Admins */}
        {showAdminToggle && (
          <SidebarGroup>
            <div className="px-4 pb-2">
              <Button
                variant={adminMode ? "default" : "outline"}
                className="w-full gap-2"
                onClick={handleAdminModeToggle}
                data-testid="button-toggle-admin-mode"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {adminMode ? "Switch to User View" : "Switch to Admin Panel"}
              </Button>
            </div>
          </SidebarGroup>
        )}

        {/* Admin Panel View */}
        {adminMode && showAdminToggle ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                {isSuperAdmin ? <Crown className="h-3 w-3 text-purple-500" /> : <ShieldCheck className="h-3 w-3 text-blue-500" />}
                Admin Panel
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminOverviewItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>User Management</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminUserItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Business Management</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(adminBusinessItems)}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            {/* User View */}
            <SidebarGroup>
              <div className="px-4 pb-2">
                <Link href="/invoices/new">
                  <Button
                    className="w-full gap-2"
                    data-testid="button-create-invoice-sidebar"
                  >
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            </SidebarGroup>

            {businesses.length > 1 && (
              <SidebarGroup>
                <div className="px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between gap-2"
                        data-testid="dropdown-business-selector"
                      >
                        <span className="truncate">
                          {currentBusiness?.name || "Select Business"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {businesses.map((business) => (
                        <DropdownMenuItem
                          key={business.id}
                          onClick={() => switchBusiness(business.id)}
                          data-testid={`menu-item-business-${business.id}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{business.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {business.gstin}
                            </span>
                          </div>
                          {business.id === currentBusinessId && (
                            <Badge variant="secondary" className="ml-auto">
                              Active
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/business-setup" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Business
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel>Sales</SidebarGroupLabel>
              <SidebarGroupContent>{renderMenuItems(salesItems)}</SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Purchases</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(purchaseItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Compliance</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(complianceItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(settingsItems)}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                {isSuperAdmin && (
                  <Badge variant="default" className="bg-purple-600 dark:bg-purple-700 text-[10px] px-1.5 py-0">
                    Super Admin
                  </Badge>
                )}
                {isAdmin && !isSuperAdmin && (
                  <Badge variant="default" className="bg-blue-600 dark:bg-blue-700 text-[10px] px-1.5 py-0">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium">
                {currentBusiness?.name || "No business selected"}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
