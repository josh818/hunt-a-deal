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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is authenticated
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
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
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const dealData = await req.json();

    // Validate deal ID
    if (!dealData.id || typeof dealData.id !== 'string' || dealData.id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Valid deal ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Updating deal:", dealData.id);

    // Verify deal exists before updating
    const { data: existingDeal, error: checkError } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("id", dealData.id)
      .single();

    if (checkError || !existingDeal) {
      return new Response(
        JSON.stringify({ error: "Deal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate deal data
    const validation = validateDealData(dealData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate discount if prices are provided
    let discount = dealData.discount;
    if (dealData.price && dealData.original_price && dealData.original_price > dealData.price) {
      discount = Math.round(((dealData.original_price - dealData.price) / dealData.original_price) * 100);
    }

    // Update the deal
    const { data: updatedDeal, error: updateError } = await supabaseAdmin
      .from("deals")
      .update({
        title: dealData.title,
        description: dealData.description,
        price: dealData.price,
        original_price: dealData.original_price,
        discount: discount,
        image_url: dealData.image_url,
        product_url: dealData.product_url,
        category: dealData.category,
        brand: dealData.brand,
        coupon_code: dealData.coupon_code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealData.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record price history if price changed
    if (dealData.price) {
      await supabaseAdmin
        .from("deal_price_history")
        .insert({
          deal_id: dealData.id,
          price: dealData.price,
          original_price: dealData.original_price,
          discount: discount,
        });
    }

    console.log("Deal updated successfully:", updatedDeal.id);

    return new Response(
      JSON.stringify({ success: true, deal: updatedDeal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-edit-deal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
