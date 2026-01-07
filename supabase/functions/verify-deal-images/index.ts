import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLACEHOLDER_PATTERNS = [
  "placeholder.svg",
  "via.placeholder.com",
  "No+Image",
  "No%20Image",
];

function isPlaceholderUrl(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function extractASIN(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function getAmazonImageUrls(asin: string): string[] {
  return [
    `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
    `https://m.media-amazon.com/images/I/${asin}._AC_SL1000_.jpg`,
    `https://m.media-amazon.com/images/I/${asin}._AC_SL500_.jpg`,
    `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
  ];
}

async function tryFetchImage(url: string, timeoutMs = 5000): Promise<{ ok: boolean; contentType?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageBot/1.0)" },
    });
    clearTimeout(timeout);
    
    if (!response.ok) return { ok: false };
    
    const contentType = response.headers.get("content-type") || "";
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    
    // Valid if it's an image and has reasonable size (> 1KB)
    if (contentType.startsWith("image/") && contentLength > 1000) {
      return { ok: true, contentType };
    }
    return { ok: false };
  } catch {
    clearTimeout(timeout);
    return { ok: false };
  }
}

async function scrapeImageFromPage(productUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(productUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try various image patterns
    const patterns = [
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
      /<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i,
      /data-old-hires="([^"]+)"/i,
      /data-a-dynamic-image="\{&quot;([^&]+)&quot;/i,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const imgUrl = match[1].replace(/&amp;/g, "&");
        if (imgUrl.startsWith("http") && !isPlaceholderUrl(imgUrl)) {
          return imgUrl;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Additional Amazon image URL patterns to try
function getExtendedAmazonImageUrls(asin: string): string[] {
  const prefixes = [
    `https://m.media-amazon.com/images/I/${asin}`,
    `https://images-na.ssl-images-amazon.com/images/I/${asin}`,
  ];
  const suffixes = [
    "._AC_SL1500_.jpg",
    "._AC_SL1200_.jpg",
    "._AC_SL1000_.jpg",
    "._AC_SL800_.jpg",
    "._AC_SL500_.jpg",
    "._AC_SX679_.jpg",
    "._AC_SX522_.jpg",
    ".jpg",
  ];
  
  const urls: string[] = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      urls.push(prefix + suffix);
    }
  }
  return urls;
}

async function verifyAndGetImageUrl(deal: { id: string; image_url: string | null; product_url: string; title: string }): Promise<string | null> {
  console.log(`[${deal.id}] Verifying image...`);
  
  // 1. Check existing image_url first
  if (deal.image_url && !isPlaceholderUrl(deal.image_url)) {
    const result = await tryFetchImage(deal.image_url);
    if (result.ok) {
      console.log(`[${deal.id}] ✓ Existing image URL works`);
      return deal.image_url;
    }
    console.log(`[${deal.id}] ✗ Existing image URL failed`);
  }
  
  // 2. Try Amazon CDN with extended patterns
  if (deal.product_url) {
    const asin = extractASIN(deal.product_url);
    if (asin) {
      console.log(`[${deal.id}] Trying ASIN: ${asin}`);
      const cdnUrls = getExtendedAmazonImageUrls(asin);
      
      // Try URLs in parallel batches for speed
      for (let i = 0; i < cdnUrls.length; i += 4) {
        const batch = cdnUrls.slice(i, i + 4);
        const results = await Promise.all(batch.map(url => tryFetchImage(url).then(r => ({ url, ...r }))));
        const working = results.find(r => r.ok);
        if (working) {
          console.log(`[${deal.id}] ✓ Found working CDN URL`);
          return working.url;
        }
      }
    }
    
    // 3. Try scraping the page as last resort
    console.log(`[${deal.id}] Trying page scrape...`);
    const scrapedUrl = await scrapeImageFromPage(deal.product_url);
    if (scrapedUrl) {
      const result = await tryFetchImage(scrapedUrl);
      if (result.ok) {
        console.log(`[${deal.id}] ✓ Scraped image works`);
        return scrapedUrl;
      }
    }
  }
  
  console.log(`[${deal.id}] ✗ No valid image found`);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for options
    let batchSize = 10;
    let maxRetries = 5;
    let specificDealId: string | null = null;
    
    try {
      const body = await req.json();
      batchSize = body.batchSize || 10;
      maxRetries = body.maxRetries || 5;
      specificDealId = body.dealId || null;
    } catch {
      // Use defaults
    }

    console.log(`Starting image verification. Batch: ${batchSize}, MaxRetries: ${maxRetries}`);

    // Build query for deals needing verification
    let query = supabase
      .from("deals")
      .select("id, image_url, product_url, title, image_retry_count")
      .eq("image_ready", false)
      .lt("image_retry_count", maxRetries)
      .order("image_last_checked", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (specificDealId) {
      query = supabase
        .from("deals")
        .select("id, image_url, product_url, title, image_retry_count")
        .eq("id", specificDealId);
    }

    const { data: deals, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching deals:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deals || deals.length === 0) {
      console.log("No deals need image verification");
      return new Response(
        JSON.stringify({ message: "No deals need verification", processed: 0, verified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${deals.length} deals`);

    let verified = 0;
    let failed = 0;
    const results: { id: string; status: string; imageUrl?: string }[] = [];

    for (const deal of deals) {
      const verifiedUrl = await verifyAndGetImageUrl(deal);
      const now = new Date().toISOString();

      if (verifiedUrl) {
        // Update deal as image_ready
        const { error: updateError } = await supabase
          .from("deals")
          .update({
            image_ready: true,
            verified_image_url: verifiedUrl,
            image_url: verifiedUrl,
            image_last_checked: now,
          })
          .eq("id", deal.id);

        if (updateError) {
          console.error(`Error updating deal ${deal.id}:`, updateError);
          results.push({ id: deal.id, status: "error" });
        } else {
          verified++;
          results.push({ id: deal.id, status: "verified", imageUrl: verifiedUrl });
          console.log(`✓ Deal ${deal.id} verified with image`);
        }
      } else {
        // Increment retry count
        const { error: updateError } = await supabase
          .from("deals")
          .update({
            image_retry_count: (deal.image_retry_count || 0) + 1,
            image_last_checked: now,
          })
          .eq("id", deal.id);

        if (updateError) {
          console.error(`Error updating retry count for ${deal.id}:`, updateError);
        }
        failed++;
        results.push({ id: deal.id, status: "retry" });
        console.log(`✗ Deal ${deal.id} needs retry (${(deal.image_retry_count || 0) + 1}/${maxRetries})`);
      }
    }

    console.log(`Verification complete. Verified: ${verified}, Need retry: ${failed}`);

    return new Response(
      JSON.stringify({
        message: "Image verification complete",
        processed: deals.length,
        verified,
        needRetry: failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
