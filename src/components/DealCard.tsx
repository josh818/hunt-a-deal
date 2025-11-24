import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, ImageOff, Copy, Check, Clock, AlertTriangle } from "lucide-react";
import { Deal } from "@/types/deal";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { replaceTrackingCode } from "@/utils/trackingCode";

interface DealCardProps {
  deal: Deal;
  trackingCode: string;
}

export const DealCard = ({ deal, trackingCode }: DealCardProps) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const savings = deal.originalPrice 
    ? Math.max(0, ((deal.originalPrice - deal.price) / deal.originalPrice * 100))
    : deal.discount;
  const savingsDisplay = savings && savings > 0 ? savings.toFixed(0) : null;
  
  const isDealExpired = deal.postedAt 
    ? differenceInHours(new Date(), new Date(deal.postedAt)) > 25
    : false;

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

  // Apply tracking code to product URL
  const trackedUrl = replaceTrackingCode(deal.productUrl, trackingCode);

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
        )}
        {imageError ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-muted">
            <ImageOff className="h-16 w-16 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Image unavailable</p>
          </div>
        ) : (
          <img 
            src={deal.imageUrl} 
            alt={deal.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.src.includes('placeholder.svg')) {
                img.src = '/placeholder.svg';
              } else {
                setImageError(true);
              }
            }}
          />
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          {savingsDisplay && (
            <Badge className="bg-[hsl(var(--deal-badge))] text-[hsl(var(--deal-badge-foreground))] hover:bg-[hsl(var(--deal-badge))]">
              {savingsDisplay}% OFF
            </Badge>
          )}
          {isDealExpired && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              May Have Expired
            </Badge>
          )}
        </div>
        {deal.inStock === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        {deal.brand && (
          <p className="text-sm font-medium text-muted-foreground">{deal.brand}</p>
        )}
        
        {deal.postedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Posted {formatDistanceToNow(new Date(deal.postedAt), { addSuffix: true })}</span>
          </div>
        )}
        
        <h3 className="line-clamp-2 font-semibold leading-tight">{deal.title}</h3>
        
        {deal.rating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{deal.rating}</span>
            </div>
            {deal.reviewCount && (
              <span className="text-sm text-muted-foreground">
                ({deal.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[hsl(var(--price-highlight))]">
            ${deal.price.toFixed(2)}
          </span>
          {deal.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${deal.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {deal.fetchedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>Price as of {formatDistanceToNow(new Date(deal.fetchedAt), { addSuffix: true })}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          *Prices may change at any time. Check current price on retailer's website.
        </p>

        {savings && (
          <div className="rounded-lg bg-[hsl(var(--savings-bg))] px-3 py-2">
            <p className="text-sm font-semibold text-[hsl(var(--savings-text))]">
              Save ${deal.originalPrice ? (deal.originalPrice - deal.price).toFixed(2) : '—'}
            </p>
          </div>
        )}

        {deal.couponCode && (
          <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Coupon Code</p>
                <code className="text-sm font-mono font-bold text-primary">{deal.couponCode}</code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCoupon}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <Button 
          className="w-full" 
          asChild
        >
          <a
            href={trackedUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            View Deal on Amazon
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </Card>
  );
};
