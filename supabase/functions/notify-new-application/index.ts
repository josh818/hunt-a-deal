import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "admin@relaystation.app"; // Change this to your admin email

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationNotification {
  organizationName: string;
  communityType: string;
  communitySize: string;
  description: string;
  website?: string;
  whatsappNumber: string;
  applicantEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const application: ApplicationNotification = await req.json();
    console.log("Received new application notification request:", application.organizationName);

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">🚀 New Application Received!</h1>
        <p style="font-size: 16px;">A new organization has applied to join Relay Station:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #374151;">${application.organizationName}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;"><strong>Type:</strong></td>
              <td style="padding: 8px 0;">${application.communityType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Community Size:</strong></td>
              <td style="padding: 8px 0;">${application.communitySize}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>WhatsApp:</strong></td>
              <td style="padding: 8px 0;">${application.whatsappNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${application.applicantEmail}</td>
            </tr>
            ${application.website ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Website:</strong></td>
              <td style="padding: 8px 0;"><a href="${application.website}" style="color: #3b82f6;">${application.website}</a></td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">About Their Community</h3>
          <p style="color: #78350f; white-space: pre-wrap;">${application.description}</p>
        </div>
        
        <p style="background: #dbeafe; padding: 16px; border-radius: 8px;">
          <a href="https://relaystation.app/admin/applications" style="color: #1d4ed8; font-weight: bold; text-decoration: none;">
            👉 Review Application in Admin Panel
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated notification from Relay Station.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Relay Station <noreply@relaystation.app>",
        to: [ADMIN_EMAIL],
        subject: `🆕 New Application: ${application.organizationName}`,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Admin notification email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
