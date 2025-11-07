import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DealCard } from "@/components/DealCard";
import { TrackingSettings } from "@/components/TrackingSettings";
import { Deal } from "@/types/deal";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingDown } from "lucide-react";

const API_URL = "https://cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-east-1.on.aws/api/v1/deals";

const fetchDeals = async (): Promise<Deal[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch deals");
  }
  const data = await response.json();
  
  // Transform API response to Deal interface
  // Adjust this based on actual API structure
  return data.map((item: any, index: number) => ({
    id: item.id || `deal-${index}`,
    title: item.title || item.name || "Product",
    description: item.description,
    price: parseFloat(item.price || item.currentPrice || 0),
    originalPrice: item.originalPrice ? parseFloat(item.originalPrice) : undefined,
    discount: item.discount ? parseFloat(item.discount) : undefined,
    imageUrl: item.imageUrl || item.image || "/placeholder.svg",
    productUrl: item.productUrl || item.url || item.link || "",
    category: item.category,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    reviewCount: item.reviewCount || item.reviews,
    brand: item.brand,
    inStock: item.inStock !== false,
  }));
};

const Deals = () => {
  const [trackingCode, setTrackingCode] = useState(() => {
    return localStorage.getItem("amazonTrackingCode") || "your-tag-20";
  });

  const { data: deals, isLoading, error } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  useEffect(() => {
    localStorage.setItem("amazonTrackingCode", trackingCode);
  }, [trackingCode]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Amazon Deal Finder</h1>
              <p className="text-sm text-muted-foreground">
                Discover the hottest deals on Amazon
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
        ) : deals && deals.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{deals.length}</span> amazing deals
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal) => (
                <DealCard 
                  key={deal.id} 
                  deal={deal} 
                  trackingCode={trackingCode}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No deals available at the moment.</p>
          </div>
        )}
      </main>

      {/* Tracking Settings */}
      <TrackingSettings 
        trackingCode={trackingCode}
        onTrackingCodeChange={setTrackingCode}
      />
    </div>
  );
};

export default Deals;
