import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Deal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  discount: number | null;
  image_url: string;
  product_url: string;
  category: string | null;
  brand: string | null;
  coupon_code: string | null;
  in_stock: boolean | null;
  fetched_at: string | null;
}

export const AdminDealsManager = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Deal>>({});

  // Safe URL opener to prevent XSS attacks
  const openProductUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        toast.error("Invalid URL protocol. Only HTTP/HTTPS links are allowed.");
        return;
      }
      if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
        toast.error("Invalid URL format.");
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error("Invalid URL format.");
      console.error('Invalid URL:', error);
    }
  };

  // Fetch deals with search
  const { data: deals, isLoading } = useQuery({
    queryKey: ['adminDeals', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Deal[];
    },
  });

  // Edit deal mutation
  const editDeal = useMutation({
    mutationFn: async (deal: Partial<Deal> & { id: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-edit-deal', {
        body: deal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update deal');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDeals'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setEditingDeal(null);
      setEditFormData({});
      toast.success("Deal updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update deal");
    },
  });

  // Delete deal mutation
  const deleteDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-delete-deal', {
        body: { id: dealId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete deal');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDeals'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dealsCount'] });
      setDeletingDealId(null);
      toast.success("Deal deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete deal");
    },
  });

  const handleEditClick = (deal: Deal) => {
    setEditingDeal(deal);
    setEditFormData({ ...deal });
  };

  const handleEditSave = () => {
    if (!editingDeal || !editFormData.id) return;
    editDeal.mutate(editFormData as Partial<Deal> & { id: string });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Deals</CardTitle>
        <CardDescription>
          Edit or delete existing deals from the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals by title, brand, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : deals && deals.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Deal</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Fetched</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={deal.image_url}
                          alt={deal.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[200px]" title={deal.title}>
                            {deal.title}
                          </div>
                          {deal.brand && (
                            <div className="text-xs text-muted-foreground">{deal.brand}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">${deal.price.toFixed(2)}</span>
                        {deal.original_price && deal.original_price > deal.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ${deal.original_price.toFixed(2)}
                          </span>
                        )}
                        {deal.discount && deal.discount > 0 && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            -{deal.discount}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {deal.category ? (
                        <Badge variant="outline">{deal.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(deal.fetched_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openProductUrl(deal.product_url)}
                          title="View on Amazon"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(deal)}
                          title="Edit deal"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingDealId(deal.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete deal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "No deals found matching your search" : "No deals in database"}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Deal</DialogTitle>
              <DialogDescription>
                Update the deal information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">Price ($)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editFormData.price || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-original-price">Original Price ($)</Label>
                  <Input
                    id="edit-original-price"
                    type="number"
                    step="0.01"
                    value={editFormData.original_price || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, original_price: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    value={editFormData.category || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-brand">Brand</Label>
                  <Input
                    id="edit-brand"
                    value={editFormData.brand || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-image-url">Image URL</Label>
                <Input
                  id="edit-image-url"
                  value={editFormData.image_url || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-product-url">Product URL</Label>
                <Input
                  id="edit-product-url"
                  value={editFormData.product_url || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, product_url: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-coupon">Coupon Code</Label>
                <Input
                  id="edit-coupon"
                  value={editFormData.coupon_code || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, coupon_code: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDeal(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={editDeal.isPending}>
                {editDeal.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingDealId} onOpenChange={(open) => !open && setDeletingDealId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Deal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this deal? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingDealId && deleteDeal.mutate(deletingDealId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDeal.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
