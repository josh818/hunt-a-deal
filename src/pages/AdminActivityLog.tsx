import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
  admin_email?: string;
  target_email?: string;
}

const checkIsAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data === true;
};

const fetchActivityLog = async (): Promise<ActivityLog[]> => {
  const { data: logs, error: logsError } = await supabase
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (logsError) throw logsError;

  // Fetch admin and target user emails
  const adminIds = [...new Set(logs.map(log => log.admin_user_id))];
  const targetIds = [...new Set(logs.map(log => log.target_user_id).filter(Boolean))];
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', [...adminIds, ...targetIds]);

  const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

  return logs.map(log => ({
    ...log,
    admin_email: emailMap.get(log.admin_user_id),
    target_email: log.target_user_id ? emailMap.get(log.target_user_id) : undefined
  }));
};

export default function AdminActivityLog() {
  const navigate = useNavigate();

  const { data: isAdmin, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: checkIsAdmin,
  });

  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['adminActivityLog'],
    queryFn: fetchActivityLog,
    enabled: isAdmin === true,
  });

  useEffect(() => {
    if (!isLoadingAdmin && !isAdmin) {
      navigate('/');
      toast.error('Access denied. Admin privileges required.');
    }
  }, [isAdmin, isLoadingAdmin, navigate]);

  if (isLoadingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const formatActionType = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Activity Log</h1>
          <p className="text-muted-foreground">
            Track all administrative actions performed in the system
          </p>
        </div>

        {isLoadingActivities ? (
          <p className="text-muted-foreground">Loading activity log...</p>
        ) : activities?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No activity logged yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activities?.map((activity) => (
              <Card key={activity.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {formatActionType(activity.action_type)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">Admin:</span> {activity.admin_email || 'Unknown'}
                          </div>
                          {activity.target_email && (
                            <div>
                              <span className="font-medium">Target User:</span> {activity.target_email}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.created_at).toLocaleString()}
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {activity.action_type}
                    </Badge>
                  </div>
                </CardHeader>
                {activity.details && Object.keys(activity.details).length > 0 && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
