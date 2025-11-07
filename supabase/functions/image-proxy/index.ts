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
      /"largeImage":"(https:\/\/[^"]+)"/,
      /"hiRes":"(https:\/\/[^"]+)"/,
      /data-old-hires="(https:\/\/[^"]+)"/,
      /data-a-dynamic-image="[^"]*?(https:\/\/m\.media-amazon\.com\/images\/I\/[^"\\]+)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        imageUrl = match[1].replace(/\\u[\dA-F]{4}/gi, '').replace(/\\/g, '');
        console.log(`Found image using pattern: ${imageUrl.substring(0, 80)}`);
        break;
      }
    }

    if (!imageUrl) {
      console.error('Could not extract image URL from product page');
      return new Response('Could not extract image', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Fetch the actual image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': productUrl,
      },
    });

    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status);
      return new Response('Failed to fetch image', { 
        status: imageResponse.status,
        headers: corsHeaders 
      });
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
    console.error('Error proxying image:', error);
    return new Response('Error proxying image', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
