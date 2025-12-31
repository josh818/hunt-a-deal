import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { MousePointerClick, CalendarIcon, TrendingUp } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

interface ClickAnalyticsProps {
  projectId?: string;
  showAllProjects?: boolean;
}

interface DailyClicks {
  date: string;
  clicks: number;
}

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

export const ClickAnalytics = ({ projectId, showAllProjects = false }: ClickAnalyticsProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const { data: clickData, isLoading } = useQuery({
    queryKey: ['click-analytics', projectId, showAllProjects, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('click_tracking')
        .select('deal_id, clicked_at, project_id');

      // Filter by project if not showing all
      if (!showAllProjects && projectId) {
        query = query.eq('project_id', projectId);
      }

      // Apply date filters
      if (dateRange.from) {
        query = query.gte('clicked_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('clicked_at', endOfDay(dateRange.to).toISOString());
      }

      query = query.order('clicked_at', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Group clicks by date
      const dailyCounts: Record<string, number> = {};
      const uniqueDeals = new Set<string>();
      
      (data || []).forEach((item: { deal_id: string; clicked_at: string }) => {
        const date = format(new Date(item.clicked_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        uniqueDeals.add(item.deal_id);
      });

      // Convert to array for chart
      const dailyData: DailyClicks[] = Object.entries(dailyCounts)
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        dailyData,
        totalClicks: data?.length || 0,
        uniqueDeals: uniqueDeals.size,
      };
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

  const dateRangeLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
    : dateRange.from
    ? `From ${format(dateRange.from, "MMM d, yyyy")}`
    : "All time";

  // Format chart data with readable dates
  const chartData = (clickData?.dailyData || []).map(item => ({
    ...item,
    label: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Click Analytics
              {showAllProjects && <span className="text-sm font-normal text-muted-foreground">(All Projects)</span>}
            </CardTitle>
            <CardDescription>
              {clickData?.totalClicks || 0} total clicks • {clickData?.uniqueDeals || 0} unique deals • {dateRangeLabel}
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
        {!clickData || clickData.totalClicks === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MousePointerClick className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              No clicks in this time period.
            </p>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{clickData.totalClicks}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Unique Deals</p>
                <p className="text-2xl font-bold">{clickData.uniqueDeals}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg/Day</p>
                <p className="text-2xl font-bold">
                  {chartData.length > 0 
                    ? Math.round(clickData.totalClicks / chartData.length) 
                    : 0}
                </p>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value} clicks`, '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={chartData.length <= 30}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};