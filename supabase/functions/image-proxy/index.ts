const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productUrl = url.searchParams.get('url');

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

    // All strategies failed - return placeholder
    console.error('All image fetching strategies failed');
    
    const placeholderSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#f0f0f0"/>
        <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="18" fill="#666">
          Image unavailable
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