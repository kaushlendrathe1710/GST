import { Link } from "wouter";
import { Building2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface BusinessRequiredProps {
  children: React.ReactNode;
}

export function BusinessRequired({ children }: BusinessRequiredProps) {
  const { currentBusinessId } = useAuth();

  if (!currentBusinessId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Business Profile Required</CardTitle>
            <CardDescription className="text-base">
              You need to set up your business profile first before accessing this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/business-setup">
              <Button className="w-full gap-2" data-testid="button-go-to-business-setup">
                <ArrowRight className="h-4 w-4" />
                Set Up Business Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
