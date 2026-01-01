import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Code, 
  Loader2, 
  ExternalLink, 
  User, 
  Eye, 
  Edit, 
  Save,
  Store,
  MousePointer,
  DollarSign,
  Calendar,
  Globe,
  Users,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

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
  total_earnings: number | null;
  pending_earnings: number | null;
  paid_earnings: number | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
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
  const [shareCount, setShareCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    tracking_code: "",
    slug: "",
    website: "",
    community_type: "",
    community_size: "",
  });

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

    if (!amazonCode.trim().endsWith("-20")) {
      toast({
        title: "Invalid Tracking Code",
        description: "Amazon tracking codes should end with -20 (e.g., 'yourcode-20')",
        variant: "destructive",
      });
      return;
    }

    try {
      let baseSlug = selectedApp.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

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
          break;
        }

        slugCounter++;
        slug = `${baseSlug}-${slugCounter}`;
      }
      
      const { error } = await supabase
        .from("projects")
        .update({ 
          tracking_code: amazonCode.trim(),
          slug: slug,
          is_active: true 
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      await sendApplicationEmail(selectedApp.created_by, "approved", selectedApp.name, slug);

      const fullUrl = `https://hunt-a-deal.lovable.app/project/${slug}/deals`;
      
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

  const handleViewStore = async (app: Application) => {
    setViewingApp(app);
    setIsViewDialogOpen(true);
    setIsEditing(false);
    setEditForm({
      name: app.name,
      description: app.description || "",
      tracking_code: app.tracking_code,
      slug: app.slug || "",
      website: app.website || "",
      community_type: app.community_type || "",
      community_size: app.community_size || "",
    });
    
    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", app.created_by)
      .single();
    setViewingUser(profile);
    
    // Fetch click count
    const { count: clicks } = await supabase
      .from("click_tracking")
      .select("*", { count: "exact", head: true })
      .eq("project_id", app.id);
    setClickCount(clicks || 0);

    // Fetch share count
    const { count: shares } = await supabase
      .from("share_tracking")
      .select("*", { count: "exact", head: true })
      .eq("project_id", app.id);
    setShareCount(shares || 0);
  };

  const handleSaveChanges = async () => {
    if (!viewingApp) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editForm.name,
          description: editForm.description,
          tracking_code: editForm.tracking_code,
          slug: editForm.slug,
          website: editForm.website,
          community_type: editForm.community_type,
          community_size: editForm.community_size,
        })
        .eq("id", viewingApp.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store details updated successfully",
      });

      setIsEditing(false);
      loadApplications();
      
      // Update local state
      setViewingApp({
        ...viewingApp,
        ...editForm,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update store",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <h1 className="text-4xl font-bold mb-8">Store Management</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeStores.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
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
                          <div className="flex flex-wrap gap-2 mt-2">
                            {app.community_type && (
                              <Badge variant="outline">{app.community_type}</Badge>
                            )}
                            {app.community_size && (
                              <Badge variant="secondary">{app.community_size}</Badge>
                            )}
                          </div>
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

        {/* Active Stores Table */}
        {activeStores.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Stores</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Tracking Code</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStores.map(app => (
                    <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewStore(app)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {app.logo_url ? (
                            <img 
                              src={app.logo_url} 
                              alt={app.name} 
                              className="h-10 w-10 object-contain rounded border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
                              <Store className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{app.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{app.tracking_code}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{app.slug || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{app.community_type || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">${(app.total_earnings || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(app.created_at), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewStore(app); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Add Amazon Code Dialog */}
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

        {/* View/Edit Store Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setIsEditing(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3">
                  {viewingApp?.logo_url && (
                    <img src={viewingApp.logo_url} alt={viewingApp.name} className="h-10 w-10 object-contain rounded" />
                  )}
                  {isEditing ? "Edit Store" : viewingApp?.name}
                </DialogTitle>
                {!isEditing && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
              <DialogDescription>
                {isEditing ? "Make changes to store details" : "Store and user details"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <MousePointer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{clickCount}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{shareCount}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">${(viewingApp?.total_earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Earnings</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">
                    {viewingApp ? format(new Date(viewingApp.created_at), "MMM d") : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
              </div>

              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Store Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-slug">Slug</Label>
                      <Input
                        id="edit-slug"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-tracking">Amazon Tracking Code</Label>
                    <Input
                      id="edit-tracking"
                      value={editForm.tracking_code}
                      onChange={(e) => setEditForm({ ...editForm, tracking_code: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-website">Website</Label>
                      <Input
                        id="edit-website"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-community-type">Community Type</Label>
                      <Input
                        id="edit-community-type"
                        value={editForm.community_type}
                        onChange={(e) => setEditForm({ ...editForm, community_type: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-community-size">Community Size</Label>
                    <Input
                      id="edit-community-size"
                      value={editForm.community_size}
                      onChange={(e) => setEditForm({ ...editForm, community_size: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* User Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner Information
                    </h4>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{viewingUser?.email || "Loading..."}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">User ID:</span>
                          <p className="font-mono text-xs truncate">{viewingApp?.created_by}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Store Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Store Details
                    </h4>
                    <div className="rounded-lg bg-muted p-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tracking Code:</span>
                          <p className="font-mono font-medium">{viewingApp?.tracking_code}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Slug:</span>
                          <p className="font-medium">{viewingApp?.slug || "-"}</p>
                        </div>
                        {viewingApp?.website && (
                          <div>
                            <span className="text-muted-foreground">Website:</span>
                            <p className="font-medium truncate">{viewingApp.website}</p>
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

                  {/* Address Info */}
                  {(viewingApp?.address_line1 || viewingApp?.city) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Payment Address
                      </h4>
                      <div className="rounded-lg bg-muted p-4 text-sm">
                        {viewingApp.address_line1 && <p>{viewingApp.address_line1}</p>}
                        <p>
                          {[viewingApp.city, viewingApp.state, viewingApp.postal_code]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  {viewingApp?.slug && (
                    <Button onClick={() => window.open(`/project/${viewingApp.slug}/deals`, '_blank')}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Store
                    </Button>
                  )}
                </>
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