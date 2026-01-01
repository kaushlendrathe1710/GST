import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import InvoiceCreate from "@/pages/invoice-create";
import Customers from "@/pages/customers";
import Purchases from "@/pages/purchases";
import PurchaseCreate from "@/pages/purchase-create";
import Vendors from "@/pages/vendors";
import ITC from "@/pages/itc";
import Filing from "@/pages/filing";
import Payments from "@/pages/payments";
import Alerts from "@/pages/alerts";
import Settings from "@/pages/settings";
import Insights from "@/pages/insights";
import Notices from "@/pages/notices";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Register from "@/pages/register";
import BusinessSetup from "@/pages/business-setup";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!user.isRegistered && location !== "/register") {
    return <Redirect to="/register" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/business-setup">
        {() => <ProtectedRoute component={BusinessSetup} />}
      </Route>
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={Invoices} />}
      </Route>
      <Route path="/invoices/new">
        {() => <ProtectedRoute component={InvoiceCreate} />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={Customers} />}
      </Route>
      <Route path="/purchases">
        {() => <ProtectedRoute component={Purchases} />}
      </Route>
      <Route path="/purchases/new">
        {() => <ProtectedRoute component={PurchaseCreate} />}
      </Route>
      <Route path="/vendors">
        {() => <ProtectedRoute component={Vendors} />}
      </Route>
      <Route path="/itc">
        {() => <ProtectedRoute component={ITC} />}
      </Route>
      <Route path="/filing">
        {() => <ProtectedRoute component={Filing} />}
      </Route>
      <Route path="/payments">
        {() => <ProtectedRoute component={Payments} />}
      </Route>
      <Route path="/alerts">
        {() => <ProtectedRoute component={Alerts} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/insights">
        {() => <ProtectedRoute component={Insights} />}
      </Route>
      <Route path="/notices">
        {() => <ProtectedRoute component={Notices} />}
      </Route>
      <Route path="/admin">
        {() => <Redirect to="/admin/overview" />}
      </Route>
      <Route path="/admin/overview">
        {() => <ProtectedRoute component={Admin} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={Admin} />}
      </Route>
      <Route path="/admin/businesses">
        {() => <ProtectedRoute component={Admin} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { user, currentBusinessId } = useAuth();
  const [location] = useLocation();

  const isAuthPage = location === "/login" || location === "/register";

  if (isAuthPage) {
    return <Router />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b border-border bg-background shrink-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
