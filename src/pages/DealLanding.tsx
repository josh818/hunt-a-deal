import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Deal } from "@/types/deal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Star, ArrowLeft, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  deal_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const DealLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    const code = localStorage.getItem("amazonTrackingCode") || "";
    setTrackingCode(code);
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.original_price,
        discount: data.discount,
        imageUrl: data.image_url,
        productUrl: data.product_url,
        category: data.category,
        rating: data.rating,
        reviewCount: data.review_count,
        brand: data.brand,
        inStock: data.in_stock,
      } as Deal;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Comment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error("You must be logged in to comment");
      }

      const { error } = await supabase
        .from("comments")
        .insert({
          deal_id: id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Anonymous",
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      setComment("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">Deal not found</div>
      </div>
    );
  }

  const savings = deal.originalPrice 
    ? ((deal.originalPrice - deal.price) / deal.originalPrice * 100).toFixed(0)
    : deal.discount;

  const getAmazonUrl = () => {
    const url = new URL(deal.productUrl);
    if (trackingCode) {
      url.searchParams.set('tag', trackingCode);
    }
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/deals")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deals
        </Button>

        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            <div className="relative aspect-square overflow-hidden bg-muted rounded-lg">
              <img 
                src={deal.imageUrl} 
                alt={deal.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('placeholder.svg')) {
                    target.src = '/placeholder.svg';
                  }
                }}
              />
              {savings && (
                <Badge className="absolute right-2 top-2 bg-[hsl(var(--deal-badge))] text-[hsl(var(--deal-badge-foreground))]">
                  {savings}% OFF
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {deal.brand && (
                <p className="text-sm font-medium text-muted-foreground">{deal.brand}</p>
              )}
              
              <h1 className="text-3xl font-bold leading-tight">{deal.title}</h1>
              
              {deal.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    <span className="text-lg font-medium">{deal.rating}</span>
                  </div>
                  {deal.reviewCount && (
                    <span className="text-sm text-muted-foreground">
                      ({deal.reviewCount.toLocaleString()} reviews)
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[hsl(var(--price-highlight))]">
                  ${deal.price.toFixed(2)}
                </span>
                {deal.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ${deal.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {savings && (
                <div className="rounded-lg bg-[hsl(var(--savings-bg))] px-4 py-3">
                  <p className="text-lg font-semibold text-[hsl(var(--savings-text))]">
                    Save ${deal.originalPrice ? (deal.originalPrice - deal.price).toFixed(2) : '—'}
                  </p>
                </div>
              )}

              {deal.description && (
                <p className="text-muted-foreground">{deal.description}</p>
              )}

              <Button 
                size="lg"
                className="w-full" 
                asChild
              >
                <a 
                  href={getAmazonUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Deal on Amazon
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
          </div>

          <div className="space-y-4">
            {user ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Share your thoughts about this deal..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={() => addCommentMutation.mutate(comment)}
                  disabled={!comment.trim() || addCommentMutation.isPending}
                >
                  Post Comment
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-2">Sign in to leave a comment</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            )}

            <div className="space-y-4 mt-6">
              {comments.map((comment) => (
                <Card key={comment.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{comment.user_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </Card>
              ))}

              {comments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DealLanding;