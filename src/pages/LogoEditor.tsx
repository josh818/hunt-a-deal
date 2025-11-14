import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import { toast } from "sonner";
import { Download, Wand2 } from "lucide-react";
import logoSimple from "@/assets/relay-station-icon-simple.png";

export default function LogoEditor() {
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleRemoveBackground = async () => {
    setProcessing(true);
    try {
      const response = await fetch(logoSimple);
      const blob = await response.blob();
      const image = await loadImage(blob);
      
      toast.info("Processing image... This may take a minute.");
      const result = await removeBackground(image);
      
      const url = URL.createObjectURL(result);
      setResultUrl(url);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to remove background");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "relay-station-logo-transparent.png";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Logo Editor</h1>
            <p className="text-muted-foreground">Remove background from the logo</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Original Logo</h2>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8">
                <img src={logoSimple} alt="Original logo" className="max-w-full max-h-full" />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Transparent Logo</h2>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8 relative">
                {resultUrl ? (
                  <img src={resultUrl} alt="Logo without background" className="max-w-full max-h-full" />
                ) : (
                  <p className="text-muted-foreground">No result yet</p>
                )}
              </div>
            </Card>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleRemoveBackground}
              disabled={processing}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {processing ? "Processing..." : "Remove Background"}
            </Button>
            {resultUrl && (
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
