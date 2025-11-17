import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { TrackingSettings } from "@/components/TrackingSettings";
import { FilterBar, Filters } from "@/components/FilterBar";
import { Deal } from "@/types/deal";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
    couponCode: item.coupon_code,
    fetchedAt: item.fetched_at,
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

  const { data: deals, isLoading, error } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
    refetchInterval: 60000, // Refetch every minute to check for new cached data
  });

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
      <Helmet>
        <title>Latest Deals - Relay Station | Curated Affiliate Offers</title>
        <meta name="description" content={`Browse ${filteredDeals.length} curated deals with exclusive discounts. Find the best offers on electronics, home goods, and more.`} />
        <meta property="og:title" content="Latest Deals - Relay Station" />
        <meta property="og:description" content={`${filteredDeals.length} exclusive deals updated daily`} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load deals. This could be due to a network issue or server maintenance. Please refresh the page or try again in a few minutes.
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
