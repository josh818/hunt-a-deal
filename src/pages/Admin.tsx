import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Eye, AlertCircle, Copy, CheckCircle, BarChart, RefreshCw, Users, ShoppingBag, Loader2 } from "lucide-react";
import { AdminAddDealDialog } from "@/components/AdminAddDealDialog";
import { AdminDealsManager } from "@/components/AdminDealsManager";
import { CategoryRulesManager } from "@/components/CategoryRulesManager";
import { ShareAnalytics } from "@/components/ShareAnalytics";
import { ClickAnalytics } from "@/components/ClickAnalytics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// Reserved slugs that cannot be used for projects
const RESERVED_SLUGS = ['admin', 'api', 'login', 'auth', 'settings', 'dashboard', 'profile', 'project', 'deals', 'social', 'about', 'contact', 'terms', 'privacy'];

// Validate slug for security and reserved words
const validateSlug = (slug: string): { valid: boolean; error?: string } => {
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: "This slug is reserved by the system" };
  }
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return { valid: false, error: "Slug cannot contain path traversal characters" };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" };
  }
  if (slug.length < 3 || slug.length > 50) {
    return { valid: false, error: "Slug must be between 3 and 50 characters" };
  }
  return { valid: true };
};

const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .refine((slug) => !RESERVED_SLUGS.includes(slug), "This slug is reserved by the system")
    .refine((slug) => !slug.includes('..') && !slug.includes('/') && !slug.includes('\\'), "Slug cannot contain path traversal characters"),
  tracking_code: z.string()
    .min(1, "Tracking code is required")
    .max(50, "Tracking code too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Tracking code must contain only letters, numbers, hyphens, and underscores"),
  description: z.string().max(500, "Description too long").optional(),
});

