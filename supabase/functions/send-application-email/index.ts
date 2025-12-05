import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "approved" | "rejected";
  projectName: string;
  projectSlug?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, projectName, projectSlug }: EmailRequest = await req.json();

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject: string;
    let html: string;

    if (type === "approved") {
      subject = `🎉 Your Relay Station Application Has Been Approved!`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Congratulations!</h1>
          <p>Your application for <strong>${projectName}</strong> has been approved!</p>
          <p>Your store is now live and ready to use. You can access it at:</p>
          <p style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
            <a href="https://relaystation.app/project/${projectSlug}/deals" style="color: #3b82f6; text-decoration: none;">
              https://relaystation.app/project/${projectSlug}/deals
            </a>
          </p>
          <p>Share this link with your community to start earning commissions!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br />
            The Relay Station Team
          </p>
        </div>
      `;
    } else {
      subject = `Update on Your Relay Station Application`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #374151;">Application Update</h1>
          <p>Thank you for your interest in joining Relay Station.</p>
          <p>Unfortunately, we were unable to approve your application for <strong>${projectName}</strong> at this time.</p>
          <p>This could be due to:</p>
          <ul style="color: #6b7280;">
            <li>Incomplete application information</li>
            <li>Community guidelines not being met</li>
            <li>Other eligibility requirements</li>
          </ul>
          <p>If you believe this was in error or would like to reapply with updated information, please don't hesitate to contact us.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br />
            The Relay Station Team
          </p>
        </div>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Relay Station <noreply@relaystation.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
