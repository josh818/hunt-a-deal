import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Link2, 
  Twitter, 
  Facebook, 
  MessageCircle, 
  Mail, 
  Share2,
  TrendingUp
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface ShareAnalyticsProps {
  projectId: string;
}

interface ShareCount {
  platform: string;
  count: number;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  copy_link: { label: "Copy Link", icon: <Link2 className="h-4 w-4" />, color: "hsl(var(--primary))" },
  twitter: { label: "Twitter", icon: <Twitter className="h-4 w-4" />, color: "#1DA1F2" },
  facebook: { label: "Facebook", icon: <Facebook className="h-4 w-4" />, color: "#4267B2" },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, color: "#25D366" },
  email: { label: "Email", icon: <Mail className="h-4 w-4" />, color: "#EA4335" },
  native_share: { label: "Native Share", icon: <Share2 className="h-4 w-4" />, color: "#6366F1" },
};

export const ShareAnalytics = ({ projectId }: ShareAnalyticsProps) => {
  const { data: shareData, isLoading } = useQuery({
    queryKey: ['share-analytics', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_tracking')
        .select('platform')
        .eq('project_id', projectId);

      if (error) throw error;

      // Count shares by platform
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { platform: string }) => {
        counts[item.platform] = (counts[item.platform] || 0) + 1;
      });

      // Convert to array and sort by count
      const result: ShareCount[] = Object.entries(counts)
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count);

      return result;
    },
    enabled: !!projectId,
  });

  const totalShares = shareData?.reduce((sum, item) => sum + item.count, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!shareData || shareData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Analytics
          </CardTitle>
          <CardDescription>Track how your store is being shared</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Share2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              No shares yet. When visitors share your store, you'll see analytics here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = shareData.map(item => ({
    ...item,
    label: PLATFORM_CONFIG[item.platform]?.label || item.platform,
    fill: PLATFORM_CONFIG[item.platform]?.color || "hsl(var(--primary))",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Analytics
        </CardTitle>
        <CardDescription>
          {totalShares} total share{totalShares !== 1 ? 's' : ''} across all platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value} shares`, '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shareData.map((item) => {
            const config = PLATFORM_CONFIG[item.platform];
            const percentage = totalShares > 0 ? Math.round((item.count / totalShares) * 100) : 0;
            
            return (
              <div 
                key={item.platform}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
              >
                <div 
                  className="p-2 rounded-md" 
                  style={{ backgroundColor: `${config?.color}20` }}
                >
                  <span style={{ color: config?.color }}>
                    {config?.icon || <Share2 className="h-4 w-4" />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {config?.label || item.platform}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} ({percentage}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};