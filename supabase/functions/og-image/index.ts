import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const dealId = url.searchParams.get('dealId');

    if (!dealId) {
      return new Response(JSON.stringify({ error: 'dealId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch deal
    const { data: deal, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error || !deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const discount = deal.original_price && deal.price 
      ? Math.round(((deal.original_price - deal.price) / deal.original_price) * 100) 
      : deal.discount || 0;

    // Generate an SVG-based OG image
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="100%" style="stop-color:#16213e"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#e94560"/>
            <stop offset="100%" style="stop-color:#ff6b6b"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Accent bar -->
        <rect width="1200" height="8" fill="url(#accent)"/>
        
        <!-- Content area -->
        <rect x="40" y="40" width="400" height="550" rx="12" fill="#ffffff" fill-opacity="0.05"/>
        
        <!-- Brand -->
        <text x="60" y="90" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#e94560">RELAY STATION</text>
        
        <!-- Deal badge -->
        ${discount > 0 ? `
        <rect x="960" y="40" width="200" height="80" rx="8" fill="#e94560"/>
        <text x="1060" y="95" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${discount}% OFF</text>
        ` : ''}
        
        <!-- Title -->
        <text x="60" y="180" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" width="1080">
          ${escapeXml(truncate(deal.title, 60))}
        </text>
        
        <!-- Price section -->
        <text x="60" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#4ade80">$${deal.price.toFixed(2)}</text>
        ${deal.original_price ? `
        <text x="60" y="340" font-family="Arial, sans-serif" font-size="32" fill="#888888" text-decoration="line-through">Was $${deal.original_price.toFixed(2)}</text>
        ` : ''}
        
        <!-- Category badge -->
        ${deal.category ? `
        <rect x="60" y="380" width="${Math.min(deal.category.length * 16 + 40, 300)}" height="40" rx="20" fill="#e94560" fill-opacity="0.2"/>
        <text x="80" y="408" font-family="Arial, sans-serif" font-size="18" fill="#e94560">${escapeXml(deal.category)}</text>
        ` : ''}
        
        <!-- CTA -->
        <rect x="60" y="520" width="300" height="60" rx="8" fill="url(#accent)"/>
        <text x="210" y="560" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">View Deal →</text>
        
        <!-- Footer -->
        <text x="1140" y="600" font-family="Arial, sans-serif" font-size="16" fill="#666666" text-anchor="end">relaystation.app</text>
      </svg>
    `;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
