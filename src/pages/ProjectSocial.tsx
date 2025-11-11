import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Share2, Copy, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Deal } from "@/types/deal";
import { replaceTrackingCode } from "@/utils/trackingCode";

const ProjectSocial = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [socialPosts, setSocialPosts] = useState<Record<string, any>>({});

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['project-deals-social', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price),
        originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
        discount: item.discount ? parseFloat(item.discount) : undefined,
        imageUrl: item.image_url,
        productUrl: item.product_url,
        category: item.category,
        rating: item.rating ? parseFloat(item.rating) : undefined,
        reviewCount: item.review_count,
        brand: item.brand,
        inStock: item.in_stock,
      }));
    },
    enabled: !!project,
  });

  const generateSocialPost = async (deal: Deal) => {
    if (!project) return;

    setSocialPosts(prev => ({
      ...prev,
      [deal.id]: { isGenerating: true }
    }));

    try {
      const trackedUrl = replaceTrackingCode(deal.productUrl, project.tracking_code);
      const pageUrl = `${window.location.origin}/project/${projectId}/deals`;

      const { data, error } = await supabase.functions.invoke('generate-social-post', {
        body: {
          deal: {
            title: deal.title,
            price: deal.price,
            originalPrice: deal.originalPrice,
            discount: deal.discount,
            brand: deal.brand,
            category: deal.category,
          },
          trackedUrl,
          pageUrl,
        }
      });

      if (error) throw error;

      setSocialPosts(prev => ({
        ...prev,
        [deal.id]: {
          text: data.text,
          url: trackedUrl,
          isGenerating: false,
          isCopied: false,
        }
      }));

      toast.success("Social post generated!");
    } catch (error) {
      console.error('Error generating social post:', error);
      toast.error("Failed to generate social post");
      setSocialPosts(prev => {
        const newPosts = { ...prev };
        delete newPosts[deal.id];
        return newPosts;
      });
    }
  };

  const copyToClipboard = (dealId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setSocialPosts(prev => ({
      ...prev,
      [dealId]: {
        ...prev[dealId],
        isCopied: true,
      }
    }));
    toast.success("Copied to clipboard!");
    
    setTimeout(() => {
      setSocialPosts(prev => ({
        ...prev,
        [dealId]: {
          ...prev[dealId],
          isCopied: false,
        }
      }));
    }, 2000);
  };

  if (projectLoading || dealsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{project.name} - Social Links</h1>
              <p className="text-sm text-muted-foreground">
                Generate and copy social media posts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {deals && deals.length > 0 ? (
          <div className="space-y-4">
            {deals.map((deal) => {
              const post = socialPosts[deal.id];
              const discount = deal.originalPrice 
                ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
                : null;

              return (
                <Card key={deal.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{deal.title}</CardTitle>
                    <CardDescription>
                      ${deal.price.toFixed(2)}
                      {deal.originalPrice && (
                        <span className="ml-2">
                          <span className="line-through text-muted-foreground">
                            ${deal.originalPrice.toFixed(2)}
                          </span>
                          {discount && (
                            <span className="ml-2 text-green-600 font-semibold">
                              {discount}% OFF
                            </span>
                          )}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!post ? (
                      <Button 
                        onClick={() => generateSocialPost(deal)}
                        className="gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Generate Social Post
                      </Button>
                    ) : post.isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Generating post...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="whitespace-pre-wrap">{post.text}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(deal.id, post.text)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {post.isCopied ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Copy Post
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => copyToClipboard(deal.id, post.url)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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

export default ProjectSocial;
