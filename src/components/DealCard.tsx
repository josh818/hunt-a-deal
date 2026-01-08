import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, ImageOff, Copy, Check, Clock, AlertTriangle, Share2, Facebook, Twitter, MessageCircle, Link as LinkIcon } from "lucide-react";
import { Deal } from "@/types/deal";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { replaceTrackingCode } from "@/utils/trackingCode";
import { trackClick } from "@/utils/clickTracking";
import { trackShare } from "@/utils/shareTracking";
import { getDealImageSrc } from "@/utils/dealImages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DealCardProps {
  deal: Deal;
  trackingCode: string;
  projectId?: string;
}

export const DealCard = ({ deal, trackingCode, projectId }: DealCardProps) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const savings = deal.originalPrice 
    ? Math.max(0, ((deal.originalPrice - deal.price) / deal.originalPrice * 100))
    : deal.discount;
  const savingsDisplay = savings && savings > 0 ? savings.toFixed(0) : null;
  
  // Generate deal link for sharing
  // When on a project page (slug exists), always use project URL to preserve tracking
  // When on general deals page, use the generic deal URL
  const getDealShareUrl = () => {
    const baseUrl = window.location.origin;
    // If we have a slug from the URL, always use the project URL to preserve tracking
    if (slug) {
      return `${baseUrl}/project/${slug}/deal/${deal.id}`;
    }
    // For non-project pages, use generic deal URL (uses default Relay Station tracking)
    return `${baseUrl}/deal/${deal.id}`;
  };
  
  // Only show "may have expired" for deals posted more than 48 hours ago
  // Use fetchedAt as fallback if postedAt is not available
  const dealDate = deal.postedAt ? new Date(deal.postedAt) : (deal.fetchedAt ? new Date(deal.fetchedAt) : null);
  const isDealExpired = dealDate ? differenceInHours(new Date(), dealDate) > 48 : false;

  const handleCopyCoupon = async () => {
    if (deal.couponCode) {
      await navigator.clipboard.writeText(deal.couponCode);
      setCopied(true);
      toast({
        title: "Coupon copied!",
        description: `Code "${deal.couponCode}" copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareDeal = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    const shareUrl = getDealShareUrl();
    const shareText = `Check out this deal: ${deal.title} - $${deal.price.toFixed(2)}${savingsDisplay ? ` (${savingsDisplay}% OFF)` : ''}`;
    
    // Track the share - only if we have a projectId (on project pages)
    // Note: The share URL already includes the project slug if on a project page,
    // which ensures the recipient uses the project's tracking code when they click through
    if (projectId) {
      const platformMap: Record<string, 'facebook' | 'twitter' | 'whatsapp' | 'copy_link'> = {
        'facebook': 'facebook',
        'twitter': 'twitter',
        'whatsapp': 'whatsapp',
        'copy': 'copy_link'
      };
      await trackShare({ projectId, platform: platformMap[platform] || 'copy_link' });
    }
    // When not on a project page, sharing still works but uses default Relay Station tracking
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        break;
      case 'copy':
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Deal link copied to clipboard",
        });
        break;
    }
  };

  // Apply tracking code to product URL (for display purposes)
  // The actual tracking code will be applied server-side when clicked
  const displayUrl = replaceTrackingCode(deal.productUrl, trackingCode);

  const handleDealClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Track the click and get the server-verified URL
    const serverVerifiedUrl = await trackClick({
      dealId: deal.id,
      projectId,
      targetUrl: deal.productUrl, // Send original URL, server will apply tracking code
    });

    // Redirect to the server-verified URL, or fallback to display URL
    window.open(serverVerifiedUrl || displayUrl, '_blank', 'noopener,noreferrer');
  };

  const imageSrc = getDealImageSrc({
    imageUrl: deal.imageUrl,
    productUrl: deal.productUrl,
    title: deal.title,
    verifiedImageUrl: deal.verifiedImageUrl,
  });

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg flex flex-col h-full text-sm sm:text-base">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
        )}
        {imageError ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-muted">
            <div className="text-center p-4">
              <p className="font-semibold text-sm text-primary mb-1">Relay Station</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{deal.title}</p>
              <p className="text-xs text-muted-foreground mt-2">Image Loading Failed</p>
            </div>
          </div>
        ) : (
          <img 
            src={imageSrc} 
            alt={deal.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              // Try placeholder first, then show error state
              if (!img.src.includes('placeholder.svg') && !imageError) {
                img.src = '/placeholder.svg';
              } else {
                setImageError(true);
              }
            }}
          />
        )}
        <div className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 flex flex-col gap-1 sm:gap-2">
          {savingsDisplay && (
            <Badge className="bg-[hsl(var(--deal-badge))] text-[hsl(var(--deal-badge-foreground))] hover:bg-[hsl(var(--deal-badge))] text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              {savingsDisplay}% OFF
            </Badge>
          )}
          {isDealExpired && (
            <Badge variant="destructive" className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">May Have Expired</span>
              <span className="sm:hidden">Expired?</span>
            </Badge>
          )}
        </div>
        {deal.category && deal.category !== "Amazon" && (
          <div className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              {deal.category}
            </Badge>
          </div>
        )}
        {deal.inStock === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>
      
      <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col">
        {deal.brand && (
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{deal.brand}</p>
        )}
        
        {deal.postedAt && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
            <span className="truncate">Posted {formatDistanceToNow(new Date(deal.postedAt), { addSuffix: true })}</span>
          </div>
        )}
        
        <h3 className="line-clamp-2 text-sm sm:text-base font-semibold leading-tight">{deal.title}</h3>
        
        {deal.rating && (
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-accent text-accent" />
              <span className="text-xs sm:text-sm font-medium">{deal.rating}</span>
            </div>
            {deal.reviewCount && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                ({deal.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-lg sm:text-2xl font-bold text-[hsl(var(--price-highlight))]">
            ${deal.price.toFixed(2)}
          </span>
          {deal.originalPrice && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              ${deal.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {deal.fetchedAt && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>Price as of {formatDistanceToNow(new Date(deal.fetchedAt), { addSuffix: true })}</span>
          </div>
        )}

        <p className="text-[10px] sm:text-xs text-muted-foreground italic hidden sm:block">
          *Prices may change. Check retailer's website.
        </p>

        {savings && savings > 0 && deal.originalPrice && (
          <div className="rounded-md sm:rounded-lg bg-[hsl(var(--savings-bg))] px-2 py-1.5 sm:px-3 sm:py-2">
            <p className="text-xs sm:text-sm font-semibold text-[hsl(var(--savings-text))]">
              Save ${(deal.originalPrice - deal.price).toFixed(2)}
            </p>
          </div>
        )}

        {deal.couponCode && (
          <div className="rounded-md sm:rounded-lg border border-dashed border-primary/50 bg-primary/5 px-2 py-1.5 sm:px-3 sm:py-2">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Coupon</p>
                <code className="text-xs sm:text-sm font-mono font-bold text-primary truncate block">{deal.couponCode}</code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCoupon}
                className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                {copied ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1 min-h-1" />

        <div className="flex gap-2">
          <Button 
            className="flex-1 h-8 sm:h-10 text-xs sm:text-sm" 
            asChild
          >
            <a
              href={displayUrl}
              onClick={handleDealClick}
            >
              <span className="sm:hidden">View Deal</span>
              <span className="hidden sm:inline">View Deal</span>
              <ExternalLink className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </a>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShareDeal('facebook')}>
                <Facebook className="mr-2 h-4 w-4" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShareDeal('twitter')}>
                <Twitter className="mr-2 h-4 w-4" />
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShareDeal('whatsapp')}>
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShareDeal('copy')}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};