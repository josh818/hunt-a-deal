import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, Store, LogOut, LayoutDashboard, DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const AdminNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch pending applications count
  const { data: pendingCount } = useQuery({
    queryKey: ['pendingApplicationsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);
      
      if (error) return 0;
      return count || 0;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-10" />
        </Link>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/admin/applications" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Applications
              {pendingCount && pendingCount > 0 ? (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/admin/earnings">
              <DollarSign className="mr-2 h-4 w-4" />
              Earnings
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/projects">
              <Store className="mr-2 h-4 w-4" />
              Stores
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/admin/cron-jobs">Cron Jobs</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/cron-monitoring">Monitoring</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
