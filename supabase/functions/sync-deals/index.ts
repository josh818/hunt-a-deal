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
  image_url?: string;
  description?: string;
  category?: string;
  rating?: string | number;
  reviewCount?: number;
  reviews?: number;
  brand?: string;
  inStock?: boolean;
  coupon_code?: string;
  couponCode?: string;
  timestamp?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - either via secret header (for cron jobs) or via JWT (for admin users)
    const authHeader = req.headers.get('x-sync-secret');
    const expectedSecret = Deno.env.get('SYNC_DEALS_SECRET');
    const authorizationHeader = req.headers.get('Authorization');
    
    let isAuthenticated = false;
    
    // Check secret header first (for cron jobs)
    if (authHeader && expectedSecret && authHeader === expectedSecret) {
      isAuthenticated = true;
      console.log('Authenticated via secret header');
    }
    
    // Check JWT token for admin users - validate with Supabase
    if (!isAuthenticated && authorizationHeader?.startsWith('Bearer ')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authorizationHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user && !error) {
        // Check if user is admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (roles) {
          isAuthenticated = true;
          console.log('Authenticated via JWT - admin user:', user.email);
        }
      }
    }
    
    if (!isAuthenticated) {
      console.error('Invalid or missing authentication');
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

    // Generate stable deal IDs based on product identifiers (not timestamps!)
    function generateStableDealId(item: DealResponse, index: number): string {
      // Try to extract Amazon product ID from URL
      if (item.url) {
        const amazonMatch = item.url.match(/\/dp\/([A-Z0-9]+)/i);
        if (amazonMatch) return `amazon-${amazonMatch[1]}`;
        
        const gp = item.url.match(/\/gp\/product\/([A-Z0-9]+)/i);
        if (gp) return `amazon-${gp[1]}`;
      }
      
      // Try Slickdeals URL
      if (item.slickdeals_url) {
        const sdMatch = item.slickdeals_url.match(/\/f\/(\d+)/);
        if (sdMatch) return `slickdeals-${sdMatch[1]}`;
      }
      
      // Fallback: create stable hash from title + price
      if (item.title) {
        const normalized = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const priceStr = String(item.price || '').replace(/[^0-9]/g, '');
        return `deal-${normalized.substring(0, 40)}-${priceStr}`.substring(0, 50);
      }
      
      // Last resort
      return `deal-fallback-${index}`;
    }

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

      // Get image URL - prioritize provided image, fall back to Slickdeals image pattern
      const getImageUrl = (item: DealResponse): string => {
        // If API provides a direct image URL (Slickdeals CDN), use it
        if (item.image_url && item.image_url.trim() && item.image_url.startsWith('http')) {
          return item.image_url;
        }
        
        // Check for image field
        if (item.image && item.image.trim() && item.image.startsWith('http')) {
          return item.image;
        }
        
        // Fallback to placeholder
        return "/placeholder.svg";
      };

      let price = parsePrice(item.price);
      let originalPrice = parsePrice(item.original_price);
      
      // Log raw prices for debugging
      if (index < 3) {
        console.log(`Deal ${index} - Raw price: ${item.price}, Raw original: ${item.original_price}`);
        console.log(`Deal ${index} - Parsed price: ${price}, Parsed original: ${originalPrice}`);
      }
      
      // Fix swapped prices - if current price is higher than original, swap them
      if (originalPrice > 0 && price > originalPrice) {
        console.log(`Swapping prices for: ${item.title} - Price: ${price} -> ${originalPrice}, Original: ${originalPrice} -> ${price}`);
        [price, originalPrice] = [originalPrice, price];
      }
      
      // Price sanity checks - reject deals with unreasonable prices
      if (price <= 0 || price > 100000) {
        console.log(`Skipping deal with invalid price: ${item.title} - Price: ${price}`);
        return null;
      }
      
      // If original price exists, ensure it's reasonable and greater than current price
      if (originalPrice > 0 && (originalPrice <= price || originalPrice > 100000)) {
        console.log(`Resetting invalid original price for: ${item.title} - Original: ${originalPrice}, keeping only price: ${price}`);
        originalPrice = 0;
      }
      
      const discount = originalPrice > 0 && price > 0 
        ? ((originalPrice - price) / originalPrice * 100) 
        : null;

      // Parse posted timestamp (e.g., "Nov 11, 2025 04:57 PM")
      const parsePostedAt = (timestamp?: string): string | null => {
        if (!timestamp) return null;
        try {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
          return null;
        }
      };

      // Extract category from title using keyword matching
      const extractCategory = (title?: string): string => {
        if (!title) return "Other";
        const titleLower = title.toLowerCase();
        
        // Category keyword mappings
        const categories: Record<string, string[]> = {
          "Electronics": ["laptop", "computer", "tablet", "phone", "headphone", "speaker", "camera", "monitor", "keyboard", "mouse", "charger", "cable", "usb", "wireless", "bluetooth", "gaming", "console", "controller", "tv", "television", "audio", "video", "hdmi", "adapter", "power bank", "dash cam", "dumbbell", "switch"],
          "Home & Kitchen": ["kitchen", "cookware", "appliance", "blender", "mixer", "coffee", "toaster", "microwave", "vacuum", "cleaning", "storage", "organizer", "furniture", "chair", "table", "desk", "bed", "mattress", "pillow", "blanket", "towel", "curtain", "lamp", "light", "fan", "heater", "air purifier", "dehumidifier", "humidifier", "wok", "pan", "pot", "dishwasher", "detergent", "pods", "bench", "cubes", "foldable"],
          "Beauty & Personal Care": ["beauty", "skincare", "makeup", "cosmetic", "shampoo", "conditioner", "lotion", "cream", "serum", "perfume", "cologne", "razor", "brush", "hair", "nail", "toothbrush", "toothpaste", "probiotic", "supplement", "vitamin", "sonicare"],
          "Fashion": ["shirt", "pants", "dress", "jacket", "coat", "shoe", "sneaker", "boot", "hat", "cap", "bag", "purse", "wallet", "watch", "jewelry", "sunglasses", "belt", "sock", "underwear", "t-shirt", "crewneck", "women's", "men's"],
          "Toys & Games": ["toy", "game", "puzzle", "lego", "doll", "action figure", "board game", "card game", "remote control", "rc", "kids", "children", "baby", "tablet", "doodle", "kit"],
          "Books & Media": ["book", "novel", "textbook", "magazine", "dvd", "blu-ray", "cd", "vinyl", "movie", "film", "4k ultra", "edition"],
          "Sports & Outdoors": ["sports", "fitness", "exercise", "yoga", "camping", "hiking", "bicycle", "bike", "golf", "tennis", "basketball", "football", "soccer", "swimming", "outdoor", "garden", "patio", "grill", "bbq", "propane"],
          "Pet Supplies": ["pet", "dog", "cat", "fish", "bird", "aquarium", "leash", "collar", "food", "treat", "toy"],
          "Office Supplies": ["office", "paper", "pen", "pencil", "stapler", "tape", "folder", "binder", "notebook", "printer", "ink", "packaging", "scotch", "heavy duty"],
          "Health & Wellness": ["health", "medical", "first aid", "thermometer", "blood pressure", "massage", "therapy", "probiotic", "supplement"],
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
          if (keywords.some(keyword => titleLower.includes(keyword))) {
            return category;
          }
        }
        return "Other";
      };

      return {
        id: generateStableDealId(item, index),
        title: item.title || "Product",
        description: item.description || null,
        price: price,
        image_url: getImageUrl(item),
        original_price: originalPrice > 0 ? originalPrice : null,
        discount: discount,
        product_url: item.url || "",
        category: extractCategory(item.title),
        rating: item.rating ? parseFloat(String(item.rating)) : null,
        review_count: item.reviewCount || item.reviews || null,
        brand: item.brand || null,
        in_stock: item.inStock !== false,
        coupon_code: item.coupon_code || item.couponCode || null,
        posted_at: parsePostedAt(item.timestamp),
        fetched_at: new Date().toISOString(),
      };
    }).filter(deal => deal !== null);

    // Deduplicate deals by ID (keep first occurrence) to prevent upsert conflicts
    const seenIds = new Set<string>();
    const uniqueDeals = transformedDeals.filter((deal: any) => {
      if (seenIds.has(deal.id)) {
        console.log(`Skipping duplicate deal ID: ${deal.id}`);
        return false;
      }
      seenIds.add(deal.id);
      return true;
    });

    console.log(`Deduped from ${transformedDeals.length} to ${uniqueDeals.length} unique deals`);

    // Upsert deals into database first
    const { data, error } = await supabase
      .from('deals')
      .upsert(uniqueDeals, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting deals:', error);
      throw error;
    }

    console.log(`Successfully synced ${uniqueDeals.length} deals to database`);

    // Track price changes for price history
    for (const deal of uniqueDeals) {
      // Get existing deal to check if price changed
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('price, original_price')
        .eq('id', deal.id)
        .single();

      // Only record price history if deal exists and price changed, or if it's new
      if (!existingDeal || 
          existingDeal.price !== deal.price || 
          existingDeal.original_price !== deal.original_price) {
        
        const { error: historyError } = await supabase
          .from('deal_price_history')
          .insert({
            deal_id: deal.id,
            price: deal.price,
            original_price: deal.original_price,
            discount: deal.discount,
            recorded_at: deal.fetched_at,
          });

        if (historyError) {
          console.error(`Error recording price history for deal ${deal.id}:`, historyError);
        }
      }
    }

    console.log(`Price history tracking complete`);

    // Keep deals for 4 days, with minimum of 50 most recent deals
    // Delete deals older than 4 days, but always keep at least 50
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    
    const { data: allDeals, error: fetchError } = await supabase
      .from('deals')
      .select('id, fetched_at')
      .order('fetched_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching deals for cleanup:', fetchError);
    } else if (allDeals && allDeals.length > 50) {
      // Keep at least 50 deals, but also delete any older than 4 days beyond that
      const dealsToKeep = allDeals.slice(0, 50);
      const potentialDeletes = allDeals.slice(50);
      
      // From the remaining, delete those older than 4 days
      const dealsToDelete = potentialDeletes.filter(d => {
        const dealDate = new Date(d.fetched_at);
        return dealDate < fourDaysAgo;
      }).map(d => d.id);
      
      if (dealsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('deals')
          .delete()
          .in('id', dealsToDelete);

        if (deleteError) {
          console.error('Error deleting old deals:', deleteError);
        } else {
          console.log(`Cleaned up ${dealsToDelete.length} old deals (>4 days), keeping ${allDeals.length - dealsToDelete.length} deals`);
        }
      } else {
        console.log(`No deals older than 4 days to clean up. Total deals: ${allDeals.length}`);
      }
    } else {
      console.log(`Keeping all ${allDeals?.length || 0} deals (under 50 minimum threshold)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${uniqueDeals.length} deals`,
        count: uniqueDeals.length,
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
