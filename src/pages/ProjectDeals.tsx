import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { Navigation } from "@/components/Navigation";
import { Deal } from "@/types/deal";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingDown } from "lucide-react";
import { replaceTrackingCode } from "@/utils/trackingCode";

const ProjectDeals = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['project-deals', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) throw error;

      if (!project) return [];

      // Apply project tracking code to all deals
      return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price),
        originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
        discount: item.discount ? parseFloat(item.discount) : undefined,
        imageUrl: item.image_url,
        productUrl: replaceTrackingCode(item.product_url, project.tracking_code),
        category: item.category,
        rating: item.rating ? parseFloat(item.rating) : undefined,
        reviewCount: item.review_count,
        brand: item.brand,
        inStock: item.in_stock,
      }));
    },
    enabled: !!project,
  });

  if (projectLoading || dealsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Project not found or you don't have access to it.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <header className="border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {project.logo_url && (
              <img 
                src={project.logo_url} 
                alt={project.name} 
                className="h-12 w-12 object-contain"
              />
            )}
            {!project.logo_url && <TrendingDown className="h-8 w-8 text-primary" />}
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Tracking code: {project.tracking_code}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                trackingCode={project.tracking_code}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No deals available at the moment.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectDeals;
