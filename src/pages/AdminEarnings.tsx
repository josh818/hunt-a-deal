import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminNavigation } from "@/components/AdminNavigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2, Search, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [earningsInput, setEarningsInput] = useState({
    amount: "",
    type: "pending" as "pending" | "paid",
  });
  const [bulkEarningsInput, setBulkEarningsInput] = useState({
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

  // Update earnings mutation (single project)
  const updateEarnings = useMutation({
    mutationFn: async ({ projectId, amount, type }: { projectId: string; amount: number; type: 'pending' | 'paid' }) => {
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

  // Bulk update earnings mutation
  const bulkUpdateEarnings = useMutation({
    mutationFn: async ({ projectIds, amount, type }: { projectIds: string[]; amount: number; type: 'pending' | 'paid' }) => {
      for (const projectId of projectIds) {
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
          updates.pending_earnings = Math.max(0, (current?.pending_earnings || 0) - amount);
        }

        const { error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsWithEarnings'] });
      setIsBulkDialogOpen(false);
      setSelectedIds(new Set());
      setBulkEarningsInput({ amount: "", type: "pending" });
      toast.success(`Earnings updated for ${selectedIds.size} partners!`);
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

  const handleBulkAddEarnings = () => {
    if (selectedIds.size === 0 || !bulkEarningsInput.amount) return;
    
    const amount = parseFloat(bulkEarningsInput.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    bulkUpdateEarnings.mutate({
      projectIds: Array.from(selectedIds),
      amount,
      type: bulkEarningsInput.type,
    });
  };

  const openEarningsDialog = (project: ProjectWithEarnings) => {
    setSelectedProject(project);
    setEarningsInput({ amount: "", type: "pending" });
    setIsDialogOpen(true);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (filteredProjects && selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else if (filteredProjects) {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Partner Earnings</CardTitle>
                <CardDescription>
                  View and update earnings for each partner
                </CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button onClick={() => setIsBulkDialogOpen(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Bulk Update ({selectedIds.size})
                </Button>
              )}
            </div>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredProjects.length > 0 && selectedIds.size === filteredProjects.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                    <TableRow key={project.id} className={selectedIds.has(project.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={() => toggleSelection(project.id)}
                        />
                      </TableCell>
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
                          Add
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

        {/* Single Earnings Dialog */}
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

        {/* Bulk Earnings Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Add Earnings</DialogTitle>
              <DialogDescription>
                Add the same amount to {selectedIds.size} selected partners
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-amount">Amount ($) per partner</Label>
                <Input
                  id="bulk-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkEarningsInput.amount}
                  onChange={(e) => setBulkEarningsInput({ ...bulkEarningsInput, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-type">Type</Label>
                <Select
                  value={bulkEarningsInput.type}
                  onValueChange={(value: 'pending' | 'paid') => setBulkEarningsInput({ ...bulkEarningsInput, type: value })}
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
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Selected Partners ({selectedIds.size})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredProjects?.filter(p => selectedIds.has(p.id)).map(p => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">{p.tracking_code}</span>
                    </div>
                  ))}
                </div>
                {bulkEarningsInput.amount && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Total to distribute:</span>
                      <span>${(parseFloat(bulkEarningsInput.amount || "0") * selectedIds.size).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkAddEarnings}
                disabled={!bulkEarningsInput.amount || bulkUpdateEarnings.isPending}
              >
                {bulkUpdateEarnings.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Add to ${selectedIds.size} Partners`
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
