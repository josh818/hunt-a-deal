import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on function restart)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 requests per minute per IP

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

function validateInput(dealId: any, projectId: any, targetUrl: any): { valid: boolean; error?: string } {
  // Validate dealId
  if (!dealId || typeof dealId !== 'string') {
    return { valid: false, error: 'Invalid dealId format' };
  }
  if (dealId.length > 100) {
    return { valid: false, error: 'dealId too long' };
  }

  // Validate projectId (should be UUID format)
  if (!projectId || typeof projectId !== 'string') {
    return { valid: false, error: 'Invalid projectId format' };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return { valid: false, error: 'projectId must be a valid UUID' };
  }

  // Validate targetUrl
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { valid: false, error: 'Invalid targetUrl format' };
  }
  if (targetUrl.length > 2048) {
    return { valid: false, error: 'targetUrl too long' };
  }
  
  try {
    const url = new URL(targetUrl);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP address for rate limiting
    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-forwarded-for') || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { dealId, projectId, targetUrl } = await req.json();
    
    // Validate input
    const validation = validateInput(dealId, projectId, targetUrl);
    if (!validation.valid) {
      console.warn(`Invalid input: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify deal exists
    const { data: dealExists } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .single();

    if (!dealExists) {
      console.warn(`Deal not found: ${dealId}`);
      return new Response(
        JSON.stringify({ error: 'Deal not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify project exists
    const { data: projectExists } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!projectExists) {
      console.warn(`Project not found: ${projectId}`);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user agent and referer
    const userAgent = req.headers.get('user-agent')?.substring(0, 500); // Limit length
    const referer = req.headers.get('referer')?.substring(0, 500);

    // Log the click
    const { error: insertError } = await supabase.from('click_tracking').insert({
      deal_id: dealId,
      project_id: projectId,
      user_agent: userAgent,
      referer: referer,
      ip_address: ip,
    });

    if (insertError) {
      console.error("Error inserting click:", insertError);
      throw insertError;
    }

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
