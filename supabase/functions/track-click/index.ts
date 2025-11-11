import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId, projectId, targetUrl } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user agent and referer
    const userAgent = req.headers.get('user-agent');
    const referer = req.headers.get('referer');
    
    // Get IP address (Cloudflare header or fallback)
    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-forwarded-for') || 
               'unknown';

    // Log the click
    await supabase.from('click_tracking').insert({
      deal_id: dealId,
      project_id: projectId,
      user_agent: userAgent,
      referer: referer,
      ip_address: ip,
    });

    console.log(`Click tracked for deal ${dealId}, project ${projectId}`);

    // Redirect to target URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': targetUrl,
      },
    });
  } catch (error) {
    console.error("Error tracking click:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
