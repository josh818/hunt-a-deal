import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Code, Loader2, ExternalLink, User, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/Footer";

interface Application {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  whatsapp_number: string | null;
  website: string | null;
  community_type: string | null;
  community_size: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  created_at: string | null;
}

const sendApplicationEmail = async (
  userId: string,
  type: "approved" | "rejected",
  projectName: string,
  projectSlug?: string
) => {
  try {
    // Get user email from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.log("No email found for user");
      return;
    }

    const { error } = await supabase.functions.invoke("send-application-email", {
      body: {
        to: profile.email,
        type,
        projectName,
        projectSlug,
      },
    });

    if (error) {
      console.error("Failed to send email:", error);
    }
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
};

const AdminApplications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [amazonCode, setAmazonCode] = useState("");
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);

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

    // Validate Amazon tracking code ends with -20
    if (!amazonCode.trim().endsWith("-20")) {
      toast({
        title: "Invalid Tracking Code",
        description: "Amazon tracking codes should end with -20 (e.g., 'yourcode-20')",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate base slug from name
      let baseSlug = selectedApp.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
        .replace(/^-+|-+$/g, '');      // Remove leading/trailing dashes

      // Check if slug exists and make unique if needed
      let slug = baseSlug;
      let slugCounter = 1;
      
      while (true) {
        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .neq("id", selectedApp.id)
          .maybeSingle();

        if (!existingProject) {
          break; // Slug is unique
        }

        slugCounter++;
        slug = `${baseSlug}-${slugCounter}`;
      }
      
      // Update project with Amazon code, slug, and activate it
      const { error } = await supabase
        .from("projects")
        .update({ 
          tracking_code: amazonCode.trim(),
          slug: slug,
          is_active: true 
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      // Send approval email notification
      await sendApplicationEmail(selectedApp.created_by, "approved", selectedApp.name, slug);

      const fullUrl = `https://hunt-a-deal.lovable.app/project/${slug}/deals`;
      
      // Copy URL to clipboard
      await navigator.clipboard.writeText(fullUrl);

      toast({
        title: "Project Activated!",
        description: `URL copied to clipboard: ${fullUrl}`,
        duration: 10000,
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

  const handleReject = async (app: Application) => {
    // Send rejection email before deleting
    await sendApplicationEmail(app.created_by, "rejected", app.name);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", app.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Application rejected and notification sent",
      });
      loadApplications();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => !app.is_active);
  const activeStores = applications.filter(app => app.is_active);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNavigation />
      
      <div className="flex-1 container mx-auto px-4 py-8 sm:py-12">
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
                          {app.whatsapp_number && (
                            <p className="text-sm text-muted-foreground mt-2">
                              WhatsApp: {app.whatsapp_number}
                            </p>
                          )}
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
                        onClick={() => handleReject(app)}
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
                <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={async () => {
                  setViewingApp(app);
                  setIsViewDialogOpen(true);
                  
                  // Fetch user profile
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", app.created_by)
                    .single();
                  setViewingUser(profile);
                  
                  // Fetch click count
                  const { count } = await supabase
                    .from("click_tracking")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", app.id);
                  setClickCount(count || 0);
                }}>
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
                          {app.slug && (
                            <p className="text-xs text-primary mt-1">/project/{app.slug}/deals</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
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

        {/* View Store Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {viewingApp?.logo_url && (
                  <img src={viewingApp.logo_url} alt={viewingApp.name} className="h-10 w-10 object-contain rounded" />
                )}
                {viewingApp?.name}
              </DialogTitle>
              <DialogDescription>
                Store and user details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User Information
                </h4>
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{viewingUser?.email || "Loading..."}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User ID:</span>
                      <p className="font-mono text-xs">{viewingApp?.created_by}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Store Information</h4>
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tracking Code:</span>
                      <p className="font-mono font-medium">{viewingApp?.tracking_code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Clicks:</span>
                      <p className="font-bold text-lg">{clickCount}</p>
                    </div>
                    {viewingApp?.whatsapp_number && (
                      <div>
                        <span className="text-muted-foreground">WhatsApp:</span>
                        <p className="font-medium">{viewingApp.whatsapp_number}</p>
                      </div>
                    )}
                    {viewingApp?.website && (
                      <div>
                        <span className="text-muted-foreground">Website:</span>
                        <p className="font-medium">{viewingApp.website}</p>
                      </div>
                    )}
                    {viewingApp?.community_type && (
                      <div>
                        <span className="text-muted-foreground">Community Type:</span>
                        <p className="font-medium">{viewingApp.community_type}</p>
                      </div>
                    )}
                    {viewingApp?.community_size && (
                      <div>
                        <span className="text-muted-foreground">Community Size:</span>
                        <p className="font-medium">{viewingApp.community_size}</p>
                      </div>
                    )}
                  </div>
                  {viewingApp?.description && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Description:</span>
                      <p className="text-sm mt-1">{viewingApp.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              {viewingApp?.slug && (
                <Button onClick={() => window.open(`/project/${viewingApp.slug}/deals`, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Store
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
};

export default AdminApplications;
