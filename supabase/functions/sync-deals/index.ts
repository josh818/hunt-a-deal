import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEALS_API_URL = "https://cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-east-1.on.aws/api/v1/deals";

interface APIResponse {
  count: number;
  products: DealResponse[];
}

interface DealResponse {
  original_price?: string;
  price?: string;
  shipping_info?: string | string[];
  slickdeals_url?: string;
  store?: string;
  title?: string;
  url?: string;
  image?: string;
  description?: string;
  category?: string;
  rating?: string | number;
  reviewCount?: number;
  reviews?: number;
  brand?: string;
  inStock?: boolean;
  coupon_code?: string;
  couponCode?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify secret for authentication
    const authHeader = req.headers.get('x-sync-secret');
    const expectedSecret = Deno.env.get('SYNC_DEALS_SECRET');
    
    if (!expectedSecret) {
      console.error('SYNC_DEALS_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (authHeader !== expectedSecret) {
      console.error('Invalid or missing authentication secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting deals sync process...');

    // Fetch deals from external API
    const response = await fetch(DEALS_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    console.log(`Fetched ${apiResponse.count} total deals, ${apiResponse.products?.length || 0} products in response`);
    
    // Log first product to see all available fields
    if (apiResponse.products && apiResponse.products.length > 0) {
      console.log('Sample product fields:', Object.keys(apiResponse.products[0]));
      console.log('Sample product data:', JSON.stringify(apiResponse.products[0], null, 2));
    }

    if (!apiResponse.products || !Array.isArray(apiResponse.products)) {
      console.error('Invalid API response - missing products array:', apiResponse);
      throw new Error('Invalid API response format - expected products array');
    }

    const rawDeals = apiResponse.products;


    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Transform API response to match our database schema
    const transformedDeals = rawDeals.map((item: DealResponse, index: number) => {
      // Parse price strings (remove $ and convert to number)
      const parsePrice = (priceStr?: string | number): number => {
        if (!priceStr) return 0;
        if (typeof priceStr === 'number') return priceStr;
        const str = String(priceStr);
        const cleaned = str.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
      };

      // Extract ASIN from Amazon URL and build image URL through proxy
      const getImageUrl = (url?: string, providedImage?: string, title?: string): string => {
        // Only use providedImage if it's a valid URL (not empty/null)
        if (providedImage && providedImage.trim() && providedImage.startsWith('http')) {
          return providedImage;
        }
        
        if (!url) {
          return "/placeholder.svg";
        }
        
        // Use image proxy to scrape the actual image from the Amazon product page
        // Include title for AI fallback generation
        const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
        return `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}${titleParam}`;
      };

      const price = parsePrice(item.price);
      const originalPrice = parsePrice(item.original_price);
      const discount = originalPrice > 0 && price > 0 
        ? ((originalPrice - price) / originalPrice * 100) 
        : null;

      return {
        id: `deal-${Date.now()}-${index}`,
        title: item.title || "Product",
        description: item.description || null,
        price: price,
        original_price: originalPrice > 0 ? originalPrice : null,
        discount: discount,
        image_url: getImageUrl(item.url, item.image, item.title),
        product_url: item.url || "",
        category: item.category || item.store || null,
        rating: item.rating ? parseFloat(String(item.rating)) : null,
        review_count: item.reviewCount || item.reviews || null,
        brand: item.brand || item.store || null,
        in_stock: item.inStock !== false,
        coupon_code: item.coupon_code || item.couponCode || null,
        fetched_at: new Date().toISOString(),
      };
    });

    // Upsert deals into database first
    const { data, error } = await supabase
      .from('deals')
      .upsert(transformedDeals, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting deals:', error);
      throw error;
    }

    console.log(`Successfully synced ${transformedDeals.length} deals to database`);

    // Keep only the 100 most recent deals by fetched_at
    // First, get all deal IDs ordered by fetched_at descending
    const { data: allDeals, error: fetchError } = await supabase
      .from('deals')
      .select('id, fetched_at')
      .order('fetched_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching deals for cleanup:', fetchError);
    } else if (allDeals && allDeals.length > 100) {
      // Get IDs of deals beyond the first 100
      const dealsToDelete = allDeals.slice(100).map(d => d.id);
      
      const { error: deleteError } = await supabase
        .from('deals')
        .delete()
        .in('id', dealsToDelete);

      if (deleteError) {
        console.error('Error deleting old deals:', deleteError);
      } else {
        console.log(`Cleaned up ${dealsToDelete.length} old deals, keeping the 100 most recent`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${transformedDeals.length} deals`,
        count: transformedDeals.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-deals function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
