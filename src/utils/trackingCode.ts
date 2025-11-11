// Utility functions for Amazon tracking code management

const TRACKING_CODE = "relaystation1-20";

/**
 * Replaces or adds Amazon affiliate tracking code to a URL
 */
export function replaceTrackingCode(url: string, trackingCode: string = TRACKING_CODE): string {
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
    console.error('Error replacing tracking code:', error);
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
