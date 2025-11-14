import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { TrackingSettings } from "@/components/TrackingSettings";
import { FilterBar, Filters } from "@/components/FilterBar";
import { Deal } from "@/types/deal";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/relay-station-logo-new.png";

const fetchDeals = async (): Promise<Deal[]> => {
  // Fetch deals from our database cache
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('fetched_at', { ascending: false });

  if (error) {
    console.error('Error fetching deals:', error);
    throw error;
  }

  // Transform database response to Deal interface
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
};

const Deals = () => {
  const [trackingCode, setTrackingCode] = useState(() => {
    return localStorage.getItem("affiliateTrackingCode") || "your-tag-20";
  });

  const [filters, setFilters] = useState<Filters>(() => {
    const saved = localStorage.getItem("dealFilters");
    return saved ? JSON.parse(saved) : {
      search: "",
      category: "all",
      priceMin: "",
      priceMax: "",
      discountMin: "",
      sortBy: "newest",
    };
  });

  const { data: deals, isLoading, error, refetch } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
    refetchInterval: 60000, // Refetch every minute to check for new cached data
  });

  const syncDeals = async () => {
    try {
      toast.loading("Refreshing deals from source...");
      const { error } = await supabase.functions.invoke('sync-deals');
      
      if (error) throw error;
      
      // Refetch the deals from database after sync
      await refetch();
      toast.success("Deals refreshed successfully!");
    } catch (error) {
      console.error('Error syncing deals:', error);
      toast.error("Failed to refresh deals");
    }
  };

  useEffect(() => {
    localStorage.setItem("affiliateTrackingCode", trackingCode);
  }, [trackingCode]);

  useEffect(() => {
    localStorage.setItem("dealFilters", JSON.stringify(filters));
  }, [filters]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!deals) return [];
    const cats = new Set(deals.map(d => d.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [deals]);

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    if (!deals) return [];

    let filtered = [...deals];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(searchLower) ||
        deal.brand?.toLowerCase().includes(searchLower) ||
        deal.description?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(deal => deal.category === filters.category);
    }

    // Price range filter
    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin);
      filtered = filtered.filter(deal => deal.price >= min);
    }
    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax);
      filtered = filtered.filter(deal => deal.price <= max);
    }

    // Discount filter
    if (filters.discountMin) {
      const minDiscount = parseFloat(filters.discountMin);
      filtered = filtered.filter(deal => {
        if (!deal.originalPrice) return false;
        const discount = ((deal.originalPrice - deal.price) / deal.originalPrice) * 100;
        return discount >= minDiscount;
      });
    }

    // Sort deals
    switch (filters.sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "discount":
        filtered.sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
      default:
        // Keep original order (assuming API returns newest first)
        break;
    }

    return filtered;
  }, [deals, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Relay Station" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">Relay Station</h1>
                <p className="text-sm text-muted-foreground">
                  Discover the hottest deals online
                </p>
              </div>
            </div>
            <Button onClick={syncDeals} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Deals
            </Button>
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
          <>
            <div className="mb-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full md:w-[400px]" />
            </div>
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
          </>
        ) : deals && deals.length > 0 ? (
          <>
            <div className="mb-6">
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                categories={categories}
                totalResults={filteredDeals.length}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDeals.map((deal) => (
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
      
      <Footer />
    </div>
  );
};

export default Deals;
