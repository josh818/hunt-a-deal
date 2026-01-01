import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface ProjectWithEarnings {
  id: string;
  name: string;
  slug: string;
  tracking_code: string;
  is_active: boolean;
  total_earnings: number | null;
  pending_earnings: number | null;
  paid_earnings: number | null;
  created_at: string;
}

const AdminEarnings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectWithEarnings | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [earningsInput, setEarningsInput] = useState({
    amount: "",
    type: "pending" as "pending" | "paid",
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

  // Fetch all projects with earnings
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projectsWithEarnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, tracking_code, is_active, total_earnings, pending_earnings, paid_earnings, created_at')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ProjectWithEarnings[];
    },
    enabled: isAdmin === true,
  });

  // Update earnings mutation
  const updateEarnings = useMutation({
    mutationFn: async ({ projectId, amount, type }: { projectId: string; amount: number; type: 'pending' | 'paid' }) => {
      // Get current earnings
      const { data: current, error: fetchError } = await supabase
        .from('projects')
        .select('total_earnings, pending_earnings, paid_earnings')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const updates: Record<string, number> = {
        total_earnings: (current?.total_earnings || 0) + amount,
      };

      if (type === 'pending') {
        updates.pending_earnings = (current?.pending_earnings || 0) + amount;
      } else {
        updates.paid_earnings = (current?.paid_earnings || 0) + amount;
        // If marking as paid, subtract from pending
        updates.pending_earnings = Math.max(0, (current?.pending_earnings || 0) - amount);
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsWithEarnings'] });
      setIsDialogOpen(false);
      setSelectedProject(null);
      setEarningsInput({ amount: "", type: "pending" });
      toast.success("Earnings updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update earnings");
    },
  });

  const handleAddEarnings = () => {
    if (!selectedProject || !earningsInput.amount) return;
    
    const amount = parseFloat(earningsInput.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    updateEarnings.mutate({
      projectId: selectedProject.id,
      amount,
      type: earningsInput.type,
    });
  };

  const openEarningsDialog = (project: ProjectWithEarnings) => {
    setSelectedProject(project);
    setEarningsInput({ amount: "", type: "pending" });
    setIsDialogOpen(true);
  };

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tracking_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (checkingAdmin || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNavigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Earnings Management</h1>
          <p className="text-muted-foreground mt-1">
            Add and manage affiliate earnings for partners
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings (All)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(projects?.reduce((sum, p) => sum + (p.total_earnings || 0), 0) || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${(projects?.reduce((sum, p) => sum + (p.pending_earnings || 0), 0) || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(projects?.reduce((sum, p) => sum + (p.paid_earnings || 0), 0) || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Partner Earnings</CardTitle>
            <CardDescription>
              View and update earnings for each partner
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or tracking code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects && filteredProjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Tracking Code</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {project.tracking_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${(project.total_earnings || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600">
                        ${(project.pending_earnings || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${(project.paid_earnings || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openEarningsDialog(project)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Add Earnings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No partners found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Earnings Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Earnings</DialogTitle>
              <DialogDescription>
                Add earnings for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={earningsInput.amount}
                  onChange={(e) => setEarningsInput({ ...earningsInput, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={earningsInput.type}
                  onValueChange={(value: 'pending' | 'paid') => setEarningsInput({ ...earningsInput, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending (Add to pending balance)</SelectItem>
                    <SelectItem value="paid">Paid (Mark as paid, deduct from pending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedProject && (
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Current Balance</p>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="text-yellow-600">${(selectedProject.pending_earnings || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className="text-green-600">${(selectedProject.paid_earnings || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddEarnings}
                disabled={!earningsInput.amount || updateEarnings.isPending}
              >
                {updateEarnings.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Add Earnings"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
};

export default AdminEarnings;
