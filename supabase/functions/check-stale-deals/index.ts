import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting stale deals check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check the most recent deal's fetched_at timestamp
    const { data: latestDeal, error: dealError } = await supabase
      .from("deals")
      .select("fetched_at, title")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dealError) {
      console.error("Error fetching latest deal:", dealError);
      throw dealError;
    }

    if (!latestDeal) {
      console.log("No deals found in database");
      return new Response(
        JSON.stringify({ message: "No deals in database", alert_sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lastFetchedAt = new Date(latestDeal.fetched_at);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - lastFetchedAt.getTime()) / (1000 * 60 * 60);

    console.log(`Last deal fetched at: ${lastFetchedAt.toISOString()}`);
    console.log(`Hours since last fetch: ${hoursSinceLastFetch.toFixed(2)}`);

    // If less than 5 hours, no alert needed
    if (hoursSinceLastFetch < 5) {
      console.log("Deals are fresh, no alert needed");
      return new Response(
        JSON.stringify({ 
          message: "Deals are fresh", 
          hours_since_update: hoursSinceLastFetch.toFixed(2),
          alert_sent: false 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all admin emails from profiles table via user_roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ message: "No admins to notify", alert_sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin emails from profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    const adminEmails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found", alert_sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending alert to ${adminEmails.length} admin(s)`);
    console.log(`Admin user IDs: ${adminUserIds.join(", ")}`);

    // Send alert email
    const emailResponse = await resend.emails.send({
      from: "Relay Station <onboarding@resend.dev>",
      to: adminEmails,
      subject: "⚠️ Alert: No new deals for over 5 hours",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Stale Deals Alert</h1>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            No new deals have been synced in the last <strong>${hoursSinceLastFetch.toFixed(1)} hours</strong>.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0;">
              <strong>Last deal synced:</strong> ${lastFetchedAt.toLocaleString()}<br>
              <strong>Deal title:</strong> ${latestDeal.title || "Unknown"}
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Please check the deal sync process to ensure everything is working correctly.
          </p>
          
          <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}.lovable.app/admin/cron-monitoring" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Cron Monitoring
          </a>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated alert from Relay Station.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "Stale deals alert sent", 
        hours_since_update: hoursSinceLastFetch.toFixed(2),
        recipients: adminEmails.length,
        alert_sent: true 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-stale-deals:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
