import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle, AlertCircle, Sparkles, Download, MessageCircle, Facebook, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Deal } from "@/types/deal";
import { replaceTrackingCode, getDefaultTrackingCode } from "@/utils/trackingCode";
import { getDealImageSrc, prefetchImage } from "@/utils/dealImages";

const fetchDeals = async (): Promise<Deal[]> => {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('fetched_at', { ascending: false })
    .limit(30);

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
  whatsappText: string;
  facebookText: string;
  url: string;
  isGenerating: boolean;
  copiedField: string | null;
}

const Socials = () => {
  const [socialPosts, setSocialPosts] = useState<Record<string, SocialPost>>({});
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "facebook">("whatsapp");
  
  const { data: deals, isLoading, error } = useQuery({
    queryKey: ["deals-socials"],
    queryFn: fetchDeals,
  });

  const generateSocialPost = async (deal: Deal) => {
    const canLoadImage = await prefetchImage(getDealImageSrc(deal, { cacheBust: true }));
    if (!canLoadImage) {
      toast.error("Image not ready yet — holding this post until we have one.");
      return;
    }

    setSocialPosts(prev => ({
      ...prev,
      [deal.id]: {
        dealId: deal.id,
        whatsappText: '',
        facebookText: '',
        url: '',
        isGenerating: true,
        copiedField: null,
      }
    }));

    try {
      const trackedUrl = replaceTrackingCode(deal.productUrl, getDefaultTrackingCode());
      const pageUrl = `${window.location.origin}/deal/${deal.id}`;

      // Generate WhatsApp post
      const whatsappResponse = await supabase.functions.invoke('generate-social-post', {
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
          platform: 'whatsapp',
        }
      });

      if (whatsappResponse.error) throw whatsappResponse.error;

      // Generate Facebook post
      const facebookResponse = await supabase.functions.invoke('generate-social-post', {
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
          platform: 'facebook',
        }
      });

      if (facebookResponse.error) throw facebookResponse.error;

      setSocialPosts(prev => ({
        ...prev,
        [deal.id]: {
          dealId: deal.id,
          whatsappText: whatsappResponse.data.text,
          facebookText: facebookResponse.data.text,
          url: trackedUrl,
          isGenerating: false,
          copiedField: null,
        }
      }));

      toast.success("Social posts generated!");
    } catch (error: any) {
      console.error('Error generating social post:', error);
      
      // Handle rate limit or credits errors
      if (error?.message?.includes("Rate limit") || error?.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error?.message?.includes("credits") || error?.status === 402) {
        toast.error("AI credits depleted. Please add credits to continue.");
      } else {
        toast.error("Failed to generate social post");
      }
      
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
      if (socialPosts[deal.id]) continue;

      // Only generate posts for deals that can actually load an image.
      const canLoadImage = await prefetchImage(getDealImageSrc(deal, { cacheBust: true }));
      if (!canLoadImage) continue;
      
      try {
        await generateSocialPost(deal);
        generated++;
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error in bulk generation:', error);
        break;
      }
    }

    setIsGeneratingBulk(false);
    toast.success(`Generated posts for ${generated} deals!`);
  };

  const exportToCSV = () => {
    if (Object.keys(socialPosts).length === 0) {
      toast.error("No posts to export");
      return;
    }

    const csvContent = [
      ['Deal Title', 'WhatsApp Post', 'Facebook Post', 'Tracked URL'].join(','),
      ...Object.entries(socialPosts).map(([dealId, post]) => {
        const deal = deals?.find(d => d.id === dealId);
        return [
          `"${deal?.title || 'Unknown'}"`,
          `"${post.whatsappText.replace(/"/g, '""')}"`,
          `"${post.facebookText.replace(/"/g, '""')}"`,
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
    
    toast.success("CSV exported!");
  };

  const copyToClipboard = (dealId: string, text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setSocialPosts(prev => ({
      ...prev,
      [dealId]: {
        ...prev[dealId],
        copiedField: field,
      }
    }));
    toast.success("Copied to clipboard!");
    
    setTimeout(() => {
      setSocialPosts(prev => ({
        ...prev,
        [dealId]: {
          ...prev[dealId],
          copiedField: null,
        }
      }));
    }, 2000);
  };

  const openWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const openFacebook = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`, '_blank');
  };

  const generatedCount = Object.values(socialPosts).filter(p => !p.isGenerating).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Social Media Posts</h1>
                <p className="text-sm text-muted-foreground">
                  AI-generated WhatsApp & Facebook posts ready to share
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
                disabled={generatedCount === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {generatedCount > 0 && (
            <div className="mt-4 flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {generatedCount} posts ready
              </Badge>
            </div>
          )}
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "whatsapp" | "facebook")} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="facebook" className="gap-2">
              <Facebook className="h-4 w-4" />
              Facebook
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => {
              const post = socialPosts[deal.id];
              const discount = deal.originalPrice 
                ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
                : null;
              const currentText = activeTab === "whatsapp" ? post?.whatsappText : post?.facebookText;

              return (
                <Card key={deal.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {deal.imageUrl && (
                      <img 
                        src={getDealImageSrc(deal)}
                        alt={deal.title}
                        loading="lazy"
                        className="h-16 w-16 object-contain rounded-md bg-muted"
                      />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium line-clamp-2">{deal.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <span className="font-semibold text-foreground">${deal.price.toFixed(2)}</span>
                          {discount && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {discount}% OFF
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {!post ? (
                      <Button 
                        onClick={() => generateSocialPost(deal)}
                        className="gap-2 mt-auto"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Posts
                      </Button>
                    ) : post.isGenerating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="bg-muted p-3 rounded-lg flex-1">
                          <p className="text-sm whitespace-pre-wrap line-clamp-4">{currentText}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => copyToClipboard(deal.id, currentText || '', activeTab)}
                            variant="outline"
                            size="sm"
                            className="gap-1.5 flex-1"
                          >
                            {post.copiedField === activeTab ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </>
                            )}
                          </Button>
                          {activeTab === "whatsapp" ? (
                            <Button
                              onClick={() => openWhatsApp(post.whatsappText)}
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Share
                            </Button>
                          ) : (
                            <Button
                              onClick={() => openFacebook(post.facebookText)}
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Share
                            </Button>
                          )}
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
            <p className="text-muted-foreground">No deals available. Try refreshing deals from the admin panel.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Socials;
