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

const PLATFORMS = ["whatsapp", "facebook", "general"] as const;

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

// Generate an AI product image using Lovable AI
async function generateAIProductImage(title: string, category?: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not set, skipping AI image generation");
    return null;
  }

  try {
    console.log(`Generating AI image for: ${title.substring(0, 50)}...`);
    
    const prompt = `Create a clean, professional product photograph of: ${title}. 
${category ? `Product category: ${category}.` : ''}
Style: E-commerce product photo with pure white background, professional studio lighting, centered composition.
The product should look realistic and high-quality, suitable for an online shopping website.
Ultra high resolution, sharp focus, no text or watermarks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`AI image generation failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.error("Invalid AI image response");
      return null;
    }

    console.log("✓ AI image generated successfully");
    return imageUrl;
  } catch (error) {
    console.error("Error generating AI image:", error);
    return null;
  }
}

async function verifyAndGetImageUrl(deal: { id: string; image_url: string | null; product_url: string; title: string; category?: string | null }): Promise<string | null> {
  console.log(`[${deal.id}] Verifying image...`);
  
  // Priority 1: Check existing image URL
  if (deal.image_url && !isPlaceholderUrl(deal.image_url) && deal.image_url.startsWith("http")) {
    const result = await tryFetchImage(deal.image_url);
    if (result.ok) {
      console.log(`[${deal.id}] ✓ Existing image URL works`);
      return deal.image_url;
    }
    console.log(`[${deal.id}] ✗ Existing image URL failed`);
  }
  
  // Priority 2: Try Amazon CDN URLs if we have an ASIN
  if (deal.product_url && deal.product_url.startsWith("http")) {
    const asin = extractASIN(deal.product_url);
    if (asin) {
      console.log(`[${deal.id}] Trying ASIN: ${asin}`);
      const cdnUrls = getExtendedAmazonImageUrls(asin);
      
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
    
    // Priority 3: Try scraping the product page
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
  
  // Priority 4: Generate AI product image as fallback
  console.log(`[${deal.id}] Trying AI image generation...`);
  const aiImageUrl = await generateAIProductImage(deal.title, deal.category || undefined);
  if (aiImageUrl) {
    console.log(`[${deal.id}] ✓ AI image generated`);
    return aiImageUrl;
  }
  
  console.log(`[${deal.id}] ✗ No valid image found`);
  return null;
}

// Generate AI social post for a platform
async function generateSocialPost(
  supabaseUrl: string,
  anonKey: string,
  deal: { id: string; title: string; brand?: string; category?: string; price: number; original_price?: number; discount?: number },
  platform: string
): Promise<{ text: string; pageUrl: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not set, skipping AI post generation");
    return null;
  }

  const pageUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/deal/${deal.id}`;
  
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "N/A";
    return `$${Number(price).toFixed(2)}`;
  };

  let platformInstructions = "";
  if (platform === 'whatsapp') {
    platformInstructions = `
- Format for WhatsApp: use emojis liberally
- Use line breaks for readability
- Keep it conversational and personal
- Add urgency if there's a good discount
- End with the link on its own line: ${pageUrl}`;
  } else if (platform === 'facebook') {
    platformInstructions = `
- Format for Facebook: engaging and shareable
- Can be slightly longer (up to 300 characters)
- Use 2-3 relevant emojis
- Make it feel like a personal recommendation
- Encourage engagement (questions work well)
- End with: Check it out 👉 ${pageUrl}`;
  } else {
    platformInstructions = `
- Keep it under 280 characters
- Include relevant emojis
- End with "Check it out here: ${pageUrl}"`;
  }

  const prompt = `Create an engaging social media post for this product deal:

Product: ${deal.title}
Brand: ${deal.brand || "N/A"}
Category: ${deal.category || "N/A"}
Current Price: ${formatPrice(deal.price)}
${deal.original_price ? `Original Price: ${formatPrice(deal.original_price)}` : ""}
${deal.discount ? `Discount: ${Math.round(deal.discount)}% OFF` : ""}

Requirements:
- Make it exciting and attention-grabbing
- Highlight the savings if there's a discount
${platformInstructions}
- Do NOT include any hashtags
- Sound enthusiastic but not overly salesy`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a social media expert who creates engaging, concise posts that drive clicks. Be enthusiastic but authentic." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`AI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) return null;
    
    return { text, pageUrl };
  } catch (error) {
    console.error("Error generating social post:", error);
    return null;
  }
}

