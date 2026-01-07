import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Image, CheckCircle, XCircle, Clock, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export function AdminImageStatus() {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["deal-image-stats"],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from("deals")
        .select("id, image_ready, image_retry_count, image_last_checked");

      if (error) throw error;

      const total = deals?.length || 0;
      const ready = deals?.filter((d) => d.image_ready).length || 0;
      const pending = deals?.filter((d) => !d.image_ready && (d.image_retry_count || 0) < 5).length || 0;
      const failed = deals?.filter((d) => !d.image_ready && (d.image_retry_count || 0) >= 5).length || 0;

      return { total, ready, pending, failed };
    },
    refetchInterval: 30000,
  });

  const { data: pendingDeals } = useQuery({
    queryKey: ["pending-image-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, image_url, image_retry_count, image_last_checked")
        .eq("image_ready", false)
        .lt("image_retry_count", 5)
        .order("image_last_checked", { ascending: true, nullsFirst: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const verifyMutation = useMutation({
    mutationFn: async (dealId?: string) => {
      const { data, error } = await supabase.functions.invoke("verify-deal-images", {
        body: dealId ? { dealId, batchSize: 1 } : { batchSize: 20 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-image-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pending-image-deals"] });
      toast.success(`Verified ${data.verified} images, ${data.needRetry} need retry`);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const resetRetryMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from("deals")
        .update({ image_retry_count: 0, image_ready: false } as never)
        .gte("image_retry_count", 5);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-image-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pending-image-deals"] });
      toast.success("Reset failed deals for retry");
    },
    onError: (error) => {
      toast.error(`Reset failed: ${error.message}`);
    },
  });

  const handleBatchVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyMutation.mutateAsync(undefined);
    } finally {
      setIsVerifying(false);
    }
  };

  const readyPercent = stats ? Math.round((stats.ready / stats.total) * 100) || 0 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Status
          </CardTitle>
          <CardDescription className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-green-500" />
            Auto-verifies every 10 min
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {(stats?.failed || 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetRetryMutation.mutate()}
              disabled={resetRetryMutation.isPending}
            >
              {resetRetryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reset Failed"
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleBatchVerify}
            disabled={isVerifying || verifyMutation.isPending}
          >
            {isVerifying || verifyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Verify Images
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Images Ready</span>
                <span className="font-medium">{readyPercent}%</span>
              </div>
              <Progress value={readyPercent} className="h-2" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.ready || 0}</p>
                  <p className="text-xs text-muted-foreground">Ready</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>

            {/* Pending deals list */}
            {pendingDeals && pendingDeals.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">Pending Verification</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {pendingDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                    >
                      <span className="truncate max-w-[200px]" title={deal.title}>
                        {deal.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {deal.image_retry_count || 0}/5 retries
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => verifyMutation.mutate(deal.id)}
                          disabled={verifyMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
