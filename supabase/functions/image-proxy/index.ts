const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter for AI generation (resets on function restart)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Remove timestamps older than the window
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  // Add current timestamp
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  
  return true;
}

// Extract ASIN from Amazon URL
function extractASIN(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    
    // Common Amazon URL patterns for ASIN
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,           // /dp/ASIN
      /\/gp\/product\/([A-Z0-9]{10})/i,  // /gp/product/ASIN
      /\/product-reviews\/([A-Z0-9]{10})/i, // /product-reviews/ASIN
      /\/d\/([A-Z0-9]{10})/i,            // /d/ASIN (short URL)
    ];
    
    for (const pattern of patterns) {
      const match = pathname.match(pattern);
      if (match && match[1]) {
        console.log('Extracted ASIN:', match[1]);
        return match[1];
      }
    }
    
    console.log('No ASIN found in URL:', pathname);
    return null;
  } catch (error) {
    console.error('Error extracting ASIN:', error);
    return null;
  }
}

// Construct direct Amazon image URLs using CDN patterns
function getAmazonImageUrls(asin: string): string[] {
  const imageUrls = [
    // Primary Amazon CDN with various sizes
    `https://images-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
    `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
    `https://images-amazon.com/images/I/${asin}._AC_SL1000_.jpg`,
    `https://m.media-amazon.com/images/I/${asin}._AC_SY1000_.jpg`,
    `https://images-amazon.com/images/I/${asin}._AC_UL1500_.jpg`,
    
    // Alternative formats
    `https://images-amazon.com/images/I/${asin}.jpg`,
    `https://m.media-amazon.com/images/I/${asin}.jpg`,
  ];
  
  console.log('Generated', imageUrls.length, 'CDN URL patterns for ASIN:', asin);
  return imageUrls;
}

// Try fetching image from multiple CDN URLs
async function fetchAmazonImage(asin: string): Promise<Response | null> {
  const imageUrls = getAmazonImageUrls(asin);
  
  for (const imageUrl of imageUrls) {
    try {
      console.log('Attempting to fetch:', imageUrl);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.amazon.com/',
        },
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          console.log('Successfully fetched image from:', imageUrl);
          return response;
        }
        console.log('Response not an image, trying next URL');
      } else {
        console.log('Failed to fetch (status:', response.status, '), trying next URL');
      }
    } catch (error) {
      console.log('Error fetching from', imageUrl, ':', error);
      continue;
    }
  }
  
  console.log('All CDN URLs failed for ASIN:', asin);
  return null;
}

// Fallback: scrape image from product page HTML
async function scrapeImageFromPage(productUrl: string): Promise<string | null> {
  try {
    console.log('Attempting to scrape image from product page');
    
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch product page:', response.status);
      return null;
    }
    
    const html = await response.text();
    
    // Try various regex patterns to extract image URLs
    const patterns = [
      /"largeImage":"(https:\/\/[^"]+)"/,
      /"hiRes":"(https:\/\/[^"]+)"/,
      /data-old-hires="(https:\/\/[^"]+)"/,
      /data-a-dynamic-image="[^"]*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /"large":"(https:\/\/[^"]+)"/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Clean up the URL (remove escape characters)
        const imageUrl = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
        console.log('Extracted image URL from HTML:', imageUrl);
        return imageUrl;
      }
    }
    
    console.error('Could not extract image URL from product page');
    return null;
  } catch (error) {
    console.error('Error scraping product page:', error);
    return null;
  }
}

