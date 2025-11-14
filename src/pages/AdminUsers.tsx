import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
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

const fetchUsers = async (): Promise<UserProfile[]> => {
  // Fetch all profiles with their roles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;
  if (!profiles) return [];

  // Fetch all user roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) throw rolesError;
  if (!userRoles) return profiles.map(p => ({ ...p, roles: [] }));

  // Combine profiles with their roles
  return profiles.map(profile => ({
    id: profile.id,
    email: profile.email,
    created_at: profile.created_at,
    roles: userRoles
      .filter(role => role.user_id === profile.id)
      .map(role => role.role)
  }));
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isAdmin, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: checkIsAdmin,
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchUsers,
    enabled: isAdmin === true,
  });

  const promoteToAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('promote_to_admin', {
        target_user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User promoted to admin successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to promote user');
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>

        {isLoadingUsers ? (
          <p className="text-muted-foreground">Loading users...</p>
        ) : (
          <div className="grid gap-4">
            {users?.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.email}</CardTitle>
                      <CardDescription>
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!user.roles.includes('admin') && (
                    <Button
                      size="sm"
                      onClick={() => promoteToAdmin.mutate(user.id)}
                      disabled={promoteToAdmin.isPending}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Promote to Admin
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
