import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings, Check } from "lucide-react";
import { toast } from "sonner";

interface TrackingSettingsProps {
  trackingCode: string;
  onTrackingCodeChange: (code: string) => void;
}

export const TrackingSettings = ({ trackingCode, onTrackingCodeChange }: TrackingSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempCode, setTempCode] = useState(trackingCode);

  const handleSave = () => {
    onTrackingCodeChange(tempCode);
    setIsOpen(false);
    toast.success("Tracking code updated successfully!");
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
      >
        <Settings className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 p-4 shadow-xl z-50 animate-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Affiliate Tracking Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your affiliate tracking code to earn commissions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking-code">Tracking Code</Label>
              <Input
                id="tracking-code"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                placeholder="your-tag-20"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setTempCode(trackingCode);
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
