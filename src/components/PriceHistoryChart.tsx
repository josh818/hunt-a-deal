import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PriceHistoryChartProps {
  dealId: string;
}

interface PriceHistoryPoint {
  recorded_at: string;
  price: number;
  original_price: number | null;
}

export const PriceHistoryChart = ({ dealId }: PriceHistoryChartProps) => {
  const { data: priceHistory, isLoading } = useQuery({
    queryKey: ["price-history", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_price_history")
        .select("recorded_at, price, original_price")
        .eq("deal_id", dealId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data as PriceHistoryPoint[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return null;
  }

  const chartData = priceHistory.map((point) => ({
    date: format(new Date(point.recorded_at), "MMM d, h:mm a"),
    price: parseFloat(point.price.toString()),
    originalPrice: point.original_price ? parseFloat(point.original_price.toString()) : null,
  }));

  const latestPrice = chartData[chartData.length - 1].price;
  const oldestPrice = chartData[0].price;
  const priceChange = latestPrice - oldestPrice;
  const priceChangePercent = ((priceChange / oldestPrice) * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price History</CardTitle>
            <CardDescription>Track price changes over time</CardDescription>
          </div>
          {priceHistory.length > 1 && (
            <div className="flex items-center gap-2">
              {priceChange < 0 ? (
                <TrendingDown className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${priceChange < 0 ? "text-green-500" : "text-red-500"}`}>
                {priceChange < 0 ? "" : "+"}{priceChangePercent}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
              name="Current Price"
            />
            {chartData.some(d => d.originalPrice) && (
              <Line
                type="monotone"
                dataKey="originalPrice"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--muted-foreground))" }}
                name="Original Price"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
