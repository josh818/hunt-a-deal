import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star } from "lucide-react";
import { Deal } from "@/types/deal";

interface DealCardProps {
  deal: Deal;
  trackingCode: string;
}

export const DealCard = ({ deal, trackingCode }: DealCardProps) => {
  const savings = deal.originalPrice 
    ? ((deal.originalPrice - deal.price) / deal.originalPrice * 100).toFixed(0)
    : deal.discount;

  const getAmazonUrl = () => {
    const url = new URL(deal.productUrl);
    url.searchParams.set('tag', trackingCode);
    return url.toString();
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={deal.imageUrl} 
          alt={deal.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('placeholder.svg')) {
              target.src = '/placeholder.svg';
            }
          }}
        />
        {savings && (
          <Badge className="absolute right-2 top-2 bg-[hsl(var(--deal-badge))] text-[hsl(var(--deal-badge-foreground))] hover:bg-[hsl(var(--deal-badge))]">
            {savings}% OFF
          </Badge>
        )}
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

        {savings && (
          <div className="rounded-lg bg-[hsl(var(--savings-bg))] px-3 py-2">
            <p className="text-sm font-semibold text-[hsl(var(--savings-text))]">
              Save ${deal.originalPrice ? (deal.originalPrice - deal.price).toFixed(2) : '—'}
            </p>
          </div>
        )}

        <Button 
          className="w-full" 
          asChild
        >
          <a 
            href={getAmazonUrl()} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View Deal
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </Card>
  );
};
