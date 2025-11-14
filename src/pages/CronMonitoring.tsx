import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Clock,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface JobHealth {
  id: string;
  job_id: number;
  job_name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  uptime_percentage: number;
  alert_sent: boolean;
  updated_at: string;
}

const CronMonitoring = () => {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<JobHealth[]>([]);

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

  // Fetch initial job health data
  const { data: initialHealth, isLoading } = useQuery({
    queryKey: ['cronHealth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_job_health' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as JobHealth[];
    },
    enabled: isAdmin === true,
  });

  // Set initial data
  useEffect(() => {
    if (initialHealth) {
      setHealthData(initialHealth);
    }
  }, [initialHealth]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('cron-health-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cron_job_health'
        },
        (payload) => {
          console.log('Health update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newHealth = payload.new as JobHealth;
            
            setHealthData(prev => {
              const index = prev.findIndex(h => h.job_id === newHealth.job_id);
              if (index >= 0) {
                // Update existing
                const updated = [...prev];
                updated[index] = newHealth;
                return updated;
              } else {
                // Add new
                return [newHealth, ...prev];
              }
            });

            // Show alert for critical status
            if (newHealth.status === 'critical' && !newHealth.alert_sent) {
              toast.error(
                `Critical Alert: ${newHealth.job_name} has ${newHealth.consecutive_failures} consecutive failures!`,
                { duration: 10000 }
              );
            } else if (newHealth.status === 'warning' && !newHealth.alert_sent) {
              toast.warning(
                `Warning: ${newHealth.job_name} health degraded (${newHealth.consecutive_failures} failures)`,
                { duration: 5000 }
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setHealthData(prev => prev.filter(h => h.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Calculate overall stats
  const overallStats = {
    totalJobs: healthData.length,
    healthyJobs: healthData.filter(h => h.status === 'healthy').length,
    warningJobs: healthData.filter(h => h.status === 'warning').length,
    criticalJobs: healthData.filter(h => h.status === 'critical').length,
    averageUptime: healthData.length > 0 
      ? healthData.reduce((sum, h) => sum + h.uptime_percentage, 0) / healthData.length 
      : 100,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", className: string }> = {
      healthy: { variant: "default", className: "bg-green-500 hover:bg-green-600" },
      warning: { variant: "secondary", className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
      critical: { variant: "destructive", className: "" },
      unknown: { variant: "outline", className: "" },
    };
    const config = variants[status] || variants.unknown;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 95) return 'text-green-500';
    if (uptime >= 90) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (checkingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Cron Job Monitoring</h1>
          </div>
          <p className="text-muted-foreground">
            Real-time health monitoring and uptime tracking
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live monitoring active</span>
          </div>
        </div>

        {/* Overall Health Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                Active cron jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy Jobs</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {overallStats.healthyJobs}
              </div>
              <p className="text-xs text-muted-foreground">
                No issues detected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {overallStats.warningJobs}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {overallStats.criticalJobs}
              </div>
              <p className="text-xs text-muted-foreground">
                Immediate action needed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Average Uptime */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Uptime
            </CardTitle>
            <CardDescription>
              Average uptime across all cron jobs (last 100 runs)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-4xl font-bold ${getUptimeColor(overallStats.averageUptime)}`}>
                  {overallStats.averageUptime.toFixed(2)}%
                </span>
                <Badge variant={overallStats.averageUptime >= 95 ? "default" : overallStats.averageUptime >= 90 ? "secondary" : "destructive"}>
                  {overallStats.averageUptime >= 99 ? "Excellent" : overallStats.averageUptime >= 95 ? "Good" : overallStats.averageUptime >= 90 ? "Fair" : "Poor"}
                </Badge>
              </div>
              <Progress value={overallStats.averageUptime} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        {overallStats.criticalJobs > 0 && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Jobs Detected</AlertTitle>
            <AlertDescription>
              {overallStats.criticalJobs} job{overallStats.criticalJobs > 1 ? 's are' : ' is'} in critical state. 
              Immediate attention required to restore normal operation.
            </AlertDescription>
          </Alert>
        )}

        {/* Individual Job Health Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Job Health Status</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : healthData.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No health data available yet. Jobs will appear here once they run.
                </p>
              </CardContent>
            </Card>
          ) : (
            healthData.map((health) => (
              <Card key={health.id} className={health.status === 'critical' ? 'border-destructive' : health.status === 'warning' ? 'border-yellow-500' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(health.status)}
                      <div>
                        <CardTitle>{health.job_name}</CardTitle>
                        <CardDescription>
                          Last updated: {new Date(health.updated_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(health.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Uptime */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Uptime</span>
                      </div>
                      <div className={`text-2xl font-bold ${getUptimeColor(health.uptime_percentage)}`}>
                        {health.uptime_percentage.toFixed(2)}%
                      </div>
                      <Progress value={health.uptime_percentage} className="h-1" />
                      <p className="text-xs text-muted-foreground">
                        {health.successful_runs}/{health.total_runs} successful
                      </p>
                    </div>

                    {/* Consecutive Failures */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Failures</span>
                      </div>
                      <div className={`text-2xl font-bold ${health.consecutive_failures > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {health.consecutive_failures}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Consecutive failures
                      </p>
                    </div>

                    {/* Last Success */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Last Success</span>
                      </div>
                      <div className="text-sm">
                        {health.last_success_at ? (
                          <>
                            <div className="font-medium">
                              {new Date(health.last_success_at).toLocaleDateString()}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(health.last_success_at).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Never</span>
                        )}
                      </div>
                    </div>

                    {/* Last Failure */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Last Failure</span>
                      </div>
                      <div className="text-sm">
                        {health.last_failure_at ? (
                          <>
                            <div className="font-medium text-red-500">
                              {new Date(health.last_failure_at).toLocaleDateString()}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(health.last_failure_at).toLocaleTimeString()}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Never</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alert Indicator */}
                  {health.consecutive_failures >= 3 && (
                    <Alert variant={health.consecutive_failures >= 5 ? "destructive" : "default"} className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {health.consecutive_failures >= 5 
                          ? `Critical: ${health.consecutive_failures} consecutive failures detected. Immediate action required.`
                          : `Warning: ${health.consecutive_failures} consecutive failures. Please investigate.`
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CronMonitoring;
