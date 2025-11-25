import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Code } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Application {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

const AdminApplications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [amazonCode, setAmazonCode] = useState("");
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        navigate("/dashboard");
        return;
      }

      loadApplications();
    };

    checkAdmin();
  }, [navigate]);

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } else {
      setApplications(data || []);
    }

    setLoading(false);
  };

  const handleOpenCodeDialog = (app: Application) => {
    setSelectedApp(app);
    setAmazonCode("");
    setIsCodeDialogOpen(true);
  };

  const handleApproveWithCode = async () => {
    if (!selectedApp || !amazonCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an Amazon tracking code",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate slug from name
      const slug = selectedApp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Update project with Amazon code, slug, and activate it
      const { error } = await supabase
        .from("projects")
        .update({ 
          tracking_code: amazonCode,
          slug: slug,
          is_active: true 
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Project activated! Site available at: /project/${slug}/deals`,
      });

      setIsCodeDialogOpen(false);
      setSelectedApp(null);
      setAmazonCode("");
      loadApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (projectId: string) => {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Application rejected",
      });
      loadApplications();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => !app.is_active);
  const activeStores = applications.filter(app => app.is_active);

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Application Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeStores.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
        </div>

        {pendingApplications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Pending Applications</h2>
            <div className="space-y-4">
              {pendingApplications.map(app => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {app.logo_url && (
                          <img 
                            src={app.logo_url} 
                            alt={app.name} 
                            className="h-16 w-16 object-contain border rounded-md"
                          />
                        )}
                        <div>
                          <CardTitle>{app.name}</CardTitle>
                          <CardDescription className="mt-2">
                            {app.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleOpenCodeDialog(app)}
                        className="flex-1"
                      >
                        <Code className="mr-2 h-4 w-4" />
                        Add Amazon Code
                      </Button>
                      <Button 
                        onClick={() => handleReject(app.id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeStores.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Stores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeStores.map(app => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {app.logo_url && (
                          <img 
                            src={app.logo_url} 
                            alt={app.name} 
                            className="h-12 w-12 object-contain"
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <code className="text-xs text-muted-foreground">{app.tracking_code}</code>
                        </div>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Amazon Tracking Code</DialogTitle>
              <DialogDescription>
                Enter the Amazon Associates tracking code for {selectedApp?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amazonCode">Amazon Tracking Code</Label>
                <Input
                  id="amazonCode"
                  value={amazonCode}
                  onChange={(e) => setAmazonCode(e.target.value)}
                  placeholder="example-20"
                />
                <p className="text-sm text-muted-foreground">
                  This will be used for all affiliate links on their site
                </p>
              </div>

              {selectedApp && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Site URL Preview:</p>
                  <code className="text-xs">
                    /project/{selectedApp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/deals
                  </code>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCodeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveWithCode}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve & Create Site
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminApplications;
