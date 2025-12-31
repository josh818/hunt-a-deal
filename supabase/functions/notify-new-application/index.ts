import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAILS = ["joshuahay@gmail.com", "jyudin@gmail.com"];

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

    // Send admin notification email
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Relay Station <noreply@relaystation.app>",
        to: ADMIN_EMAILS,
        subject: `🆕 New Application: ${application.organizationName}`,
        html,
      }),
    });

    if (!adminRes.ok) {
      const error = await adminRes.text();
      console.error("Resend API error (admin):", error);
      throw new Error(`Failed to send admin email: ${error}`);
    }

    const adminData = await adminRes.json();
    console.log("Admin notification email sent successfully:", adminData);

    // Send confirmation email to applicant
    const applicantHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; padding: 40px 20px;">
          
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 16px 32px; border-radius: 12px;">
              <h1 style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                📡 RELAY STATION
              </h1>
            </div>
          </div>
          
          <!-- Main Content Card -->
          <div style="background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%); border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
            
            <!-- Welcome Message -->
            <h2 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">
              Welcome aboard! 🎉
            </h2>
            <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0; line-height: 1.6;">
              Thank you for applying to join Relay Station with <strong style="color: #f97316;">${application.organizationName}</strong>
            </p>
            
            <!-- Status Badge -->
            <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center;">
                <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px;">
                  ⏳ Application Status: Under Review
                </span>
              </div>
            </div>
            
            <!-- What Happens Next -->
            <h3 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0;">
              What happens next?
            </h3>
            
            <div style="margin-bottom: 24px;">
              <div style="display: flex; margin-bottom: 16px;">
                <div style="background: #f97316; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; flex-shrink: 0; text-align: center; line-height: 28px;">1</div>
                <div style="margin-left: 16px;">
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Application Review</p>
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin: 0;">Our team reviews your application within 24-48 hours</p>
                </div>
              </div>
              
              <div style="display: flex; margin-bottom: 16px;">
                <div style="background: #3f3f46; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; flex-shrink: 0; text-align: center; line-height: 28px;">2</div>
                <div style="margin-left: 16px;">
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Approval Notification</p>
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin: 0;">You'll receive an email when your store is ready</p>
                </div>
              </div>
              
              <div style="display: flex;">
                <div style="background: #3f3f46; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; flex-shrink: 0; text-align: center; line-height: 28px;">3</div>
                <div style="margin-left: 16px;">
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Start Earning</p>
                  <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin: 0;">Share deals with your community and earn commissions</p>
                </div>
              </div>
            </div>
            
            <!-- Application Summary -->
            <div style="background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin-top: 24px;">
              <h4 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #71717a; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                📋 Your Application Details
              </h4>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; width: 140px;">Organization</td>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; font-weight: 500;">${application.organizationName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a;">Community Type</td>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; font-weight: 500;">${application.communityType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a;">Community Size</td>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; font-weight: 500;">${application.communitySize}</td>
                </tr>
                ${application.website ? `
                <tr>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a;">Website</td>
                  <td style="padding: 8px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #f97316; font-weight: 500;">
                    <a href="${application.website}" style="color: #f97316; text-decoration: none;">${application.website}</a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
          </div>
          
          <!-- Help Section -->
          <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #a1a1aa; margin: 0 0 8px 0;">
              Have questions? We're here to help!
            </p>
            <a href="mailto:support@relaystation.app" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #f97316; text-decoration: none; font-weight: 500;">
              support@relaystation.app
            </a>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #2a2a2a;">
            <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #52525b; margin: 0 0 8px 0;">
              © ${new Date().getFullYear()} Relay Station. All rights reserved.
            </p>
            <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #3f3f46; margin: 0;">
              You're receiving this email because you applied to join Relay Station.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    const applicantRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Relay Station <noreply@relaystation.app>",
        to: [application.applicantEmail],
        subject: "We've Received Your Relay Station Application! 🚀",
        html: applicantHtml,
      }),
    });

    if (!applicantRes.ok) {
      const error = await applicantRes.text();
      console.error("Resend API error (applicant):", error);
      // Don't throw here - admin email was sent successfully
    } else {
      console.log("Applicant confirmation email sent successfully");
    }

    return new Response(JSON.stringify({ success: true, data: adminData }), {
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
