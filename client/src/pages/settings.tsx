import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Building2,
  Save,
  MapPin,
  Phone,
  Mail,
  FileText,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { validateGSTIN } from "@/lib/utils";
import type { Business } from "@shared/schema";
import { indianStates } from "@shared/schema";

const businessFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  gstin: z.string().refine(validateGSTIN, {
    message: "Invalid GSTIN format",
  }),
  pan: z.string().optional(),
  businessType: z.string().min(1, "Business type is required"),
  gstScheme: z.string().min(1, "GST scheme is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  stateCode: z.string().min(1, "State is required"),
  pincode: z.string().min(6, "Valid pincode is required").max(6),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

export default function Settings() {
  const { toast } = useToast();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/business"],
  });

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: business?.name || "",
      gstin: business?.gstin || "",
      pan: business?.pan || "",
      businessType: business?.businessType || "proprietor",
      gstScheme: business?.gstScheme || "regular",
      address: business?.address || "",
      city: business?.city || "",
      state: business?.state || "",
      stateCode: business?.stateCode || "",
      pincode: business?.pincode || "",
      email: business?.email || "",
      phone: business?.phone || "",
    },
    values: business ? {
      name: business.name,
      gstin: business.gstin,
      pan: business.pan || "",
      businessType: business.businessType,
      gstScheme: business.gstScheme,
      address: business.address,
      city: business.city,
      state: business.state,
      stateCode: business.stateCode,
      pincode: business.pincode,
      email: business.email || "",
      phone: business.phone || "",
    } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BusinessFormValues) => {
      if (business?.id) {
        return apiRequest("PATCH", `/api/business/${business.id}`, data);
      }
      return apiRequest("POST", "/api/business", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      toast({
        title: "Settings Saved",
        description: "Your business details have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BusinessFormValues) => {
    saveMutation.mutate(data);
  };

  const handleStateChange = (stateCode: string) => {
    const state = indianStates.find((s) => s.code === stateCode);
    if (state) {
      form.setValue("state", state.name);
      form.setValue("stateCode", state.code);
    }
  };

  const handleGSTINChange = (gstin: string) => {
    const upperGSTIN = gstin.toUpperCase();
    form.setValue("gstin", upperGSTIN);
    
    if (upperGSTIN.length >= 2) {
      const stateCode = upperGSTIN.substring(0, 2);
      const state = indianStates.find((s) => s.code === stateCode);
      if (state) {
        form.setValue("state", state.name);
        form.setValue("stateCode", state.code);
      }
    }
    
    if (upperGSTIN.length >= 12) {
      const pan = upperGSTIN.substring(2, 12);
      form.setValue("pan", pan);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your business profile and preferences
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business" className="gap-2" data-testid="tab-business">
            <Building2 className="h-4 w-4" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2" data-testid="tab-invoice">
            <FileText className="h-4 w-4" />
            Invoice Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    GST Registration Details
                  </CardTitle>
                  <CardDescription>
                    Enter your GSTIN to auto-populate business details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GSTIN</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="22AAAAA0000A1Z5"
                              className="font-mono uppercase"
                              {...field}
                              onChange={(e) => handleGSTINChange(e.target.value)}
                              data-testid="input-gstin"
                            />
                          </FormControl>
                          <FormDescription>
                            15-character GST Identification Number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="AAAAA0000A"
                              className="font-mono uppercase"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              data-testid="input-pan"
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-extracted from GSTIN
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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
                              <SelectItem value="proprietor">Proprietorship</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="llp">LLP</SelectItem>
                              <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                              <SelectItem value="public_ltd">Public Limited</SelectItem>
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Business Name" {...field} data-testid="input-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Complete business address"
                            className="min-h-[80px]"
                            {...field}
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stateCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleStateChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.code} - {state.name}
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
                            <Input placeholder="000000" maxLength={6} {...field} data-testid="input-pincode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 00000 00000" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="business@example.com" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" className="gap-2" disabled={saveMutation.isPending} data-testid="button-save-settings">
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Customization</CardTitle>
              <CardDescription>
                Customize how your invoices look and behave
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Invoice Number Format</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your invoices will be numbered as: INV/YYMM/0001
                  </p>
                  <Input 
                    placeholder="INV" 
                    className="max-w-xs"
                    defaultValue="INV"
                    data-testid="input-invoice-prefix"
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Default Terms & Conditions</h4>
                  <Textarea
                    placeholder="Enter default terms and conditions for your invoices"
                    className="min-h-[120px]"
                    defaultValue="1. Payment due within 30 days from invoice date.
2. Interest at 18% per annum will be charged on delayed payments.
3. Goods once sold will not be taken back."
                    data-testid="textarea-default-terms"
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Default Notes</h4>
                  <Textarea
                    placeholder="Enter default notes for your invoices"
                    className="min-h-[80px]"
                    defaultValue="Thank you for your business!"
                    data-testid="textarea-default-notes"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="gap-2" data-testid="button-save-invoice-settings">
                  <Save className="h-4 w-4" />
                  Save Invoice Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
