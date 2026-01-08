import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Calendar, Clock, Check, X, RefreshCw, Copy, Trash2, CheckCheck, ClipboardList, ExternalLink, Send, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  scheduled_for: string | null;
};

type DealInfo = {
  id: string;
  title: string;
  image_url: string;
};

export function ScheduledPostsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [schedulingPostId, setSchedulingPostId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

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
      toast.success("Post marked as posted", {
        description: "The post has been moved to the Posted tab",
      });
    },
  });

  const markAllPostedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts-stats"] });
      toast.success(`All pending posts marked as posted!`, {
        description: `${stats?.pending || 0} posts have been moved to the Posted tab`,
      });
    },
    onError: (error) => {
      toast.error("Failed to mark posts", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
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
      toast.success("Post deleted", {
        description: "The scheduled post has been removed",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete post", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
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
      toast.success("Post regenerated with AI", {
        description: "Fresh content has been generated for this post",
      });
    },
    onError: (error) => {
      toast.error("Failed to regenerate", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const schedulePostMutation = useMutation({
    mutationFn: async ({ postId, scheduledFor }: { postId: string; scheduledFor: string }) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ scheduled_for: scheduledFor })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      setSchedulingPostId(null);
      setScheduleDate("");
      setScheduleTime("");
      toast.success("Post scheduled!", {
        description: "You'll be reminded to post at the scheduled time",
      });
    },
    onError: (error) => {
      toast.error("Failed to schedule", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleSchedulePost = (postId: string) => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select date and time");
      return;
    }
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    schedulePostMutation.mutate({ postId, scheduledFor });
  };

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!", {
      description: `Ready to paste in ${platform}`,
    });
  };

  const copyAllPosts = () => {
    if (!posts?.length) return;
    const allTexts = posts.map((post, index) => {
      const deal = deals?.[post.deal_id];
      return `--- Post ${index + 1} (${post.platform}) ---\n${deal?.title || ''}\n\n${post.generated_text}`;
    }).join('\n\n');
    navigator.clipboard.writeText(allTexts);
    toast.success(`Copied ${posts.length} posts to clipboard!`, {
      description: "All pending posts are ready to share",
    });
  };

  const shareToWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    toast.success("Opening WhatsApp", {
      description: "Paste the post in your group",
    });
  };

  const shareAllToWhatsApp = () => {
    if (!posts?.length) return;
    const whatsappPosts = posts.filter(p => p.platform === "whatsapp");
    if (!whatsappPosts.length) {
      toast.error("No WhatsApp posts to share");
      return;
    }
    const allTexts = whatsappPosts.map((post) => post.generated_text).join('\n\n---\n\n');
    const encoded = encodeURIComponent(allTexts);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    toast.success(`Opening WhatsApp with ${whatsappPosts.length} posts`, {
      description: "Share all posts in your group",
    });
  };

  const shareToFacebook = (text: string) => {
    // Facebook doesn't allow pre-filled text, so we copy and open
    navigator.clipboard.writeText(text);
    window.open('https://www.facebook.com/', '_blank');
    toast.success("Opening Facebook", {
      description: "Text copied - paste it in your group",
    });
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
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="posted">Posted</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            {activeTab === "pending" && (stats?.pending || 0) > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={copyAllPosts}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  onClick={shareAllToWhatsApp}
                  className="gap-2 bg-green-50 hover:bg-green-100 border-green-200"
                >
                  <Send className="h-4 w-4 text-green-600" />
                  Share All to WhatsApp
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={markAllPostedMutation.isPending}
                      className="gap-2"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark All Posted ({stats?.pending})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark all posts as posted?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark {stats?.pending} pending post{stats?.pending !== 1 ? 's' : ''} as posted. 
                        Make sure you've already shared all the posts before confirming.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => markAllPostedMutation.mutate()}>
                        Yes, mark all as posted
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

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
                              {post.scheduled_for && (
                                <Badge variant="secondary" className="gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
                                </Badge>
                              )}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(post.generated_text, post.platform)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy to clipboard</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {post.platform === "whatsapp" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-green-50 hover:bg-green-100 border-green-200"
                                      onClick={() => shareToWhatsApp(post.generated_text)}
                                    >
                                      <ExternalLink className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Share to WhatsApp</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {post.platform === "facebook" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                                      onClick={() => shareToFacebook(post.generated_text)}
                                    >
                                      <ExternalLink className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Share to Facebook</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {activeTab === "pending" && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => markPostedMutation.mutate(post.id)}
                                        disabled={markPostedMutation.isPending}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as posted</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <Popover open={schedulingPostId === post.id} onOpenChange={(open) => {
                                  if (open) {
                                    setSchedulingPostId(post.id);
                                    // Set default to tomorrow at 9 AM
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setScheduleDate(format(tomorrow, 'yyyy-MM-dd'));
                                    setScheduleTime('09:00');
                                  } else {
                                    setSchedulingPostId(null);
                                  }
                                }}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={post.scheduled_for ? "bg-purple-50 border-purple-200" : ""}
                                          >
                                            <CalendarClock className={`h-4 w-4 ${post.scheduled_for ? "text-purple-600" : ""}`} />
                                          </Button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Schedule post time</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <PopoverContent className="w-72">
                                    <div className="space-y-4">
                                      <h4 className="font-medium">Schedule Post</h4>
                                      <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input
                                          type="date"
                                          value={scheduleDate}
                                          onChange={(e) => setScheduleDate(e.target.value)}
                                          min={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Time</Label>
                                        <Input
                                          type="time"
                                          value={scheduleTime}
                                          onChange={(e) => setScheduleTime(e.target.value)}
                                        />
                                      </div>
                                      <Button 
                                        className="w-full" 
                                        onClick={() => handleSchedulePost(post.id)}
                                        disabled={schedulePostMutation.isPending}
                                      >
                                        Set Schedule
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regeneratePostMutation.mutate(post)}
                                    disabled={regeneratePostMutation.isPending}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate with AI</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deletePostMutation.mutate(post.id)}
                                    disabled={deletePostMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete post</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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