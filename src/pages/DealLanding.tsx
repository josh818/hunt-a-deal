import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { Deal } from "@/types/deal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Star, ArrowLeft } from "lucide-react";

const fetchDeal = async (id: string): Promise<Deal | null> => {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  // Transform database fields to match Deal interface
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    price: data.price,
    originalPrice: data.original_price,
    discount: data.discount,
    imageUrl: data.image_url,
    productUrl: data.product_url,
    category: data.category,
    rating: data.rating,
    reviewCount: data.review_count,
    brand: data.brand,
    inStock: data.in_stock,
    couponCode: data.coupon_code,
    fetchedAt: data.fetched_at,
  };
};

const DealLanding = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trackingCode = localStorage.getItem("amazonTrackingCode") || "dealstream0f-20";

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Deal Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The deal you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/deals")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Button>
        </Card>
      </div>
    );
  }

  const savings = deal.originalPrice
    ? ((deal.originalPrice - deal.price) / deal.originalPrice * 100).toFixed(0)
    : deal.discount;

  const getAmazonUrl = () => {
    const url = new URL(deal.productUrl);
    url.searchParams.set("tag", trackingCode);
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/deals")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deals
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes("placeholder.svg")) {
                  target.src = "/placeholder.svg";
                }
              }}
            />
            {savings && (
              <Badge className="absolute right-4 top-4 bg-[hsl(var(--deal-badge))] text-[hsl(var(--deal-badge-foreground))] text-lg px-4 py-2">
                {savings}% OFF
              </Badge>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {deal.brand && (
              <p className="text-lg font-medium text-muted-foreground">
                {deal.brand}
              </p>
            )}

            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              {deal.title}
            </h1>

            {deal.description && (
              <p className="text-muted-foreground text-lg">
                {deal.description}
              </p>
            )}

            {deal.rating && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="text-lg font-medium">{deal.rating}</span>
                </div>
                {deal.reviewCount && (
                  <span className="text-muted-foreground">
                    ({deal.reviewCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-[hsl(var(--price-highlight))]">
                  ${deal.price.toFixed(2)}
                </span>
                {deal.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${deal.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {savings && deal.originalPrice && (
                <div className="rounded-lg bg-[hsl(var(--savings-bg))] px-4 py-3">
                  <p className="text-lg font-semibold text-[hsl(var(--savings-text))]">
                    You Save: ${(deal.originalPrice - deal.price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {deal.category && (
              <div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {deal.category}
                </Badge>
              </div>
            )}

            {deal.inStock !== false ? (
              <Button
                size="lg"
                className="w-full text-lg py-6"
                asChild
              >
                <a
                  href={getAmazonUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Deal on Amazon
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            ) : (
              <Button size="lg" className="w-full text-lg py-6" disabled>
                Out of Stock
              </Button>
          )}
        </div>
      </div>

      {/* Price History Chart */}
      <div className="mt-12">
        <PriceHistoryChart dealId={id!} />
      </div>
    </div>
      
    <Footer />
  </div>
);
};

export default DealLanding;
