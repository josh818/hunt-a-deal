import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  Link2, 
  Twitter, 
  Facebook, 
  MessageCircle, 
  Mail, 
  Share2,
  CalendarIcon
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
import { cn } from "@/lib/utils";

interface ShareAnalyticsProps {
  projectId?: string;
  showAllProjects?: boolean;
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

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

export const ShareAnalytics = ({ projectId, showAllProjects = false }: ShareAnalyticsProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const { data: shareData, isLoading } = useQuery({
    queryKey: ['share-analytics', projectId, showAllProjects, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('share_tracking')
        .select('platform, shared_at');

      // Filter by project if not showing all
      if (!showAllProjects && projectId) {
        query = query.eq('project_id', projectId);
      }

      // Apply date filters
      if (dateRange.from) {
        query = query.gte('shared_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('shared_at', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;

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
    enabled: showAllProjects || !!projectId,
  });

  const handlePresetClick = (days: number | null) => {
    setActivePreset(days);
    if (days === null) {
      setDateRange({ from: undefined, to: undefined });
    } else {
      setDateRange({
        from: subDays(new Date(), days),
        to: new Date(),
      });
    }
  };

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

  // Prepare chart data
  const chartData = (shareData || []).map(item => ({
    ...item,
    label: PLATFORM_CONFIG[item.platform]?.label || item.platform,
    fill: PLATFORM_CONFIG[item.platform]?.color || "hsl(var(--primary))",
  }));

  const dateRangeLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : dateRange.from
    ? `From ${format(dateRange.from, "MMM d, yyyy")}`
    : "All time";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Analytics
              {showAllProjects && <span className="text-sm font-normal text-muted-foreground">(All Projects)</span>}
            </CardTitle>
            <CardDescription>
              {totalShares} total share{totalShares !== 1 ? 's' : ''} • {dateRangeLabel}
            </CardDescription>
          </div>
          
          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={activePreset === preset.days ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                    setActivePreset(null);
                  }}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!shareData || shareData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Share2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              No shares in this time period.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );
};