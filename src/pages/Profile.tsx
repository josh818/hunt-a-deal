import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoleBasedNavigation } from "@/components/RoleBasedNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

interface UserProject {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<UserProject | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("created_by", user.id)
        .single();

      if (projectData) {
        setProject(projectData);
        setFormData({
          name: projectData.name,
          description: projectData.description || "",
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!project || !userId) return;

    setSaving(true);

    try {
      let logoUrl = project.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          description: formData.description,
          logo_url: logoUrl,
        })
        .eq("id", project.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Your profile has been updated",
      });

      setProject({ ...project, ...formData, logo_url: logoUrl });
      setLogoFile(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <RoleBasedNavigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No Store Found</CardTitle>
              <CardDescription>You haven't applied for a store yet</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/apply")}>Apply Now</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RoleBasedNavigation />
      
      <div className="flex-1 container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Store Profile</CardTitle>
            <CardDescription>
              Customize how your store appears to your community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your organization name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell your community about your store..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              {project.logo_url && !logoFile && (
                <div className="mb-2">
                  <img 
                    src={project.logo_url} 
                    alt="Current logo" 
                    className="h-24 w-24 object-contain border rounded-md p-2"
                  />
                </div>
              )}
              <FileUpload
                label="Upload New Logo"
                onFileSelect={setLogoFile}
                onFileRemove={() => setLogoFile(null)}
                currentFile={logoFile}
                accept="image/*"
                validationOptions={{ maxSizeInMB: 5 }}
                validateImage={true}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Your Tracking Code</p>
              <code className="text-sm bg-background px-3 py-2 rounded block">
                {project.tracking_code}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                This code is used to track purchases from your community
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
