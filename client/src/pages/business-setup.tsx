import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { indianStates } from "@shared/schema";

const businessSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  businessType: z.string().min(1, "Business type is required"),
  gstScheme: z.string().min(1, "GST scheme is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1),
  pincode: z.string().regex(/^[0-9]{6}$/, "Invalid pincode"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

type BusinessFormValues = z.infer<typeof businessSchema>;

export default function BusinessSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { businesses } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      gstin: "",
      businessType: "",
      gstScheme: "regular",
      address: "",
      city: "",
      state: "",
      stateCode: "",
      pincode: "",
      email: "",
      phone: "",
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: BusinessFormValues) => {
      const response = await apiRequest("POST", "/api/business", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({
        title: "Business Created",
        description: "Your business profile has been set up successfully.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create business. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGstinChange = (gstin: string) => {
    form.setValue("gstin", gstin.toUpperCase());
    if (gstin.length >= 2) {
      const stateCode = gstin.substring(0, 2);
      const state = indianStates.find((s) => s.code === stateCode);
      if (state) {
        form.setValue("stateCode", stateCode);
        form.setValue("state", state.name);
      }
    }
    if (gstin.length >= 12) {
      const pan = gstin.substring(2, 12);
      form.setValue("pan" as any, pan);
    }
  };

  const handleStateChange = (stateCode: string) => {
    const state = indianStates.find((s) => s.code === stateCode);
    if (state) {
      form.setValue("stateCode", stateCode);
      form.setValue("state", state.name);
    }
  };

  const onSubmit = (data: BusinessFormValues) => {
    createBusinessMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
          <CardDescription>
            {businesses.length === 0
              ? "Add your first business to get started with Tax Buddy"
              : "Add another business profile"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>GSTIN</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="27AADCS0472N1Z1"
                          {...field}
                          onChange={(e) => handleGstinChange(e.target.value)}
                          data-testid="input-gstin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your Business Pvt Ltd"
                          {...field}
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="proprietor">Proprietor</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="llp">LLP</SelectItem>
                          <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstScheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Scheme</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gst-scheme">
                            <SelectValue placeholder="Select scheme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="composition">Composition</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Business Park, Sector 5"
                          {...field}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mumbai"
                          {...field}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select
                        onValueChange={handleStateChange}
                        value={form.watch("stateCode")}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {indianStates.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="400001"
                          maxLength={6}
                          {...field}
                          data-testid="input-pincode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+91 98765 43210"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createBusinessMutation.isPending}
                data-testid="button-create-business"
              >
                {createBusinessMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Business Profile
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
