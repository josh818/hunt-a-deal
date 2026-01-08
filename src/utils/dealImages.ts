import type { Deal } from "@/types/deal";

const PLACEHOLDER_PATTERNS = [
  "placeholder.svg",
  "via.placeholder.com",
  "No+Image",
  "No%20Image",
];

export function isPlaceholderImageUrl(url?: string | null): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => u.includes(p.toLowerCase()));
}

function isAmazonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("amazon.com") || 
           parsed.hostname.includes("amazon.co") ||
           parsed.hostname.includes("amzn.");
  } catch {
    return false;
  }
}

function buildImageProxyUrl(productUrl: string, title: string, cacheBust?: boolean): string | null {
  // Only use image proxy for Amazon URLs
  if (!isAmazonUrl(productUrl)) {
    return null;
  }
  
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy`;
  const proxyUrl = new URL(base);
  proxyUrl.searchParams.set("url", productUrl);
  proxyUrl.searchParams.set("title", title);
  if (cacheBust) proxyUrl.searchParams.set("cb", String(Date.now()));
  return proxyUrl.toString();
}

export function getDealImageSrc(
  deal: Pick<Deal, "imageUrl" | "productUrl" | "title"> & { verifiedImageUrl?: string },
  opts?: { cacheBust?: boolean }
): string {
  // Priority 1: Use verified image URL if available
  if (deal.verifiedImageUrl && deal.verifiedImageUrl.startsWith("http")) {
    return deal.verifiedImageUrl;
  }

  // Priority 2: Use original image URL if it's valid and not a placeholder
  if (deal.imageUrl && deal.imageUrl.startsWith("http") && !isPlaceholderImageUrl(deal.imageUrl)) {
    return deal.imageUrl;
  }

  // Priority 3: Try fetching via image proxy (only for Amazon URLs)
  if (deal.productUrl && deal.productUrl.startsWith("http")) {
    const proxyUrl = buildImageProxyUrl(deal.productUrl, deal.title, opts?.cacheBust);
    if (proxyUrl) {
      return proxyUrl;
    }
  }

  return "/placeholder.svg";
}

export function prefetchImage(src: string, timeoutMs = 8000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      // Natural size is the closest we get to "sure" client-side.
      resolve((img.naturalWidth || 0) > 1 && (img.naturalHeight || 0) > 1);
    };
    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    img.src = src;
  });
}
