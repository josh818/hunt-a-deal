import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { PublicNavigation } from "@/components/PublicNavigation";
import { Footer } from "@/components/Footer";

const ApplicationPending = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        // Check if user has a project
        const { data: projects } = await supabase
          .from("projects")
          .select("name, is_active")
          .eq("created_by", user.id)
          .limit(1);

        if (projects && projects.length > 0) {
          setProjectName(projects[0].name);
          
          // If project is already active, redirect to dashboard
          if (projects[0].is_active) {
            navigate("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavigation />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            {projectName && (
              <p className="text-muted-foreground mt-2">{projectName}</p>
            )}
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
                    We'll review your application within 1-2 business days and contact you via WhatsApp with next steps.
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                Return Home
              </Button>
              <Button onClick={() => navigate("/deals")} className="flex-1">
                Browse Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ApplicationPending;