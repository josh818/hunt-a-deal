import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Share2, Copy, CheckCircle, AlertCircle, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Deal } from "@/types/deal";
import { replaceTrackingCode, getDefaultTrackingCode } from "@/utils/trackingCode";

const fetchDeals = async (): Promise<Deal[]> => {
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
    couponCode: item.coupon_code,
    fetchedAt: item.fetched_at,
  }));
};

interface SocialPost {
  dealId: string;
  text: string;
  url: string;
  isGenerating: boolean;
  isCopied: boolean;
}

const SocialLinksGenerator = () => {
  const [socialPosts, setSocialPosts] = useState<Record<string, SocialPost>>({});
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  
  const { data: deals, isLoading, error } = useQuery({
    queryKey: ["deals-social-generator"],
    queryFn: fetchDeals,
  });

  const generateSocialPost = async (deal: Deal) => {
    setSocialPosts(prev => ({
      ...prev,
      [deal.id]: {
        dealId: deal.id,
        text: '',
        url: '',
        isGenerating: true,
        isCopied: false,
      }
    }));

    try {
      const trackedUrl = replaceTrackingCode(deal.productUrl, getDefaultTrackingCode());
      const pageUrl = `${window.location.origin}/test12345/sociallinks`;
      
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
          dealId: deal.id,
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

  const generateBulkPosts = async () => {
    if (!deals || deals.length === 0) return;
    
    setIsGeneratingBulk(true);
    let generated = 0;

    for (const deal of deals) {
      if (socialPosts[deal.id]) continue; // Skip already generated
      
      await generateSocialPost(deal);
      generated++;
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsGeneratingBulk(false);
    toast.success(`Generated ${generated} social posts!`);
  };

  const exportToCSV = () => {
    if (Object.keys(socialPosts).length === 0) {
      toast.error("No posts to export");
      return;
    }

    const csvContent = [
      ['Deal Title', 'Social Post', 'Tracked URL'].join(','),
      ...Object.entries(socialPosts).map(([dealId, post]) => {
        const deal = deals?.find(d => d.id === dealId);
        return [
          `"${deal?.title || 'Unknown'}"`,
          `"${post.text.replace(/"/g, '""')}"`,
          `"${post.url}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-posts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully!");
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AI Social Links Generator</h1>
                <p className="text-sm text-muted-foreground">
                  Generate engaging social media posts with tracked links
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generateBulkPosts}
                disabled={isGeneratingBulk || !deals || deals.length === 0}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGeneratingBulk ? "Generating..." : "Generate All"}
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                disabled={Object.keys(socialPosts).length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load deals. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : deals && deals.length > 0 ? (
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
                                Copy Text
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
      
      <Footer />
    </div>
  );
};

export default SocialLinksGenerator;
