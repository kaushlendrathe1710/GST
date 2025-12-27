import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

interface User {
  id: string;
  email: string;
  name: string | null;
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
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
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
      await verifyOtpMutation.mutateAsync({ email, otp });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const switchBusiness = async (businessId: string) => {
    await switchBusinessMutation.mutateAsync(businessId);
  };

  return (
    <AuthContext.Provider
      value={{
        user: authData?.user || null,
        businesses: authData?.businesses || [],
        currentBusinessId: authData?.currentBusinessId || null,
        isLoading: isLoading || isLoggingIn,
        requestOtp,
        verifyOtp,
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
