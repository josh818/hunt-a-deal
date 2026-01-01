import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedNavigation } from "@/components/RoleBasedNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, Users, ExternalLink, Clock, Loader2, AlertCircle, Sparkles, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { ShareAnalytics } from "@/components/ShareAnalytics";
import { ClickAnalytics } from "@/components/ClickAnalytics";
import { formatDistanceToNow, differenceInHours } from "date-fns";

interface UserProject {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
  slug: string | null;
  whatsapp_number: string | null;
  total_earnings: number | null;
  pending_earnings: number | null;
  paid_earnings: number | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<UserProject | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [newDealsCount, setNewDealsCount] = useState(0);
  const [latestDealTime, setLatestDealTime] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        // Check if user is admin - redirect to admin dashboard
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roles) {
          navigate("/admin");
          return;
        }

        // Fetch user's project
        const { data: projectData, error } = await supabase
          .from("projects")
          .select("*")
          .eq("created_by", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching project:", error);
          toast({
            title: "Error",
            description: "Failed to load your store data",
            variant: "destructive",
          });
        }

        if (projectData) {
          setProject(projectData);
          
          // Fetch click count for this project
          const { count: clicks } = await supabase
            .from("click_tracking")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectData.id);
          
          setClickCount(clicks || 0);
        }

        // Fetch deal count and check for new deals (posted in last 4 hours)
        const { data: dealsData, count: deals } = await supabase
          .from("deals")
          .select("fetched_at, posted_at", { count: "exact" })
          .order("fetched_at", { ascending: false })
          .limit(1);
        
        setDealCount(deals || 0);
        
        // Count deals posted in last 4 hours as "new"
        if (dealsData && dealsData.length > 0) {
          setLatestDealTime(dealsData[0].fetched_at);
          
          const { count: newDeals } = await supabase
            .from("deals")
            .select("*", { count: "exact", head: true })
            .gte("posted_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString());
          
          setNewDealsCount(newDeals || 0);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <RoleBasedNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // No project at all - shouldn't happen normally, redirect to apply
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <RoleBasedNavigation />
        <div className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>No Application Found</CardTitle>
              <CardDescription>
                You haven't submitted an application yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                To start earning with Relay Station, you'll need to submit an application first.
              </p>
              <Button onClick={() => navigate("/apply")} className="w-full">
                Start Your Application
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Project exists but not active - pending review
  if (!project.is_active) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <RoleBasedNavigation />
        <div className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Application Under Review</CardTitle>
              <CardDescription>
                {project.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">What happens next?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Our team is reviewing your application. We'll contact you via WhatsApp at <strong>{project.whatsapp_number}</strong> within 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Once approved, you'll receive:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Access to your WhatsApp deal groups</li>
                  <li>✓ Your unique tracking code for earnings</li>
                  <li>✓ Training materials and best practices</li>
                  <li>✓ Dedicated support from our team</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
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
  }

  // Project is active - show full dashboard
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RoleBasedNavigation />
      
      <div className="flex-1 container mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome, {project.name}!</h1>
          <p className="text-muted-foreground">
            Manage your deals and track your earnings
          </p>
        </div>

        {/* New Deals Alert */}
        {newDealsCount > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{newDealsCount} New {newDealsCount === 1 ? 'Deal' : 'Deals'} Available!</p>
                    <p className="text-sm text-muted-foreground">Posted in the last 4 hours</p>
                  </div>
                </div>
                <Button onClick={() => navigate(project.slug ? `/project/${project.slug}/deals` : "/deals")} size="sm">
                  View Deals
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(project.total_earnings || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">${(project.pending_earnings || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clickCount}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{dealCount}</span>
                {newDealsCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    +{newDealsCount} new
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestDealTime 
                  ? `Updated ${formatDistanceToNow(new Date(latestDealTime), { addSuffix: true })}`
                  : 'Updated daily'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl mb-2">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description?.split('\n')[0]}</CardDescription>
              </div>
              {project.logo_url && (
                <img src={project.logo_url} alt={project.name} className="h-16 w-16 object-contain rounded" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
              <Badge variant="outline">Code: {project.tracking_code}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button 
                onClick={() => navigate(project.slug ? `/project/${project.slug}/deals` : "/deals")}
                className="w-full"
              >
                <Store className="mr-2 h-4 w-4" />
                View Store
              </Button>
              <Button 
                onClick={() => navigate("/profile")}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Store Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Click Analytics */}
        <div className="mt-8">
          <ClickAnalytics projectId={project.id} />
        </div>

        {/* Share Analytics */}
        <div className="mt-8">
          <ShareAnalytics projectId={project.id} />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;