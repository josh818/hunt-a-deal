import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Calendar, Clock, MessageSquare, Check, X, RefreshCw, Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";

type ScheduledPost = {
  id: string;
  deal_id: string;
  platform: string;
  generated_text: string;
  page_url: string;
  status: string;
  created_at: string;
  posted_at: string | null;
  error_message: string | null;
};

type DealInfo = {
  id: string;
  title: string;
  image_url: string;
};

export function ScheduledPostsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["scheduled-posts", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("status", activeTab)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ScheduledPost[];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["deals-for-posts", posts?.map(p => p.deal_id)],
    queryFn: async () => {
      if (!posts?.length) return {};
      const dealIds = [...new Set(posts.map(p => p.deal_id))];
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, image_url")
        .in("id", dealIds);

      if (error) throw error;
      return (data as DealInfo[]).reduce((acc, d) => ({ ...acc, [d.id]: d }), {} as Record<string, DealInfo>);
    },
    enabled: !!posts?.length,
  });

  const { data: stats } = useQuery({
    queryKey: ["scheduled-posts-stats"],
    queryFn: async () => {
      const [pending, posted, failed] = await Promise.all([
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("status", "posted"),
        supabase.from("scheduled_posts").select("id", { count: "exact" }).eq("status", "failed"),
      ]);
      return {
        pending: pending.count || 0,
        posted: posted.count || 0,
        failed: failed.count || 0,
      };
    },
  });

  const markPostedMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts-stats"] });
      toast.success("Post marked as posted");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts-stats"] });
      toast.success("Post deleted");
    },
  });

  const regeneratePostMutation = useMutation({
    mutationFn: async (post: ScheduledPost) => {
      const deal = deals?.[post.deal_id];
      if (!deal) throw new Error("Deal not found");

      const { data: fullDeal, error: dealError } = await supabase
        .from("deals")
        .select("*")
        .eq("id", post.deal_id)
        .single();

      if (dealError) throw dealError;

      const { data, error } = await supabase.functions.invoke("generate-social-post", {
        body: {
          deal: fullDeal,
          pageUrl: post.page_url,
          platform: post.platform,
        },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("scheduled_posts")
        .update({ generated_text: data.text, status: "pending", error_message: null })
        .eq("id", post.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      toast.success("Post regenerated");
    },
    onError: (error) => {
      toast.error("Failed to regenerate: " + (error instanceof Error ? error.message : "Unknown error"));
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "whatsapp":
        return "📱";
      case "facebook":
        return "📘";
      default:
        return "📝";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Posts
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-yellow-500" />
            Pending: {stats?.pending || 0}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4 text-green-500" />
            Posted: {stats?.posted || 0}
          </span>
          <span className="flex items-center gap-1">
            <X className="h-4 w-4 text-red-500" />
            Failed: {stats?.failed || 0}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="posted">Posted</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !posts?.length ? (
              <div className="text-center py-8 text-muted-foreground">No {activeTab} posts</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {posts.map((post) => {
                    const deal = deals?.[post.deal_id];
                    return (
                      <Card key={post.id} className="p-4">
                        <div className="flex gap-4">
                          {deal?.image_url && (
                            <img
                              src={deal.image_url}
                              alt={deal.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getPlatformIcon(post.platform)}</span>
                              <Badge variant="outline" className="capitalize">
                                {post.platform}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.created_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate mb-1">{deal?.title || post.deal_id}</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                              {post.generated_text}
                            </p>
                            {post.error_message && (
                              <p className="text-xs text-destructive mt-1">{post.error_message}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(post.generated_text)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {activeTab === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markPostedMutation.mutate(post.id)}
                                disabled={markPostedMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regeneratePostMutation.mutate(post)}
                              disabled={regeneratePostMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePostMutation.mutate(post.id)}
                              disabled={deletePostMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}