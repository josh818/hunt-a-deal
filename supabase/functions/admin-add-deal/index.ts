import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("Adding manual deal:", dealData.id, dealData.title);

    // Insert the deal using service role (bypasses RLS)
    const { data: deal, error: insertError } = await supabaseAdmin
      .from("deals")
      .upsert({
        id: dealData.id,
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
      }, {
        onConflict: "id",
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
