import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedNavigation } from "@/components/RoleBasedNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, Users, ExternalLink, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProject {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
  slug: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<UserProject | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Fetch user's project
      const { data: projectData, error } = await supabase
        .from("projects")
        .select("*")
        .eq("created_by", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: "Failed to load your store",
          variant: "destructive",
        });
      } else if (projectData) {
        setProject(projectData);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Application Under Review</CardTitle>
              <CardDescription>
                Your application is being reviewed by our team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Status: Pending Approval</p>
                  <p className="text-sm text-muted-foreground">
                    We'll notify you via email once your store is set up
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full">
                View Application Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!project.is_active) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Store Pending Activation</CardTitle>
              <CardDescription>
                Your store has been created but needs admin activation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">{project.name}</p>
                <p className="text-sm text-muted-foreground">
                  Tracking Code: <code className="bg-background px-2 py-1 rounded">{project.tracking_code}</code>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your store will be activated shortly. You'll receive an email when it's ready.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Your Store</h1>
          <p className="text-muted-foreground">
            Manage your deals and track your earnings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Updated daily</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </div>
              {project.logo_url && (
                <img src={project.logo_url} alt={project.name} className="h-16 w-16 object-contain" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Active</Badge>
              <Badge variant="outline">Tracking: {project.tracking_code}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={() => navigate(project.slug ? `/project/${project.slug}/deals` : "/deals")}
                className="w-full"
              >
                <Store className="mr-2 h-4 w-4" />
                View My Store
              </Button>
              <Button 
                onClick={() => navigate("/profile")}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Edit Store Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
