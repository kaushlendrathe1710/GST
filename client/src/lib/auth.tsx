import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "user" | "admin" | "super_admin";
  isRegistered: boolean;
}

interface Business {
  id: string;
  name: string;
  gstin: string;
}

interface AuthContextType {
  user: User | null;
  businesses: Business[];
  currentBusinessId: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<{ isNewUser: boolean; isRegistered: boolean }>;
  completeRegistration: (name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBusiness: (businessId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { data: authData, isLoading } = useQuery<{
    user: User | null;
    businesses: Business[];
    currentBusinessId: string | null;
  }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const requestOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/auth/request-otp", { email });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", { email, otp });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", { name, phone });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
    },
  });

  const switchBusinessMutation = useMutation({
    mutationFn: async (businessId: string) => {
      await apiRequest("POST", "/api/auth/switch-business", { businessId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const requestOtp = async (email: string) => {
    await requestOtpMutation.mutateAsync(email);
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoggingIn(true);
    try {
      const result = await verifyOtpMutation.mutateAsync({ email, otp });
      return {
        isNewUser: result.isNewUser,
        isRegistered: result.user?.isRegistered ?? false,
      };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const completeRegistration = async (name: string, phone: string) => {
    await registerMutation.mutateAsync({ name, phone });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const switchBusiness = async (businessId: string) => {
    await switchBusinessMutation.mutateAsync(businessId);
  };

  const user = authData?.user || null;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        businesses: authData?.businesses || [],
        currentBusinessId: authData?.currentBusinessId || null,
        isLoading: isLoading || isLoggingIn,
        isAdmin,
        isSuperAdmin,
        requestOtp,
        verifyOtp,
        completeRegistration,
        logout,
        switchBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
