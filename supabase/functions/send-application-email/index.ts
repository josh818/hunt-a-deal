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
              
              <!-- Success Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); width: 80px; height: 80px; border-radius: 50%; line-height: 80px; font-size: 40px;">
                  ✓
                </div>
              </div>
              
              <!-- Welcome Message -->
              <h2 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; text-align: center;">
                Congratulations! 🎉
              </h2>
              <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0; line-height: 1.6; text-align: center;">
                Your application for <strong style="color: #f97316;">${projectName}</strong> has been approved!
              </p>
              
              <!-- Status Badge -->
              <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #22c55e; text-transform: uppercase; letter-spacing: 0.5px;">
                  ✅ Application Approved
                </span>
              </div>
              
              <!-- Store Link -->
              <div style="background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; margin: 0 0 12px 0;">
                  🏪 Your Store is Live!
                </h3>
                <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin: 0 0 16px 0;">
                  Share this link with your community to start earning commissions:
                </p>
                <div style="background: #1a1a1a; border: 1px solid #3f3f46; border-radius: 8px; padding: 12px 16px; word-break: break-all;">
                  <a href="https://relaystation.app/project/${projectSlug}/deals" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #f97316; text-decoration: none; font-weight: 500;">
                    https://relaystation.app/project/${projectSlug}/deals
                  </a>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="https://relaystation.app/project/${projectSlug}/deals" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                  Visit Your Store →
                </a>
              </div>
              
              <!-- What's Next -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #2a2a2a;">
                <h3 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0;">
                  What's next?
                </h3>
                
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; align-items: flex-start;">
                    <span style="color: #f97316; margin-right: 12px;">📱</span>
                    <div>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Share with your community</p>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #71717a; margin: 0;">Post your store link on WhatsApp, social media, or your website</p>
                    </div>
                  </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; align-items: flex-start;">
                    <span style="color: #f97316; margin-right: 12px;">💰</span>
                    <div>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Earn commissions</p>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #71717a; margin: 0;">Get paid when your community members make purchases</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div style="display: flex; align-items: flex-start;">
                    <span style="color: #f97316; margin-right: 12px;">📊</span>
                    <div>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #ffffff; margin: 0 0 4px 0; font-weight: 500;">Track your performance</p>
                      <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #71717a; margin: 0;">Monitor clicks and sales from your dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Help Section -->
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #a1a1aa; margin: 0 0 8px 0;">
                Need help getting started?
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
                You're receiving this email because your application was approved.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `Update on Your Relay Station Application`;
      html = `
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
              
              <!-- Message -->
              <h2 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">
                Application Update
              </h2>
              
              <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: #a1a1aa; margin: 0 0 16px 0; line-height: 1.6;">
                Thank you for your interest in joining Relay Station.
              </p>
              
              <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0; line-height: 1.6;">
                Unfortunately, we were unable to approve your application for <strong style="color: #f97316;">${projectName}</strong> at this time.
              </p>
              
              <!-- Reasons Box -->
              <div style="background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; margin: 0 0 16px 0;">
                  This could be due to:
                </h3>
                <ul style="margin: 0; padding: 0 0 0 20px;">
                  <li style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin-bottom: 8px;">Incomplete application information</li>
                  <li style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin-bottom: 8px;">Community guidelines not being met</li>
                  <li style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #71717a; margin-bottom: 0;">Other eligibility requirements</li>
                </ul>
              </div>
              
              <!-- Encouragement -->
              <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 20px;">
                <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #a1a1aa; margin: 0; line-height: 1.6;">
                  💡 <strong style="color: #f97316;">Don't give up!</strong> If you believe this was in error or would like to reapply with updated information, we'd love to hear from you.
                </p>
              </div>
            </div>
            
            <!-- Help Section -->
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #a1a1aa; margin: 0 0 8px 0;">
                Have questions or want to reapply?
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
                You're receiving this email regarding your Relay Station application.
              </p>
            </div>
            
          </div>
        </body>
        </html>
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
