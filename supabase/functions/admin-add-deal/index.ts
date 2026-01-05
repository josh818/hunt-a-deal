import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive input validation for deal data
function validateDealData(dealData: any): { valid: boolean; error?: string } {
  if (!dealData.title || dealData.title.trim().length === 0) {
    return { valid: false, error: "Title is required" };
  }
  if (dealData.title.length > 500) {
    return { valid: false, error: "Title too long (max 500 characters)" };
  }
  if (!dealData.price || isNaN(dealData.price) || dealData.price < 0) {
    return { valid: false, error: "Valid price is required (must be >= 0)" };
  }
  if (!dealData.product_url || !dealData.product_url.startsWith('http')) {
    return { valid: false, error: "Valid product URL is required" };
  }
  try {
    new URL(dealData.product_url);
  } catch {
    return { valid: false, error: "Invalid product URL format" };
  }
  if (dealData.image_url && dealData.image_url !== "https://via.placeholder.com/300x300?text=No+Image") {
    try {
      const imgUrl = new URL(dealData.image_url);
      if (imgUrl.protocol !== 'http:' && imgUrl.protocol !== 'https:') {
        return { valid: false, error: "Image URL must use HTTP or HTTPS" };
      }
    } catch {
      return { valid: false, error: "Invalid image URL format" };
    }
  }
  if (dealData.original_price && (isNaN(dealData.original_price) || dealData.original_price < 0)) {
    return { valid: false, error: "Original price must be a positive number" };
  }
  if (dealData.discount && (isNaN(dealData.discount) || dealData.discount < 0 || dealData.discount > 100)) {
    return { valid: false, error: "Discount must be between 0 and 100" };
  }
  if (dealData.description && dealData.description.length > 5000) {
    return { valid: false, error: "Description too long (max 5000 characters)" };
  }
  return { valid: true };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("Not an admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the deal data
    const dealData = await req.json();
    
    // Validate deal data
    const validation = validateDealData(dealData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate server-side ID to prevent ID injection attacks
    const dealId = crypto.randomUUID();
    console.log("Adding manual deal with generated ID:", dealId, dealData.title);

    // Insert the deal using service role (bypasses RLS)
    const { data: deal, error: insertError } = await supabaseAdmin
      .from("deals")
      .insert({
        id: dealId,
        title: dealData.title,
        price: dealData.price,
        original_price: dealData.original_price || null,
        discount: dealData.discount || null,
        product_url: dealData.product_url,
        image_url: dealData.image_url || "https://via.placeholder.com/300x300?text=No+Image",
        description: dealData.description || null,
        category: dealData.category || "Manual",
        brand: dealData.brand || null,
        coupon_code: dealData.coupon_code || null,
        in_stock: dealData.in_stock ?? true,
        fetched_at: dealData.fetched_at || new Date().toISOString(),
        posted_at: dealData.posted_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Deal added successfully:", deal.id);

    // Also add to price history
    await supabaseAdmin.from("deal_price_history").insert({
      deal_id: deal.id,
      price: deal.price,
      original_price: deal.original_price,
      discount: deal.discount,
    });

    return new Response(
      JSON.stringify({ success: true, deal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-add-deal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});