// Queue social posts for a verified deal
async function queueSocialPosts(
  supabase: any,
  supabaseUrl: string,
  anonKey: string,
  deal: { id: string; title: string; brand?: string | null; category?: string | null; price: number; original_price?: number | null; discount?: number | null }
): Promise<number> {
  let queued = 0;
  
  // Check if posts already exist for this deal
  const { data: existing } = await supabase
    .from("scheduled_posts")
    .select("platform")
    .eq("deal_id", deal.id);
  
  const existingPlatforms = new Set((existing || []).map((p: any) => p.platform));
  
  for (const platform of PLATFORMS) {
    if (existingPlatforms.has(platform)) {
      console.log(`[${deal.id}] Post already queued for ${platform}`);
      continue;
    }
    
    const result = await generateSocialPost(supabaseUrl, anonKey, {
      id: deal.id,
      title: deal.title,
      brand: deal.brand || undefined,
      category: deal.category || undefined,
      price: deal.price,
      original_price: deal.original_price || undefined,
      discount: deal.discount || undefined,
    }, platform);
    
    if (result) {
      const { error } = await supabase
        .from("scheduled_posts")
        .insert({
          deal_id: deal.id,
          platform,
          generated_text: result.text,
          page_url: result.pageUrl,
          status: "pending",
        });
      
      if (!error) {
        queued++;
        console.log(`[${deal.id}] ✓ Queued ${platform} post`);
      } else {
        console.error(`[${deal.id}] Error queueing ${platform} post:`, error);
      }
    }
  }
  
  return queued;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let batchSize = 10;
    let maxRetries = 5;
    let specificDealId: string | null = null;
    let autoQueuePosts = true;
    
    try {
      const body = await req.json();
      batchSize = body.batchSize || 10;
      maxRetries = body.maxRetries || 5;
      specificDealId = body.dealId || null;
      autoQueuePosts = body.autoQueuePosts !== false;
    } catch {
      // Use defaults
    }

    console.log(`Starting image verification. Batch: ${batchSize}, MaxRetries: ${maxRetries}, AutoQueue: ${autoQueuePosts}`);

    let query = supabase
      .from("deals")
      .select("id, image_url, product_url, title, image_retry_count, brand, category, price, original_price, discount")
      .eq("image_ready", false)
      .lt("image_retry_count", maxRetries)
      .order("image_last_checked", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (specificDealId) {
      query = supabase
        .from("deals")
        .select("id, image_url, product_url, title, image_retry_count, brand, category, price, original_price, discount")
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
        JSON.stringify({ message: "No deals need verification", processed: 0, verified: 0, postsQueued: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${deals.length} deals`);

    let verified = 0;
    let failed = 0;
    let postsQueued = 0;
    const results: { id: string; status: string; imageUrl?: string; postsQueued?: number }[] = [];

    for (const deal of deals) {
      const verifiedUrl = await verifyAndGetImageUrl(deal);
      const now = new Date().toISOString();

      if (verifiedUrl) {
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
          
          // Auto-queue social posts for verified deals
          let dealPostsQueued = 0;
          if (autoQueuePosts) {
            dealPostsQueued = await queueSocialPosts(supabase, supabaseUrl, anonKey, deal);
            postsQueued += dealPostsQueued;
          }
          
          results.push({ id: deal.id, status: "verified", imageUrl: verifiedUrl, postsQueued: dealPostsQueued });
          console.log(`✓ Deal ${deal.id} verified with image, ${dealPostsQueued} posts queued`);
        }
      } else {
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

    console.log(`Verification complete. Verified: ${verified}, Need retry: ${failed}, Posts queued: ${postsQueued}`);

    return new Response(
      JSON.stringify({
        message: "Image verification complete",
        processed: deals.length,
        verified,
        needRetry: failed,
        postsQueued,
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
