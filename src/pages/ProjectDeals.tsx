import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { Footer } from "@/components/Footer";
import { Deal } from "@/types/deal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Home, MessageCircle, Package, Store } from "lucide-react";
import { replaceTrackingCode } from "@/utils/trackingCode";
import { useToast } from "@/hooks/use-toast";

const ProjectDeals = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // First, check if project exists at all (including inactive)
  const { data: projectCheck, isLoading: checkLoading, error: checkError } = useQuery({
    queryKey: ['project-check', slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, is_active')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          console.error("Error checking project:", error);
          toast({
            title: "Error",
            description: "Failed to load store. Please try again.",
            variant: "destructive",
          });
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Project check failed:", err);
        throw err;
      }
    },
    enabled: !!slug,
    retry: 1,
  });

  // Fetch full project details only if it exists and is active
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug, tracking_code, description, logo_url, whatsapp_number, is_active')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching project:", error);
          toast({
            title: "Error",
            description: "Failed to load store details.",
            variant: "destructive",
          });
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Project fetch failed:", err);
        throw err;
      }
    },
    enabled: !!slug && projectCheck?.is_active === true,
    retry: 1,
  });

  const { data: deals, isLoading: dealsLoading, error: dealsError } = useQuery({
    queryKey: ['project-deals', project?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .order('fetched_at', { ascending: false });

        if (error) {
          console.error("Error fetching deals:", error);
          toast({
            title: "Error",
            description: "Failed to load deals. Please refresh the page.",
            variant: "destructive",
          });
          throw error;
        }

        if (!project) return [];

        // Apply project tracking code to all deals
        return (data || []).map((item: any): Deal => ({
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
          couponCode: item.coupon_code,
          fetchedAt: item.fetched_at,
          postedAt: item.posted_at,
        }));
      } catch (err) {
        console.error("Deals fetch failed:", err);
        throw err;
      }
    },
    enabled: !!project,
    retry: 1,
  });

  // Clean WhatsApp number (remove non-digits)
  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  // Loading state
  if (checkLoading || projectLoading || (project && dealsLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header skeleton */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </div>
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Project exists but is pending approval
  if (projectCheck && !projectCheck.is_active) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-md w-full text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">Store Pending Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This store is pending approval and will be available soon. 
                Please check back later or contact the store owner for updates.
              </p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Project not found at all
  if (!projectCheck || checkError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-md w-full text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Store Not Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This store doesn't exist or hasn't been approved yet. 
                Please check the URL or contact the store owner.
              </p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Project error or not active after full fetch
  if (!project || projectError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-md w-full text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Unable to Load Store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Something went wrong while loading this store. 
                Please try again or contact support.
              </p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const dealCount = deals?.length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient Header */}
      <header className="bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Logo */}
            {project.logo_url ? (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-background border shadow-sm overflow-hidden flex-shrink-0">
                <img 
                  src={project.logo_url} 
                  alt={`${project.name} logo`}
                  className="h-full w-full object-contain p-2"
                />
              </div>
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-primary/10 border flex items-center justify-center flex-shrink-0">
                <Store className="h-10 w-10 text-primary" />
              </div>
            )}
            
            {/* Project Info */}
            <div className="flex-1 space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                {project.name}
              </h1>
              
              {project.description && (
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl line-clamp-2">
                  {project.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="secondary" className="gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {dealCount} {dealCount === 1 ? 'Deal' : 'Deals'} Available
                </Badge>
                
                {project.whatsapp_number && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-2 text-green-600 border-green-600/30 hover:bg-green-50 hover:text-green-700"
                    asChild
                  >
                    <a 
                      href={getWhatsAppLink(project.whatsapp_number)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Contact on WhatsApp</span>
                      <span className="sm:hidden">WhatsApp</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Deals Grid */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {dealsError ? (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Failed to Load Deals</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Something went wrong. Please refresh the page to try again.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        ) : deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {deals.map((deal) => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                trackingCode={project.tracking_code}
                projectId={project.id}
              />
            ))}
          </div>
        ) : (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Deals Available</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  No deals available right now. Check back soon!
                </p>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default ProjectDeals;