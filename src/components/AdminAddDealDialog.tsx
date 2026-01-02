import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const dealSchema = z.object({
  id: z.string().min(1, "ID is required").max(100, "ID too long"),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  price: z.number().min(0, "Price must be positive"),
  original_price: z.number().min(0, "Original price must be positive").optional(),
  product_url: z.string().url("Must be a valid URL"),
  image_url: z.string().url("Must be a valid URL").optional(),
  description: z.string().max(2000, "Description too long").optional(),
  category: z.string().max(100, "Category too long").optional(),
  brand: z.string().max(100, "Brand too long").optional(),
  coupon_code: z.string().max(50, "Coupon code too long").optional(),
});

export function AdminAddDealDialog() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    price: "",
    original_price: "",
    product_url: "",
    image_url: "",
    description: "",
    category: "",
    brand: "",
    coupon_code: "",
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const price = parseFloat(formData.price);
      const original_price = formData.original_price ? parseFloat(formData.original_price) : undefined;
      
      const dealData = {
        id: formData.id.trim(),
        title: formData.title.trim(),
        price,
        original_price,
        product_url: formData.product_url.trim(),
        image_url: formData.image_url.trim() || "https://via.placeholder.com/300x300?text=No+Image",
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        brand: formData.brand.trim() || null,
        coupon_code: formData.coupon_code.trim() || null,
      };

      // Validate with zod
      const validation = dealSchema.safeParse(dealData);
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

      // Calculate discount if original price is provided
      let discount = null;
      if (original_price && original_price > price) {
        discount = Math.round(((original_price - price) / original_price) * 100);
      }

      // Insert the deal using service role via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("admin-add-deal", {
        body: {
          ...validation.data,
          discount,
          in_stock: true,
          fetched_at: new Date().toISOString(),
          posted_at: new Date().toISOString(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to add deal");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dealsCount"] });
      setIsOpen(false);
      setFormData({
        id: "",
        title: "",
        price: "",
        original_price: "",
        product_url: "",
        image_url: "",
        description: "",
        category: "",
        brand: "",
        coupon_code: "",
      });
      setFormErrors({});
      toast.success("Deal added successfully!");
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast.error(error.message || "Failed to add deal");
      }
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Manual Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Deal</DialogTitle>
          <DialogDescription>
            Manually add a deal to the database. This will be displayed to all stores with their respective tracking codes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="id">Deal ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => handleInputChange("id", e.target.value)}
                placeholder="unique-deal-id"
                className={formErrors.id ? "border-destructive" : ""}
              />
              {formErrors.id && <p className="text-xs text-destructive mt-1">{formErrors.id}</p>}
              <p className="text-xs text-muted-foreground mt-1">Unique identifier (e.g., manual-001)</p>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Electronics"
                className={formErrors.category ? "border-destructive" : ""}
              />
              {formErrors.category && <p className="text-xs text-destructive mt-1">{formErrors.category}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Amazing Product Deal - 50% Off!"
              className={formErrors.title ? "border-destructive" : ""}
            />
            {formErrors.title && <p className="text-xs text-destructive mt-1">{formErrors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Sale Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="29.99"
                className={formErrors.price ? "border-destructive" : ""}
              />
              {formErrors.price && <p className="text-xs text-destructive mt-1">{formErrors.price}</p>}
            </div>
            <div>
              <Label htmlFor="original_price">Original Price ($)</Label>
              <Input
                id="original_price"
                type="number"
                step="0.01"
                value={formData.original_price}
                onChange={(e) => handleInputChange("original_price", e.target.value)}
                placeholder="59.99"
                className={formErrors.original_price ? "border-destructive" : ""}
              />
              {formErrors.original_price && <p className="text-xs text-destructive mt-1">{formErrors.original_price}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="product_url">Product URL *</Label>
            <Input
              id="product_url"
              type="url"
              value={formData.product_url}
              onChange={(e) => handleInputChange("product_url", e.target.value)}
              placeholder="https://amazon.com/dp/B0..."
              className={formErrors.product_url ? "border-destructive" : ""}
            />
            {formErrors.product_url && <p className="text-xs text-destructive mt-1">{formErrors.product_url}</p>}
          </div>

          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => handleInputChange("image_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={formErrors.image_url ? "border-destructive" : ""}
            />
            {formErrors.image_url && <p className="text-xs text-destructive mt-1">{formErrors.image_url}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="Amazon"
                className={formErrors.brand ? "border-destructive" : ""}
              />
              {formErrors.brand && <p className="text-xs text-destructive mt-1">{formErrors.brand}</p>}
            </div>
            <div>
              <Label htmlFor="coupon_code">Coupon Code</Label>
              <Input
                id="coupon_code"
                value={formData.coupon_code}
                onChange={(e) => handleInputChange("coupon_code", e.target.value)}
                placeholder="SAVE20"
                className={formErrors.coupon_code ? "border-destructive" : ""}
              />
              {formErrors.coupon_code && <p className="text-xs text-destructive mt-1">{formErrors.coupon_code}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Deal details and description..."
              rows={3}
              className={formErrors.description ? "border-destructive" : ""}
            />
            {formErrors.description && <p className="text-xs text-destructive mt-1">{formErrors.description}</p>}
          </div>

          <Button
            onClick={() => createDeal.mutate()}
            disabled={!formData.id || !formData.title || !formData.price || !formData.product_url || createDeal.isPending}
            className="w-full"
          >
            {createDeal.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Deal...
              </>
            ) : (
              "Add Deal"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
