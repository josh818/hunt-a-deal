import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("Updating deal:", dealData.id);

    if (!dealData.id) {
      return new Response(
        JSON.stringify({ error: "Deal ID is required" }),
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
