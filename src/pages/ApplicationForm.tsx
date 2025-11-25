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
import { Loader2 } from "lucide-react";

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    website: "",
    communitySize: "",
    communityType: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
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
      // Upload logo to storage
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('project-logos')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      // Get public URL for the logo
      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(fileName);

      // Create project application with pending tracking code
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: formData.companyName,
          description: `${formData.description}\n\nCommunity Type: ${formData.communityType}\nCommunity Size: ${formData.communitySize}\nWebsite: ${formData.website}`,
          logo_url: publicUrl,
          created_by: userId,
          tracking_code: 'pending-admin-review',
          is_active: false, // Pending approval
        });

      if (insertError) throw insertError;

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
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
                />
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
