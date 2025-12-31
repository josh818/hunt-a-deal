import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const EmailPreview = () => {
  const [previewData, setPreviewData] = useState({
    applicantName: "John Doe",
    applicantEmail: "john@example.com",
    communityName: "Tech Deals Community",
    communityType: "Discord Server",
    communitySize: "1,000 - 5,000",
    website: "https://example.com",
    loginUrl: "https://relaystation.app/auth",
  });

  const getApplicationConfirmationEmail = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
            ⚡ Relay Station
          </h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
            Your Gateway to Exclusive Deals
          </p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 20px; padding: 6px 16px;">
              <span style="color: #60a5fa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                📋 Application Received
              </span>
            </div>
          </div>
          
          <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            Thank You for Applying, ${previewData.applicantName}!
          </h2>
          
          <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
            We've received your application to join Relay Station. Our team will review your submission and get back to you soon.
          </p>
          
          <!-- Application details card -->
          <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              Application Details
            </h3>
            
            <div style="margin-bottom: 12px;">
              <span style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Community Name</span>
              <p style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 500;">${previewData.communityName}</p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <span style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Community Type</span>
              <p style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 500;">${previewData.communityType}</p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <span style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Community Size</span>
              <p style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 500;">${previewData.communitySize}</p>
            </div>
            
            ${previewData.website ? `
            <div>
              <span style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Website</span>
              <p style="color: #60a5fa; font-size: 16px; margin: 4px 0 0 0; font-weight: 500;">${previewData.website}</p>
            </div>
            ` : ''}
          </div>
          
          <!-- Timeline -->
          <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              What Happens Next
            </h3>
            
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
              <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: white; font-size: 12px;">✓</span>
              </div>
              <div style="margin-left: 12px;">
                <p style="color: #ffffff; font-size: 14px; font-weight: 500; margin: 0;">Application Submitted</p>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">We've received your application</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
              <div style="width: 24px; height: 24px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: white; font-size: 10px;">⏳</span>
              </div>
              <div style="margin-left: 12px;">
                <p style="color: #ffffff; font-size: 14px; font-weight: 500; margin: 0;">Under Review</p>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">Our team will review within 24-48 hours</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start;">
              <div style="width: 24px; height: 24px; background-color: #262626; border: 2px solid #404040; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: #71717a; font-size: 10px;">3</span>
              </div>
              <div style="margin-left: 12px;">
                <p style="color: #71717a; font-size: 14px; font-weight: 500; margin: 0;">Decision Email</p>
                <p style="color: #52525b; font-size: 12px; margin: 4px 0 0 0;">You'll receive an email with our decision</p>
              </div>
            </div>
          </div>
          
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
            If you have any questions, feel free to reply to this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
          <p style="color: #52525b; font-size: 12px; margin: 0;">
            © 2024 Relay Station. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const getApprovalEmail = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
            ⚡ Relay Station
          </h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
            Your Gateway to Exclusive Deals
          </p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 6px 16px;">
              <span style="color: #4ade80; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ✓ Application Approved
              </span>
            </div>
          </div>
          
          <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            Welcome to Relay Station! 🎉
          </h2>
          
          <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
            Great news! Your application has been approved. You now have access to exclusive deals for your community.
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${previewData.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Access Your Dashboard →
            </a>
          </div>
          
          <!-- What you can do card -->
          <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              What You Can Do Now
            </h3>
            
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="color: #4ade80; margin-right: 8px;">✓</span>
              <p style="color: #d4d4d8; font-size: 14px; margin: 0;">Browse exclusive deals curated for community leaders</p>
            </div>
            
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="color: #4ade80; margin-right: 8px;">✓</span>
              <p style="color: #d4d4d8; font-size: 14px; margin: 0;">Generate custom tracking links for your community</p>
            </div>
            
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="color: #4ade80; margin-right: 8px;">✓</span>
              <p style="color: #d4d4d8; font-size: 14px; margin: 0;">Create social media posts with one click</p>
            </div>
            
            <div style="display: flex; align-items: flex-start;">
              <span style="color: #4ade80; margin-right: 8px;">✓</span>
              <p style="color: #d4d4d8; font-size: 14px; margin: 0;">Track engagement and clicks from your audience</p>
            </div>
          </div>
          
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
            If you have any questions, feel free to reply to this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
          <p style="color: #52525b; font-size: 12px; margin: 0;">
            © 2024 Relay Station. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const getRejectionEmail = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #71717a 0%, #52525b 50%, #3f3f46 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
            ⚡ Relay Station
          </h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
            Your Gateway to Exclusive Deals
          </p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 6px 16px;">
              <span style="color: #f87171; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Application Not Approved
              </span>
            </div>
          </div>
          
          <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            Thank You for Your Interest
          </h2>
          
          <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
            We appreciate you taking the time to apply to Relay Station. After careful review, we've decided not to move forward with your application at this time.
          </p>
          
          <!-- Info card -->
          <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              What This Means
            </h3>
            
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              This decision doesn't reflect on you or your community. We have specific criteria we're looking for at this time, and we encourage you to apply again in the future as your community grows.
            </p>
            
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0;">
              We're constantly expanding our partner network and would love to hear from you again.
            </p>
          </div>
          
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
            If you have any questions, feel free to reply to this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #0a0a0a; padding: 24px 30px; text-align: center; border-top: 1px solid #262626;">
          <p style="color: #52525b; font-size: 12px; margin: 0;">
            © 2024 Relay Station. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Email Template Preview</h1>
            <p className="text-muted-foreground">Preview how your email templates will look to recipients</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px,1fr] gap-8">
          {/* Settings Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview Data</CardTitle>
              <CardDescription>Customize the preview content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="applicantName">Applicant Name</Label>
                <Input
                  id="applicantName"
                  value={previewData.applicantName}
                  onChange={(e) => setPreviewData({ ...previewData, applicantName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicantEmail">Applicant Email</Label>
                <Input
                  id="applicantEmail"
                  value={previewData.applicantEmail}
                  onChange={(e) => setPreviewData({ ...previewData, applicantEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="communityName">Community Name</Label>
                <Input
                  id="communityName"
                  value={previewData.communityName}
                  onChange={(e) => setPreviewData({ ...previewData, communityName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="communityType">Community Type</Label>
                <Input
                  id="communityType"
                  value={previewData.communityType}
                  onChange={(e) => setPreviewData({ ...previewData, communityType: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="communitySize">Community Size</Label>
                <Input
                  id="communitySize"
                  value={previewData.communitySize}
                  onChange={(e) => setPreviewData({ ...previewData, communitySize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  value={previewData.website}
                  onChange={(e) => setPreviewData({ ...previewData, website: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Preview</CardTitle>
              <CardDescription>See how each email template renders</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="confirmation" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="confirmation" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Confirmation</span>
                  </TabsTrigger>
                  <TabsTrigger value="approval" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Approval</span>
                  </TabsTrigger>
                  <TabsTrigger value="rejection" className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Rejection</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="confirmation">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Application Confirmation Email</span>
                    </div>
                    <iframe
                      srcDoc={getApplicationConfirmationEmail()}
                      className="w-full h-[700px] bg-[#0a0a0a]"
                      title="Confirmation Email Preview"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="approval">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Approval Email</span>
                    </div>
                    <iframe
                      srcDoc={getApprovalEmail()}
                      className="w-full h-[700px] bg-[#0a0a0a]"
                      title="Approval Email Preview"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="rejection">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Rejection Email</span>
                    </div>
                    <iframe
                      srcDoc={getRejectionEmail()}
                      className="w-full h-[700px] bg-[#0a0a0a]"
                      title="Rejection Email Preview"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
