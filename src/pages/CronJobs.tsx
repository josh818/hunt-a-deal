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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Play, RefreshCw, AlertCircle, CheckCircle, Pause, Edit2, PlayCircle } from "lucide-react";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [newSchedule, setNewSchedule] = useState("");
  const [actionType, setActionType] = useState<"pause" | "resume" | "edit" | null>(null);

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
      const { data, error } = await supabase.rpc('get_cron_jobs' as any);
      if (error) {
        console.error('Error fetching cron jobs:', error);
        throw error;
      }
      return data as unknown as CronJob[];
    },
    enabled: isAdmin === true,
  });

  // Fetch job run history
  const { data: jobRuns, isLoading: loadingRuns } = useQuery({
    queryKey: ['jobRuns'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_job_runs' as any);
      if (error) {
        console.error('Error fetching job runs:', error);
        throw error;
      }
      return data as unknown as JobRun[];
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

  // Toggle job active status mutation
  const toggleJobMutation = useMutation({
    mutationFn: async ({ jobId, newActive }: { jobId: number; newActive: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_cron_job' as any, {
        job_id: jobId,
        new_active: newActive
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Job ${variables.newActive ? 'resumed' : 'paused'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
    },
    onError: (error: any) => {
      console.error('Error toggling job:', error);
      toast.error(error.message || "Failed to update job status");
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ jobId, schedule }: { jobId: number; schedule: string }) => {
      const { data, error } = await supabase.rpc('update_cron_schedule' as any, {
        job_id: jobId,
        new_schedule: schedule
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
      setEditDialogOpen(false);
      setSelectedJob(null);
      setNewSchedule("");
    },
    onError: (error: any) => {
      console.error('Error updating schedule:', error);
      toast.error(error.message || "Failed to update schedule");
    },
  });

  const handlePauseResume = (job: CronJob, pause: boolean) => {
    setSelectedJob(job);
    setActionType(pause ? "pause" : "resume");
    setConfirmDialogOpen(true);
  };

  const handleEditSchedule = (job: CronJob) => {
    setSelectedJob(job);
    setNewSchedule(job.schedule);
    setEditDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedJob) return;

    if (actionType === "pause" || actionType === "resume") {
      await toggleJobMutation.mutateAsync({
        jobId: selectedJob.jobid,
        newActive: actionType === "resume"
      });
    }

    setConfirmDialogOpen(false);
    setSelectedJob(null);
    setActionType(null);
  };

  const submitScheduleEdit = async () => {
    if (!selectedJob || !newSchedule.trim()) {
      toast.error("Please enter a valid schedule");
      return;
    }

    await updateScheduleMutation.mutateAsync({
      jobId: selectedJob.jobid,
      schedule: newSchedule.trim()
    });
  };

  const validateSchedule = (schedule: string): boolean => {
    // Basic cron format validation
    const cronRegex = /^(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})$/;
    return cronRegex.test(schedule.trim());
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
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSchedule(job)}
                                  className="gap-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Edit
                                </Button>
                                {job.active ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePauseResume(job, true)}
                                    className="gap-1"
                                  >
                                    <Pause className="h-3 w-3" />
                                    Pause
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePauseResume(job, false)}
                                    className="gap-1"
                                  >
                                    <PlayCircle className="h-3 w-3" />
                                    Resume
                                  </Button>
                                )}
                              </div>
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

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cron Schedule</DialogTitle>
            <DialogDescription>
              Update the schedule for {selectedJob?.jobname}. Use standard cron format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule">Cron Schedule</Label>
              <Input
                id="schedule"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="0 * * * * (every hour)"
              />
              <p className="text-sm text-muted-foreground">
                Examples: "0 * * * *" (hourly), "0 0 * * *" (daily), "*/5 * * * *" (every 5 minutes)
              </p>
              {newSchedule && !validateSchedule(newSchedule) && (
                <p className="text-sm text-destructive">Invalid cron format</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedJob(null);
                setNewSchedule("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitScheduleEdit}
              disabled={!validateSchedule(newSchedule) || updateScheduleMutation.isPending}
            >
              {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "pause" ? "Pause" : "Resume"} Cron Job?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} the job "{selectedJob?.jobname}"?
              {actionType === "pause" && " This will stop the job from running on schedule."}
              {actionType === "resume" && " This will restart the job on its configured schedule."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === "pause" ? "Pause Job" : "Resume Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CronJobs;
