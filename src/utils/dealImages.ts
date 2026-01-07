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

function buildImageProxyUrl(productUrl: string, title: string, cacheBust?: boolean): string {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy`;
  const proxyUrl = new URL(base);
  proxyUrl.searchParams.set("url", productUrl);
  proxyUrl.searchParams.set("title", title);
  if (cacheBust) proxyUrl.searchParams.set("cb", String(Date.now()));
  return proxyUrl.toString();
}

export function getDealImageSrc(
  deal: Pick<Deal, "imageUrl" | "productUrl" | "title">,
  opts?: { cacheBust?: boolean }
): string {
  if (deal.imageUrl && deal.imageUrl.startsWith("http") && !isPlaceholderImageUrl(deal.imageUrl)) {
    return deal.imageUrl;
  }

  if (deal.productUrl && deal.productUrl.startsWith("http")) {
    return buildImageProxyUrl(deal.productUrl, deal.title, opts?.cacheBust);
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