interface Project {
  id: string;
  name: string;
  slug: string;
  tracking_code: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [syncingDeals, setSyncingDeals] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    slug: "",
    tracking_code: "",
    description: "",
  });

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      return !error && data !== null;
    },
  });

  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate('/deals');
    }
  }, [isAdmin, checkingAdmin, navigate]);

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, tracking_code, description, logo_url, created_at, created_by, updated_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: isAdmin === true,
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('click_tracking')
        .select('deal_id, project_id, clicked_at')
        .order('clicked_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // Fetch deals count
  const { data: dealsCount } = useQuery({
    queryKey: ['dealsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin === true,
  });

  // Sync deals function
  const handleSyncDeals = async () => {
    setSyncingDeals(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('sync-deals', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to sync deals');
      }

      toast.success(`Successfully synced ${response.data?.count || 0} deals!`);
      queryClient.invalidateQueries({ queryKey: ['dealsCount'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync deals');
    } finally {
      setSyncingDeals(false);
    }
  };

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (project: typeof newProject) => {
      // Validate with zod
      const validation = projectSchema.safeParse(project);
      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
        throw new Error("Validation failed");
      }
      
      setFormErrors({});
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: validation.data.name,
          slug: validation.data.slug,
          tracking_code: validation.data.tracking_code,
          description: validation.data.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setNewProject({ name: "", slug: "", tracking_code: "", description: "" });
      setFormErrors({});
      toast.success("Project created successfully!");
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast.error(error.message || "Failed to create project");
      }
    },
  });

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success("Project deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Clipboard error:', error);
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("Copied to clipboard!");
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        toast.error("Failed to copy to clipboard");
      }
      document.body.removeChild(textArea);
    }
  };

  const getProjectAnalytics = (projectId: string) => {
    if (!analytics) return { totalClicks: 0, uniqueDeals: 0 };
    const projectClicks = analytics.filter(a => a.project_id === projectId);
    return {
      totalClicks: projectClicks.length,
      uniqueDeals: new Set(projectClicks.map(a => a.deal_id)).size,
    };
  };

  if (checkingAdmin || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dealsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Currently available deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Last 100 tracked clicks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.filter(p => p.is_active).length || 0}</div>
              <p className="text-xs text-muted-foreground">Approved partner projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Rules */}
        <div className="mb-8">
          <CategoryRulesManager />
        </div>

        {/* Share Analytics */}
        <div className="mb-8">
          <ShareAnalytics showAllProjects />
        </div>

        {/* Click Analytics */}
        <div className="mb-8">
          <ClickAnalytics showAllProjects />
        </div>

        {/* Deals Manager */}
        <div className="mb-8">
          <AdminDealsManager />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage projects and tracking codes
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <AdminAddDealDialog />
            
            <Button
              variant="outline"
              onClick={handleSyncDeals}
              disabled={syncingDeals}
              className="gap-2"
            >
              {syncingDeals ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncingDeals ? "Syncing..." : "Refresh Deals"}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project with a unique Amazon affiliate tracking code
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => {
                      setNewProject({ ...newProject, name: e.target.value });
                      setFormErrors({ ...formErrors, name: "" });
                    }}
                    placeholder="My Affiliate Project"
                    className={formErrors.name ? "border-destructive" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={newProject.slug}
                    onChange={(e) => {
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-')
                        .replace(/--+/g, '-')
                        .replace(/^-|-$/g, '');
                      
                      const validation = validateSlug(sanitized);
                      setNewProject({ ...newProject, slug: sanitized });
                      
                      if (!validation.valid && sanitized) {
                        setFormErrors({ ...formErrors, slug: validation.error || "" });
                      } else {
                        setFormErrors({ ...formErrors, slug: "" });
                      }
                    }}
                    placeholder="my-project"
                    className={formErrors.slug ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lowercase letters, numbers, and hyphens only (min 3 chars)
                  </p>
                  {formErrors.slug && (
                    <p className="text-xs text-destructive mt-1">{formErrors.slug}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="tracking_code">Amazon Tracking Code</Label>
                  <Input
                    id="tracking_code"
                    value={newProject.tracking_code}
                    onChange={(e) => {
                      setNewProject({ ...newProject, tracking_code: e.target.value });
                      setFormErrors({ ...formErrors, tracking_code: "" });
                    }}
                    placeholder="yoursite-20"
                    className={formErrors.tracking_code ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The Amazon affiliate tag (e.g., "yoursite-20")
                  </p>
                  {formErrors.tracking_code && (
                    <p className="text-xs text-destructive mt-1">{formErrors.tracking_code}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => {
                      setNewProject({ ...newProject, description: e.target.value });
                      setFormErrors({ ...formErrors, description: "" });
                    }}
                    placeholder="Description of the project..."
                    className={formErrors.description ? "border-destructive" : ""}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-destructive mt-1">{formErrors.description}</p>
                  )}
                </div>
                <Button
                  onClick={() => createProject.mutate(newProject)}
                  disabled={!newProject.name || !newProject.slug || !newProject.tracking_code || createProject.isPending}
                  className="w-full"
                >
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : projects && projects.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                Manage your affiliate tracking projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tracking Code</TableHead>
                    <TableHead>Analytics</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const stats = getProjectAnalytics(project.id);
                    const dealsUrl = `${window.location.origin}/project/${project.slug}/deals`;
                    const socialUrl = `${window.location.origin}/project/${project.slug}/social`;

                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{project.tracking_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <BarChart className="h-4 w-4" />
                            <span>{stats.totalClicks} clicks</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{stats.uniqueDeals} deals</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(dealsUrl, `deals-${project.id}`)}
                            >
                              {copiedId === `deals-${project.id}` ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span className="ml-1">Deals</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(socialUrl, `social-${project.id}`)}
                            >
                              {copiedId === `social-${project.id}` ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span className="ml-1">Social</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/project/${project.slug}/deals`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingProjectId(project.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No projects yet. Create your first project to get started!
            </AlertDescription>
          </Alert>
        )}
      </main>
      
      <Footer />

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This will remove the project and all its analytics data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProjectId) {
                  deleteProject.mutate(deletingProjectId);
                  setDeletingProjectId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
