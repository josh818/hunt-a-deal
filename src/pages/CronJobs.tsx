import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Play, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

interface JobRun {
  runid: number;
  jobid: number;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

const CronJobs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);

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
  const { data: cronJobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['cronJobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      if (error) {
        console.error('Error fetching cron jobs:', error);
        throw error;
      }
      return data as CronJob[];
    },
    enabled: isAdmin === true,
  });

  // Fetch job run history
  const { data: jobRuns, isLoading: loadingRuns } = useQuery({
    queryKey: ['jobRuns'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_job_runs');
      if (error) {
        console.error('Error fetching job runs:', error);
        throw error;
      }
      return data as JobRun[];
    },
    enabled: isAdmin === true,
  });

  // Manual trigger mutation
  const triggerSync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-deals', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully synced ${data.count} deals`);
      queryClient.invalidateQueries({ queryKey: ['jobRuns'] });
    },
    onError: (error: any) => {
      console.error('Error triggering sync:', error);
      toast.error(error.message || "Failed to trigger sync");
    },
  });

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      await triggerSync.mutateAsync();
    } finally {
      setTriggering(false);
    }
  };

  const getLastRun = (jobName: string) => {
    if (!jobRuns) return null;
    
    // Find the most recent run for this job
    const runs = jobRuns.filter((run: JobRun) => {
      const job = cronJobs?.find((j) => j.jobid === run.jobid);
      return job?.jobname === jobName;
    });
    
    return runs.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )[0];
  };

  const formatSchedule = (schedule: string) => {
    // Convert cron format to human-readable
    if (schedule === '0 * * * *') return 'Every hour';
    if (schedule === '* * * * *') return 'Every minute';
    if (schedule === '0 0 * * *') return 'Daily at midnight';
    return schedule;
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
          <h1 className="text-4xl font-bold mb-2">Cron Jobs Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage scheduled tasks
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Manual Trigger Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Manual Trigger
              </CardTitle>
              <CardDescription>
                Manually trigger the deal sync function
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleManualTrigger} 
                disabled={triggering}
                className="gap-2"
              >
                {triggering ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Trigger Sync Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Scheduled Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Jobs
              </CardTitle>
              <CardDescription>
                View all scheduled cron jobs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : cronJobs && cronJobs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Last Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cronJobs.map((job) => {
                        const lastRun = getLastRun(job.jobname);
                        return (
                          <TableRow key={job.jobid}>
                            <TableCell className="font-medium">
                              {job.jobname}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {formatSchedule(job.schedule)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {job.active ? (
                                <Badge className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {lastRun ? (
                                <span className="text-sm text-muted-foreground">
                                  {new Date(lastRun.start_time).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  Never run
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lastRun ? (
                                lastRun.status === 'succeeded' ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Success
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Failed
                                  </Badge>
                                )
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No cron jobs found. Create one to get started.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Recent Job Runs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Recent Job Runs
              </CardTitle>
              <CardDescription>
                View the most recent job executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRuns ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : jobRuns && jobRuns.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobRuns.slice(0, 10).map((run) => {
                        const job = cronJobs?.find((j) => j.jobid === run.jobid);
                        return (
                          <TableRow key={run.runid}>
                            <TableCell className="font-medium">
                              {job?.jobname || `Job #${run.jobid}`}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(run.start_time).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {run.end_time ? 
                                new Date(run.end_time).toLocaleString() : 
                                <span className="italic">Running...</span>
                              }
                            </TableCell>
                            <TableCell>
                              {run.status === 'succeeded' ? (
                                <Badge variant="default">Success</Badge>
                              ) : run.status === 'failed' ? (
                                <Badge variant="destructive">Failed</Badge>
                              ) : (
                                <Badge variant="secondary">{run.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {run.return_message || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No job runs recorded yet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CronJobs;
