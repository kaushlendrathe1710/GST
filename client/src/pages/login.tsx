import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight, Loader2, Shield, Phone } from "lucide-react";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const phoneSchema = z.object({
  phone: z.string().min(10, "Please enter a valid 10-digit mobile number").max(10, "Phone number should be 10 digits"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { requestOtp, requestMobileOtp, verifyOtp, verifyMobileOtp, isLoading } = useAuth();
  const [step, setStep] = useState<"input" | "otp">("input");
  const [loginMethod, setLoginMethod] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const handleEmailSubmit = async (data: z.infer<typeof emailSchema>) => {
    setIsSubmitting(true);
    try {
      await requestOtp(data.email);
      setEmail(data.email);
      setLoginMethod("email");
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Check your email for the login code.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (data: z.infer<typeof phoneSchema>) => {
    setIsSubmitting(true);
    try {
      await requestMobileOtp(data.phone);
      setPhone(data.phone);
      setLoginMethod("mobile");
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Check your mobile for the login code.",
      });
    } catch (error: any) {
      const errorMessage = error?.message?.includes("No account found")
        ? "No account found with this mobile number. Please login with email first."
        : "Failed to send OTP. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (data: z.infer<typeof otpSchema>) => {
    setIsSubmitting(true);
    try {
      let result;
      if (loginMethod === "email") {
        result = await verifyOtp(email, data.otp);
      } else {
        result = await verifyMobileOtp(phone, data.otp);
      }
      
      if (!result.isRegistered) {
        toast({
          title: "Almost there!",
          description: "Please complete your profile to continue.",
        });
        navigate("/register");
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Invalid OTP",
        description: "The code you entered is invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    try {
      if (loginMethod === "email") {
        await requestOtp(email);
      } else {
        await requestMobileOtp(phone);
      }
      toast({
        title: "OTP Resent",
        description: `A new code has been sent to your ${loginMethod === "email" ? "email" : "mobile"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToInput = () => {
    setStep("input");
    otpForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Tax Buddy</CardTitle>
          <CardDescription>
            {step === "input"
              ? "Login with your email or mobile number"
              : `Enter the 6-digit code sent to ${loginMethod === "email" ? email : phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "input" ? (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" data-testid="tab-email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="mobile" data-testid="tab-mobile">
                  <Phone className="h-4 w-4 mr-2" />
                  Mobile
                </TabsTrigger>
              </TabsList>
              <TabsContent value="email">
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10"
                                data-testid="input-email"
                                autoComplete="email"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      data-testid="button-send-email-otp"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Continue with Email
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="mobile">
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                              <Input
                                type="tel"
                                placeholder="9876543210"
                                className="pl-12"
                                data-testid="input-phone"
                                autoComplete="tel"
                                maxLength={10}
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  field.onChange(value);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Mobile login works only for registered accounts. New users should login with email first.
                          </p>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      data-testid="button-send-mobile-otp"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Continue with Mobile
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6" autoComplete="off" data-form-type="other">
                <input type="hidden" name="prevent_autofill" value="" autoComplete="off" />
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                          data-testid="input-otp"
                          autoComplete="off"
                          name={`otp_${Date.now()}`}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || otpForm.watch("otp").length !== 6}
                    data-testid="button-verify-otp"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Verify and Login
                  </Button>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetToInput}
                      data-testid="button-change-method"
                    >
                      Change {loginMethod === "email" ? "email" : "number"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOtp}
                      disabled={isSubmitting}
                      data-testid="button-resend-otp"
                    >
                      Resend code
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
