// Utility functions for Amazon tracking code management

const TRACKING_CODE = "joshrelay-20";

/**
 * Checks if a string is a valid absolute URL
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Replaces or adds Amazon affiliate tracking code to a URL
 * Safely handles relative URLs by returning them unchanged
 */
export function replaceTrackingCode(url: string, trackingCode: string = TRACKING_CODE): string {
  // Return relative URLs unchanged - they're not Amazon links
  if (!url || !isAbsoluteUrl(url)) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // Only process Amazon URLs
    if (!urlObj.hostname.includes('amazon.')) {
      return url;
    }
    
    // Set or replace the tag parameter
    urlObj.searchParams.set('tag', trackingCode);
    
    return urlObj.toString();
  } catch (error) {
    // Silently return original URL for any parsing errors
    return url;
  }
}

/**
 * Extracts the tracking code from an Amazon URL
 */
export function extractTrackingCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('tag');
  } catch (error) {
    console.error('Error extracting tracking code:', error);
    return null;
  }
}

/**
 * Gets the default tracking code
 */
export function getDefaultTrackingCode(): string {
  return TRACKING_CODE;
}
