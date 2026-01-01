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

    const title = escapeHtml(truncate(deal.title, 80));
    const price = `$${deal.price.toFixed(2)}`;
    const originalPrice = deal.original_price ? `$${deal.original_price.toFixed(2)}` : '';
    const category = deal.category || '';

    // Generate HTML that will be rendered as image
    // Using a simple HTML approach that's more compatible
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    .brand {
      font-size: 28px;
      font-weight: bold;
      color: #e94560;
    }
    .discount-badge {
      background: #e94560;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 32px;
      font-weight: bold;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .title {
      font-size: 42px;
      font-weight: bold;
      margin-bottom: 24px;
      line-height: 1.2;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      gap: 20px;
      margin-bottom: 16px;
    }
    .current-price {
      font-size: 72px;
      font-weight: bold;
      color: #4ade80;
    }
    .original-price {
      font-size: 36px;
      color: #888;
      text-decoration: line-through;
    }
    .category {
      display: inline-block;
      background: rgba(233, 69, 96, 0.2);
      color: #e94560;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 18px;
      margin-top: 20px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 40px;
    }
    .cta {
      background: linear-gradient(90deg, #e94560, #ff6b6b);
      padding: 20px 40px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
    }
    .domain {
      color: #666;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">RELAY STATION</div>
    ${discount > 0 ? `<div class="discount-badge">${discount}% OFF</div>` : ''}
  </div>
  <div class="content">
    <div class="title">${title}</div>
    <div class="price-row">
      <span class="current-price">${price}</span>
      ${originalPrice ? `<span class="original-price">Was ${originalPrice}</span>` : ''}
    </div>
    ${category ? `<span class="category">${escapeHtml(category)}</span>` : ''}
  </div>
  <div class="footer">
    <div class="cta">View Deal →</div>
    <div class="domain">hunt-a-deal.lovable.app</div>
  </div>
</body>
</html>`;

    // Return HTML that can be screenshot by social platforms
    // Most platforms will render this or we can use a screenshot service
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
