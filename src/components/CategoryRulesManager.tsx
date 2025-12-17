import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Eye, EyeOff, Tags } from "lucide-react";

interface CategoryRule {
  id: string;
  category: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const CategoryRulesManager = () => {
  const queryClient = useQueryClient();

  // Fetch all categories from deals
  const { data: allCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ["deal-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("category")
        .not("category", "is", null);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(d => d.category).filter(Boolean))];
      return uniqueCategories.sort();
    },
  });

  // Fetch existing category rules
  const { data: categoryRules, isLoading: loadingRules, refetch } = useQuery({
    queryKey: ["category-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_rules")
        .select("*")
        .order("category");
      
      if (error) throw error;
      return data as CategoryRule[];
    },
  });

  // Sync categories - ensure all deal categories have a rule entry
  const syncCategoriesMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      const existingCategories = categoryRules?.map(r => r.category) || [];
      const newCategories = categories.filter(c => !existingCategories.includes(c));
      
      if (newCategories.length === 0) {
        return { synced: 0 };
      }

      const { error } = await supabase
        .from("category_rules")
        .insert(newCategories.map(category => ({
          category,
          is_published: true,
        })));
      
      if (error) throw error;
      return { synced: newCategories.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["category-rules"] });
      if (result.synced > 0) {
        toast({
          title: "Categories synced",
          description: `Added ${result.synced} new categor${result.synced === 1 ? 'y' : 'ies'}`,
        });
      } else {
        toast({
          title: "All synced",
          description: "All categories are already tracked",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle category publish status
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("category_rules")
        .update({ is_published })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-sync on mount if we have categories but fewer rules
  useEffect(() => {
    if (allCategories && categoryRules && allCategories.length > categoryRules.length) {
      syncCategoriesMutation.mutate(allCategories);
    }
  }, [allCategories, categoryRules]);

  const publishedCount = categoryRules?.filter(r => r.is_published).length || 0;
  const unpublishedCount = categoryRules?.filter(r => !r.is_published).length || 0;

  if (loadingCategories || loadingRules) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <CardTitle>Category Publish Rules</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncCategoriesMutation.mutate(allCategories || [])}
            disabled={syncCategoriesMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncCategoriesMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Categories
          </Button>
        </div>
        <CardDescription>
          Control which deal categories are visible to users. Unpublished categories will be hidden from the deals page.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {publishedCount} Published
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <EyeOff className="h-3 w-3" />
            {unpublishedCount} Hidden
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {categoryRules && categoryRules.length > 0 ? (
          <div className="space-y-2">
            {categoryRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  rule.is_published 
                    ? 'bg-background hover:bg-muted/50' 
                    : 'bg-muted/30 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  {rule.is_published ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`font-medium ${!rule.is_published ? 'text-muted-foreground' : ''}`}>
                    {rule.category}
                  </span>
                </div>
                <Switch
                  checked={rule.is_published}
                  onCheckedChange={(checked) => 
                    togglePublishMutation.mutate({ id: rule.id, is_published: checked })
                  }
                  disabled={togglePublishMutation.isPending}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No categories found. Categories will appear here once deals are synced.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
