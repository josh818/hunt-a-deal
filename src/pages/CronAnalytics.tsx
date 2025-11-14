import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface JobRun {
  runid: number;
  jobid: number;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
}

const CronAnalytics = () => {
  const navigate = useNavigate();

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      return !error && data !== null;
    },
  });

  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate('/deals');
    }
  }, [isAdmin, checkingAdmin, navigate]);

  // Fetch cron jobs
  const { data: cronJobs } = useQuery({
    queryKey: ['cronJobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_jobs' as any);
      if (error) throw error;
      return data as unknown as CronJob[];
    },
    enabled: isAdmin === true,
  });

  // Fetch job run history
  const { data: jobRuns, isLoading: loadingRuns } = useQuery({
    queryKey: ['jobRuns'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_job_runs' as any);
      if (error) throw error;
      return data as unknown as JobRun[];
    },
    enabled: isAdmin === true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!jobRuns || !cronJobs) return null;

    const totalRuns = jobRuns.length;
    const successfulRuns = jobRuns.filter(run => run.status === 'succeeded').length;
    const failedRuns = jobRuns.filter(run => run.status === 'failed').length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    // Calculate average execution time
    const executionTimes = jobRuns
      .filter(run => run.end_time && run.start_time)
      .map(run => {
        const start = new Date(run.start_time).getTime();
        const end = new Date(run.end_time!).getTime();
        return (end - start) / 1000; // in seconds
      });
    
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    // Success rate over time (last 24 hours, grouped by hour)
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentRuns = jobRuns.filter(run => new Date(run.start_time) > last24Hours);
    
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hourStart = new Date(hour.setMinutes(0, 0, 0));
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const runsInHour = recentRuns.filter(run => {
        const runTime = new Date(run.start_time);
        return runTime >= hourStart && runTime < hourEnd;
      });

      const successful = runsInHour.filter(r => r.status === 'succeeded').length;
      const failed = runsInHour.filter(r => r.status === 'failed').length;
      const total = runsInHour.length;

      return {
        time: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        successRate: total > 0 ? (successful / total) * 100 : 0,
        successful,
        failed,
        avgTime: runsInHour.length > 0 
          ? runsInHour
              .filter(r => r.end_time)
              .map(r => (new Date(r.end_time!).getTime() - new Date(r.start_time).getTime()) / 1000)
              .reduce((a, b) => a + b, 0) / runsInHour.filter(r => r.end_time).length
          : 0,
      };
    });

    // Per-job statistics
    const jobStats = cronJobs.map(job => {
      const runs = jobRuns.filter(run => run.jobid === job.jobid);
      const successful = runs.filter(r => r.status === 'succeeded').length;
      const failed = runs.filter(r => r.status === 'failed').length;
      const total = runs.length;
      
      const times = runs
        .filter(r => r.end_time)
        .map(r => (new Date(r.end_time!).getTime() - new Date(r.start_time).getTime()) / 1000);
      
      return {
        name: job.jobname,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        totalRuns: total,
        successful,
        failed,
      };
    });

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate,
      avgExecutionTime,
      hourlyData,
      jobStats,
    };
  }, [jobRuns, cronJobs]);

  if (checkingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cron Job Analytics</h1>
          <p className="text-muted-foreground">
            Monitor performance trends and success metrics
          </p>
        </div>

        {loadingRuns ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !analytics ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No data available yet.</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.successfulRuns} of {analytics.totalRuns} successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.avgExecutionTime.toFixed(2)}s
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average across all jobs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful Runs</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.successfulRuns}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 50 runs tracked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.failedRuns}</div>
                  <p className="text-xs text-muted-foreground">
                    Requires attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trends">Success Trends</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="jobs">Per Job Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Success Rate - Last 24 Hours</CardTitle>
                    <CardDescription>
                      Hourly success rate percentage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="successRate"
                          stroke="hsl(var(--primary))"
                          name="Success Rate (%)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Job Executions - Last 24 Hours</CardTitle>
                    <CardDescription>
                      Successful vs Failed runs by hour
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="successful" fill="hsl(var(--primary))" name="Successful" />
                        <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Time Trends - Last 24 Hours</CardTitle>
                    <CardDescription>
                      Average execution time by hour (seconds)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgTime"
                          stroke="hsl(var(--chart-2))"
                          name="Avg Time (s)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Success Distribution</CardTitle>
                      <CardDescription>Overall success vs failure rate</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Successful', value: analytics.successfulRuns },
                              { name: 'Failed', value: analytics.failedRuns },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="jobs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Success Rate by Job</CardTitle>
                    <CardDescription>
                      Comparison of success rates across different jobs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.jobStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="successRate" fill="hsl(var(--primary))" name="Success Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Execution Time by Job</CardTitle>
                    <CardDescription>
                      Average execution time per job (seconds)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.jobStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgTime" fill="hsl(var(--chart-2))" name="Avg Time (s)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {analytics.jobStats.map((job) => (
                    <Card key={job.name}>
                      <CardHeader>
                        <CardTitle className="text-lg">{job.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Runs</p>
                            <p className="text-2xl font-bold">{job.totalRuns}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <p className="text-2xl font-bold">{job.successRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Successful</p>
                            <p className="text-2xl font-bold text-primary">{job.successful}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Failed</p>
                            <p className="text-2xl font-bold text-destructive">{job.failed}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Time</p>
                            <p className="text-2xl font-bold">{job.avgTime.toFixed(2)}s</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CronAnalytics;
