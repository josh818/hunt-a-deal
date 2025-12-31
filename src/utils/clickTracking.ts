import { supabase } from "@/integrations/supabase/client";

interface TrackClickParams {
  dealId: string;
  projectId?: string;
  targetUrl: string;
}

interface TrackClickResponse {
  success?: boolean;
  redirectUrl?: string;
  tracked?: boolean;
  error?: string;
}

/**
 * Tracks a click on a deal link through the edge function.
 * The edge function applies tracking codes server-side to prevent manipulation.
 * Returns the server-verified URL with the correct tracking code applied.
 */
export async function trackClick({ dealId, projectId, targetUrl }: TrackClickParams): Promise<string | null> {
  try {
    // Call the track-click edge function which applies tracking codes server-side
    const { data, error } = await supabase.functions.invoke<TrackClickResponse>('track-click', {
      body: {
        dealId,
        projectId,
        targetUrl,
      },
    });

    if (error) {
      console.error('Error tracking click:', error);
      return null;
    }

    // Return the server-verified URL with correct tracking code
    if (data?.redirectUrl) {
      return data.redirectUrl;
    }

    return null;
  } catch (error) {
    console.error('Error tracking click:', error);
    // Don't throw - we don't want tracking failures to block navigation
    return null;
  }
}