// Generate AI image using Lovable AI as ultimate fallback
async function generateAIProductImage(title: string, ip: string): Promise<ArrayBuffer | null> {
  try {
    // Check rate limit for AI generation
    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for AI generation, IP: ${ip}`);
      return null;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, skipping AI generation');
      return null;
    }

    // Validate and sanitize title
    if (!title || title.length > 200) {
      console.warn('Invalid or too long title for AI generation');
      return null;
    }

    console.log('Generating AI product image for:', title.substring(0, 50));
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: `Generate a professional, clean product image for: ${title}. Make it look like a high-quality e-commerce product photo with white or light background.`
        }],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      console.error('AI image generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl || !imageUrl.startsWith('data:image')) {
      console.error('Invalid AI image response');
      return null;
    }

    // Convert base64 to ArrayBuffer
    const base64Data = imageUrl.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('Successfully generated AI product image');
    return bytes.buffer;
  } catch (error) {
    console.error('Error generating AI image:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productUrl = url.searchParams.get('url');
    const dealTitle = url.searchParams.get('title') || '';

    // Get IP for rate limiting
    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-forwarded-for') || 
               'unknown';

    if (!productUrl) {
      return new Response('Missing url parameter', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Validate URL format and length
    if (productUrl.length > 2048) {
      console.error('URL too long:', productUrl.length);
      return new Response('URL too long', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Validate title length
    if (dealTitle.length > 500) {
      console.error('Title too long:', dealTitle.length);
      return new Response('Title too long', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(productUrl);
    } catch (e) {
      console.error('Invalid URL format:', productUrl);
      return new Response('Invalid URL format', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Whitelist only Amazon domains
    const allowedDomains = [
      'amazon.com',
      'www.amazon.com',
      'amazon.co.uk',
      'www.amazon.co.uk',
      'amazon.ca',
      'www.amazon.ca',
      'amazon.de',
      'www.amazon.de',
      'amazon.fr',
      'www.amazon.fr',
      'amazon.co.jp',
      'www.amazon.co.jp',
      'amazon.in',
      'www.amazon.in',
      'amazon.com.br',
      'www.amazon.com.br',
      'amazon.es',
      'www.amazon.es',
      'amazon.it',
      'www.amazon.it',
      'amazon.com.mx',
      'www.amazon.com.mx',
      'amazon.com.au',
      'www.amazon.com.au',
    ];

    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowedDomain = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      console.error('Domain not allowed:', hostname);
      return new Response('Only Amazon domains are allowed', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Reject private IP addresses and localhost to prevent SSRF
    const ipPatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^[fF][cCdD]/,
    ];

    const hostnameToCheck = parsedUrl.hostname.toLowerCase();
    for (const pattern of ipPatterns) {
      if (pattern.test(hostnameToCheck)) {
        console.error('Private IP address detected:', hostnameToCheck);
        return new Response('Private IP addresses are not allowed', {
          status: 403,
          headers: corsHeaders,
        });
      }
    }

    // Reject direct IP addresses
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(hostnameToCheck)) {
      console.error('Direct IP addresses are not allowed:', hostnameToCheck);
      return new Response('Direct IP addresses are not allowed', {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Strategy 1: Extract ASIN and use direct CDN URLs
    console.log('Attempting to extract ASIN from URL');
    const asin = extractASIN(productUrl);
    
    if (asin) {
      const imageResponse = await fetchAmazonImage(asin);
      
      if (imageResponse) {
        const imageBuffer = await imageResponse.arrayBuffer();
        
        return new Response(imageBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': imageResponse.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=2592000', // 30 days
            'X-Image-Source': 'amazon-cdn',
          },
        });
      }
    }

    // Strategy 2: Fallback to HTML scraping
    console.log('CDN fetch failed, falling back to HTML scraping');
    const scrapedImageUrl = await scrapeImageFromPage(productUrl);
    
    if (scrapedImageUrl) {
      const imageResponse = await fetch(scrapedImageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.amazon.com/',
        },
      });
      
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        
        return new Response(imageBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': imageResponse.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=2592000', // 30 days
            'X-Image-Source': 'scraped',
          },
        });
      }
    }

    // Strategy 3: Try AI-generated image if title is provided (with rate limiting)
    console.error('All image fetching strategies failed');
    
    if (dealTitle) {
      console.log('Attempting AI image generation as fallback');
      const aiImage = await generateAIProductImage(dealTitle, ip);
      
      if (aiImage) {
        return new Response(aiImage, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400', // 1 day for AI-generated
            'X-Image-Source': 'ai-generated',
          },
        });
      }
    }
    
    // Ultimate fallback: Simple branded placeholder
    const placeholderSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#grad)"/>
        <text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">
          Relay Station
        </text>
        <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)">
          ${dealTitle ? dealTitle.substring(0, 40) + (dealTitle.length > 40 ? '...' : '') : 'Product Image'}
        </text>
        <text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">
          Image Loading Failed
        </text>
      </svg>
    `;
    
    return new Response(placeholderSvg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // 1 hour for placeholder
        'X-Image-Source': 'placeholder',
      },
    });

  } catch (error) {
    console.error('Error in image-proxy:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to fetch image' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});