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
import { LOGO_VALIDATION_OPTIONS, generateSecureFilename } from "@/utils/fileValidation";
import { Footer } from "@/components/Footer";
import { Loader2, Store, MapPin, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserProject {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  tracking_code: string;
  is_active: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  total_earnings: number | null;
  pending_earnings: number | null;
  paid_earnings: number | null;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

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
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
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
        setProject(projectData as UserProject);
        setFormData({
          name: projectData.name,
          description: projectData.description || "",
          address_line1: projectData.address_line1 || "",
          address_line2: projectData.address_line2 || "",
          city: projectData.city || "",
          state: projectData.state || "",
          postal_code: projectData.postal_code || "",
          country: projectData.country || "US",
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    if (!project || !userId) return;

    setSaving(true);

    try {
      let logoUrl = project.logo_url;

      if (logoFile) {
        const secureFilename = generateSecureFilename(logoFile.name);
        const fileName = `${userId}/${secureFilename}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: logoFile.type,
          });

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
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          country: formData.country || "US",
        })
        .eq("id", project.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Your profile has been updated",
      });

      setProject({ ...project, ...formData, logo_url: logoUrl } as UserProject);
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
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your store profile and payment information</p>
        </div>

        <div className="grid gap-6">
          {/* Earnings Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Earnings Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary">
                    ${(project.total_earnings || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${(project.pending_earnings || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(project.paid_earnings || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Store Profile</CardTitle>
              </div>
              <CardDescription>
                Customize how your store appears to your community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
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
                  <Label>Tracking Code</Label>
                  <Input
                    value={project.tracking_code}
                    disabled
                    className="bg-muted font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell your community about your store..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-start gap-4">
                  {project.logo_url && !logoFile && (
                    <img 
                      src={project.logo_url} 
                      alt="Current logo" 
                      className="h-20 w-20 object-contain border rounded-md p-2 bg-background"
                    />
                  )}
                  <div className="flex-1">
                    <FileUpload
                      label="Upload New Logo"
                      onFileSelect={setLogoFile}
                      onFileRemove={() => setLogoFile(null)}
                      currentFile={logoFile}
                      accept=".jpg,.jpeg,.png,.webp"
                      validationOptions={LOGO_VALIDATION_OPTIONS}
                      validateImage={true}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPEG, or WebP only (max 2MB)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Address Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Payment Address</CardTitle>
              </div>
              <CardDescription>
                Address for receiving commission payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Street Address</Label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Apt, Suite, Unit (optional)</Label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="New York"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleSelectChange("state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP Code</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleSelectChange("country", value)}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            size="lg"
            className="w-full sm:w-auto sm:ml-auto"
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
