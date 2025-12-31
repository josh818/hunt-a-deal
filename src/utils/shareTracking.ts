import { supabase } from "@/integrations/supabase/client";

export type SharePlatform = 
  | 'copy_link' 
  | 'twitter' 
  | 'facebook' 
  | 'whatsapp' 
  | 'email' 
  | 'native_share';

interface TrackShareParams {
  projectId: string;
  platform: SharePlatform;
}

export const trackShare = async ({ projectId, platform }: TrackShareParams): Promise<void> => {
  try {
    // Privacy-compliant: no user agent or referer stored
    const { error } = await supabase
      .from('share_tracking')
      .insert({
        project_id: projectId,
        platform,
      });

    if (error) {
      console.error("Failed to track share:", error);
    }
  } catch (err) {
    // Silently fail - don't interrupt user experience for analytics
    console.error("Share tracking error:", err);
  }
};