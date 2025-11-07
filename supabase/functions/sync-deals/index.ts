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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting deals sync process...');

    // Fetch deals from external API
    const response = await fetch(DEALS_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    console.log(`Fetched ${apiResponse.count} total deals, ${apiResponse.products?.length || 0} products in response`);

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
      const getImageUrl = (url?: string, providedImage?: string): string => {
        // Only use providedImage if it's a valid URL (not empty/null)
        if (providedImage && providedImage.trim() && providedImage.startsWith('http')) {
          return providedImage;
        }
        
        if (!url) {
          return "/placeholder.svg";
        }
        
        // Extract ASIN from Amazon URL (format: /dp/ASIN or /gp/product/ASIN)
        const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        
        if (index < 2) {
          console.log(`URL: ${url}`);
          console.log(`ASIN Match: ${asinMatch ? asinMatch[1] : 'none'}`);
        }
        
        if (asinMatch && asinMatch[1]) {
          // Use our image proxy to bypass Amazon's hotlinking protection
          const amazonImageUrl = `https://m.media-amazon.com/images/I/${asinMatch[1]}.jpg`;
          const proxyUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(amazonImageUrl)}`;
          if (index < 2) {
            console.log(`Generated proxy URL: ${proxyUrl.substring(0, 100)}`);
          }
          return proxyUrl;
        }
        
        return "/placeholder.svg";
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
        image_url: getImageUrl(item.url, item.image),
        product_url: item.url || "",
        category: item.category || item.store || null,
        rating: item.rating ? parseFloat(String(item.rating)) : null,
        review_count: item.reviewCount || item.reviews || null,
        brand: item.brand || item.store || null,
        in_stock: item.inStock !== false,
        fetched_at: new Date().toISOString(),
      };
    });

    // Delete old deals (older than 1 day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .lt('fetched_at', oneDayAgo);

    if (deleteError) {
      console.error('Error deleting old deals:', deleteError);
    }

    // Upsert deals into database
    const { data, error } = await supabase
      .from('deals')
      .upsert(transformedDeals, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting deals:', error);
      throw error;
    }

    console.log(`Successfully synced ${transformedDeals.length} deals to database`);

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
