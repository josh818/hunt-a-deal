import { supabase } from "@/integrations/supabase/client";

interface TrackClickParams {
  dealId: string;
  projectId?: string;
  targetUrl: string;
}

/**
 * Tracks a click on a deal link through the edge function
 */
export async function trackClick({ dealId, projectId, targetUrl }: TrackClickParams): Promise<void> {
  try {
    // Call the track-click edge function
    await supabase.functions.invoke('track-click', {
      body: {
        dealId,
        projectId,
        targetUrl,
      },
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    // Don't throw - we don't want tracking failures to block navigation
  }
}
