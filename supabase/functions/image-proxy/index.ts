const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Reject private IP addresses and localhost
    // This prevents SSRF attacks against internal networks
    const ipPatterns = [
      /^127\./,                    // Loopback (127.0.0.0/8)
      /^10\./,                     // Private Class A (10.0.0.0/8)
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B (172.16.0.0/12)
      /^192\.168\./,               // Private Class C (192.168.0.0/16)
      /^169\.254\./,               // Link-local (169.254.0.0/16)
      /^::1$/,                     // IPv6 loopback
      /^fe80:/,                    // IPv6 link-local
      /^fc00:/,                    // IPv6 unique local
      /^fd00:/,                    // IPv6 unique local
    ];

    const hostnameToCheck = parsedUrl.hostname;
    const isPrivateIP = ipPatterns.some(pattern => pattern.test(hostnameToCheck));

    if (isPrivateIP) {
      console.error('Private IP address detected:', hostnameToCheck);
      return new Response('Private IP addresses are not allowed', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Additional check: reject if hostname is an IP address that's not Amazon CDN
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(hostnameToCheck)) {
      console.error('Direct IP addresses are not allowed:', hostnameToCheck);
      return new Response('Direct IP addresses are not allowed', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Fetch the Amazon product page
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch product page:', response.status);
      return new Response('Failed to fetch product page', { 
        status: response.status,
        headers: corsHeaders 
      });
    }

    const html = await response.text();
    
    // Extract image URL from HTML using multiple patterns
    let imageUrl = null;
    
    // Try to find the main product image using various selectors
    const patterns = [
      // Standard product image data attributes
      /"largeImage":"(https:\/\/[^"]+)"/,
      /"hiRes":"(https:\/\/[^"]+)"/,
      /data-old-hires="(https:\/\/[^"]+)"/,
      
      // Dynamic image data (most common)
      /data-a-dynamic-image="[^"]*?(https:\/\/[^"\\,]+)/,
      
      // Try landingImage
      /"landingImage":"(https:\/\/[^"]+)"/,
      
      // Try mainUrl
      /"mainUrl":"(https:\/\/[^"]+)"/,
      
      // Try imageGalleryData
      /"mainImageUrl":"(https:\/\/[^"]+)"/,
      
      // Try img src with media-amazon
      /<img[^>]+src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      
      // Try any large Amazon image URL
      /(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\._[^"'\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        imageUrl = match[1]
          .replace(/\\u[\dA-F]{4}/gi, '')
          .replace(/\\/g, '')
          .replace(/_[A-Z]{2}[0-9]+_/, '_AC_SL1500_'); // Request higher quality
        break;
      }
    }

    if (!imageUrl) {
      console.error('Could not extract image URL from product page');
      // Return a 1x1 transparent PNG instead of error
      const transparentPixel = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      ]);
      return new Response(transparentPixel, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Fetch the actual image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': productUrl,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        console.error('Failed to fetch image:', imageResponse.status);
        throw new Error('Image fetch failed');
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      return new Response(imageBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching image:', error);
      
      // Return transparent pixel on error
      const transparentPixel = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      ]);
      return new Response(transparentPixel, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('Error proxying image', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
