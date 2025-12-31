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
import { LOGO_VALIDATION_OPTIONS, generateSecureFilename, getFileExtension } from "@/utils/fileValidation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PublicNavigation } from "@/components/PublicNavigation";
import { Footer } from "@/components/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ORGANIZATION_TYPES = [
  { value: "religious", label: "Religious Institution (Church, Mosque, Temple)" },
  { value: "school", label: "School / Educational Institution" },
  { value: "pta", label: "PTA / Parent Organization" },
  { value: "nonprofit", label: "Nonprofit Organization" },
  { value: "influencer", label: "Social Media Influencer" },
  { value: "community", label: "Community Group / Club" },
  { value: "sports", label: "Sports Team / League" },
  { value: "business", label: "Small Business" },
  { value: "other", label: "Other" },
];

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{ name: string; is_active: boolean } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    website: "",
    communitySize: "",
    communityType: "",
    otherCommunityType: "",
    whatsappNumber: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        setUserId(user.id);

        // Check if user already has an application
        const { data: existingProjects, error } = await supabase
          .from("projects")
          .select("name, is_active")
          .eq("created_by", user.id)
          .limit(1);

        if (error) {
          console.error("Error checking existing projects:", error);
        }

        if (existingProjects && existingProjects.length > 0) {
          // Approved -> dashboard; pending -> pending status page
          navigate(existingProjects[0].is_active ? "/dashboard" : "/application-pending", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/auth");
      } finally {
        setCheckingAuth(false);
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
      navigate("/auth");
      return;
    }

    // Validate required fields are not empty after trimming
    const trimmedName = formData.companyName.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedCommunitySize = formData.communitySize.trim();
    const trimmedWhatsApp = formData.whatsappNumber.trim();

    // Get community type (use "other" value if selected)
    const communityTypeValue = formData.communityType === "other" 
      ? formData.otherCommunityType.trim() 
      : ORGANIZATION_TYPES.find(t => t.value === formData.communityType)?.label || formData.communityType;

    if (!trimmedName || !trimmedDescription || !formData.communityType || !trimmedCommunitySize || !trimmedWhatsApp) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.communityType === "other" && !formData.otherCommunityType.trim()) {
      toast({
        title: "Missing Information",
        description: "Please specify your organization type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Double-check no existing application (race condition prevention)
      const { data: existingCheck } = await supabase
        .from('projects')
        .select('id, is_active')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingCheck && existingCheck.length > 0) {
        const isActive = !!existingCheck[0].is_active;
        toast({
          title: "Application Exists",
          description: "You already have an application. Redirecting you now.",
        });
        navigate(isActive ? "/dashboard" : "/application-pending", { replace: true });
        return;
      }

      let publicUrl = null;

      // Upload logo if provided (now optional)
      if (logoFile) {
        // Generate secure, unpredictable filename to prevent enumeration attacks
        const extension = getFileExtension(logoFile.name);
        const secureFilename = generateSecureFilename(logoFile.name);
        const fileName = `${userId}/${secureFilename}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: logoFile.type, // Explicitly set content type
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // Don't fail the entire submission for logo upload issues
          toast({
            title: "Logo Upload Failed",
            description: "Your application will be submitted without a logo. You can add one later.",
          });
        } else {
          // Get public URL for the logo
          const { data: urlData } = supabase.storage
            .from('project-logos')
            .getPublicUrl(fileName);
          
          publicUrl = urlData.publicUrl;
        }
      }

      // Try to insert with retry logic for the rare case of collision
      let insertSuccess = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!insertSuccess && attempts < maxAttempts) {
        const uniqueTrackingCode = generateUniqueTrackingCode();
        const { error } = await supabase
          .from('projects')
          .insert({
            name: trimmedName,
            description: trimmedDescription,
            logo_url: publicUrl,
            created_by: userId,
            tracking_code: uniqueTrackingCode,
            is_active: false, // Pending approval
            whatsapp_number: trimmedWhatsApp,
            community_type: communityTypeValue,
            community_size: trimmedCommunitySize,
            website: formData.website.trim() || null,
          });

        if (!error) {
          insertSuccess = true;
          break;
        }

        // If it's a duplicate key error on tracking_code, retry with a new code
        if (error.code === '23505' && error.message.includes('tracking_code')) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // For other errors, throw immediately
        console.error("Insert error:", error);
        throw new Error(error.message || "Failed to submit application");
      }

      if (!insertSuccess) {
        throw new Error("Failed to generate unique application ID. Please try again.");
      }

      // Send notification email to admin (don't block on this)
      const { data: { user } } = await supabase.auth.getUser();
      supabase.functions.invoke('notify-new-application', {
        body: {
          organizationName: trimmedName,
          communityType: communityTypeValue,
          communitySize: trimmedCommunitySize,
          description: trimmedDescription,
          website: formData.website.trim() || undefined,
          whatsappNumber: trimmedWhatsApp,
          applicantEmail: user?.email || 'Unknown',
        },
      }).catch(err => console.error('Failed to send admin notification:', err));

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and contact you within 1-2 business days.",
      });

      navigate("/application-pending");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavigation />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {existingApplication.is_active ? (
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {existingApplication.is_active ? "Your Store is Active!" : "Application Under Review"}
              </CardTitle>
              <CardDescription>
                {existingApplication.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  {existingApplication.is_active 
                    ? "Your store is live and ready to earn! Access your dashboard to view deals and track earnings."
                    : "Your application is being reviewed by our team. We'll contact you within 1-2 business days."
                  }
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                  Go Home
                </Button>
                <Button onClick={() => navigate("/dashboard")} className="flex-1">
                  {existingApplication.is_active ? "Go to Dashboard" : "Check Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavigation />
      <div className="flex-1 container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl">Join Relay Station</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Tell us about your community and start earning from deals shared with your audience.
                We'll post curated deals to your WhatsApp groups and you earn commissions on every purchase.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Organization/Community Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., First Baptist Church, Lincoln High School PTA"
                    required
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communityType">Type of Organization *</Label>
                  <Select 
                    value={formData.communityType} 
                    onValueChange={(value) => setFormData({ ...formData, communityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your organization type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {ORGANIZATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.communityType === "other" && (
                    <Input
                      name="otherCommunityType"
                      value={formData.otherCommunityType}
                      onChange={handleInputChange}
                      placeholder="Please specify your organization type"
                      className="mt-2"
                      maxLength={100}
                    />
                  )}
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
                    rows={4}
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
                    Include country code (e.g., +1 for US). We'll use this to contact you and set up your groups.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Logo/Brand Image (Optional)</Label>
                  <FileUpload
                    label="Upload Logo"
                    onFileSelect={setLogoFile}
                    onFileRemove={() => setLogoFile(null)}
                    currentFile={logoFile}
                    accept=".jpg,.jpeg,.png,.webp"
                    validationOptions={LOGO_VALIDATION_OPTIONS}
                    validateImage={true}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload your organization's logo (PNG, JPEG, or WebP only, max 2MB). You can add this later.
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
                  After submission, our team will review your application and contact you within 1-2 business days.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ApplicationForm;