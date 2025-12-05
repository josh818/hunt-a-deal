import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{ name: string; is_active: boolean } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    website: "",
    communitySize: "",
    communityType: "",
    whatsappNumber: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        // Check if user already has an application
        const { data: existingProjects } = await supabase
          .from('projects')
          .select('name, is_active')
          .eq('created_by', user.id)
          .limit(1);
        
        if (existingProjects && existingProjects.length > 0) {
          setExistingApplication(existingProjects[0]);
        }
        setCheckingExisting(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Generate a cryptographically unique tracking code
  const generateUniqueTrackingCode = () => {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(12);
    crypto.getRandomValues(randomBytes);
    const randomPart = Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 16);
    return `pending-${timestamp}-${randomPart}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields are not empty after trimming
    const trimmedName = formData.companyName.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedCommunityType = formData.communityType.trim();
    const trimmedCommunitySize = formData.communitySize.trim();
    const trimmedWhatsApp = formData.whatsappNumber.trim();

    if (!trimmedName || !trimmedDescription || !trimmedCommunityType || !trimmedCommunitySize || !trimmedWhatsApp) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!logoFile) {
      toast({
        title: "Error",
        description: "Please upload a company logo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Double-check no existing application (race condition prevention)
      const { data: existingCheck } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', userId)
        .limit(1);

      if (existingCheck && existingCheck.length > 0) {
        toast({
          title: "Application Already Exists",
          description: "You already have a pending or approved application. Please contact support if you need to make changes.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Upload logo to storage with unique filename
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const uniqueFileId = crypto.randomUUID();
      const fileName = `${userId}/${uniqueFileId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload logo. Please try again.");
      }

      // Get public URL for the logo
      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(fileName);

      // Try to insert with retry logic for the rare case of collision
      let insertError: any = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const uniqueTrackingCode = generateUniqueTrackingCode();
        const { error } = await supabase
          .from('projects')
          .insert({
            name: trimmedName,
            description: `${trimmedDescription}\n\nCommunity Type: ${trimmedCommunityType}\nCommunity Size: ${trimmedCommunitySize}\nWebsite: ${formData.website.trim() || 'Not provided'}`,
            logo_url: publicUrl,
            created_by: userId,
            tracking_code: uniqueTrackingCode,
            is_active: false, // Pending approval
            whatsapp_number: trimmedWhatsApp,
          });

        if (!error) {
          insertError = null;
          break;
        }

        // If it's a duplicate key error on tracking_code, retry with a new code
        if (error.code === '23505' && error.message.includes('tracking_code')) {
          attempts++;
          insertError = error;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // For other errors, throw immediately with better message
        console.error("Insert error:", error);
        if (error.code === '23505') {
          throw new Error("An application already exists. Please refresh the page.");
        }
        throw new Error(error.message || "Failed to submit application");
      }

      if (insertError) {
        throw new Error("Failed to generate unique application ID. Please try again.");
      }

      toast({
        title: "Success!",
        description: "Your application has been submitted. We'll review it and get back to you soon!",
      });

      // Redirect to a success/pending page
      navigate("/application-pending");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-background p-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background p-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Application Already Submitted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You already have an application for <strong>{existingApplication.name}</strong>.
                  {existingApplication.is_active 
                    ? " Your application has been approved! You can access your dashboard."
                    : " Your application is currently under review. We'll contact you within 1-2 business days."
                  }
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button onClick={() => navigate("/")} variant="outline">
                  Go Home
                </Button>
                {existingApplication.is_active && (
                  <Button onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Join Relay Station</CardTitle>
            <CardDescription>
              Tell us about your community and start earning from deals shared with your audience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Organization/Community Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g., First Baptist Church, Lincoln High School"
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="communityType">Type of Organization *</Label>
                <Input
                  id="communityType"
                  name="communityType"
                  value={formData.communityType}
                  onChange={handleInputChange}
                  placeholder="e.g., Religious Institution, School, Influencer Community"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="communitySize">Community Size *</Label>
                <Input
                  id="communitySize"
                  name="communitySize"
                  value={formData.communitySize}
                  onChange={handleInputChange}
                  placeholder="e.g., 500 members, 10,000 followers"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Tell Us About Your Community *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your community, your mission, and how you plan to share deals with your audience..."
                  rows={5}
                  required
                  maxLength={2000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website/Social Media (Optional)</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number *</Label>
                <Input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                  required
                  maxLength={20}
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +1 for US)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Logo/Brand Image *</Label>
                <FileUpload
                  label="Upload Logo"
                  onFileSelect={setLogoFile}
                  onFileRemove={() => setLogoFile(null)}
                  currentFile={logoFile}
                  accept="image/*"
                  validationOptions={{ maxSizeInMB: 5 }}
                  validateImage={true}
                />
                <p className="text-sm text-muted-foreground">
                  Upload your organization's logo (max 5MB)
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                After submission, our team will review your application and contact you within 1-2 business days
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationForm;
