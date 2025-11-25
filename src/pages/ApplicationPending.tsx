import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";

const ApplicationPending = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Application Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Thank you for applying to join Relay Station! Our team is reviewing your application.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3 text-left">
              <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">What happens next?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll review your application within 1-2 business days and send you an email with next steps.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Once approved, you'll receive:
            </p>
            <ul className="text-sm text-left space-y-1 max-w-sm mx-auto">
              <li>✓ Access to your WhatsApp deal groups</li>
              <li>✓ Your unique tracking code for earnings</li>
              <li>✓ Training materials and best practices</li>
              <li>✓ Dedicated support from our team</li>
            </ul>
          </div>

          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Return to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationPending;
