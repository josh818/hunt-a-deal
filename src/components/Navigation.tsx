import { Link, useLocation } from "react-router-dom";
import { Home, Tag, Share2, Sparkles, Settings, Clock, BarChart3, Shield, LogOut, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/relay-station-logo-new.png";

const checkIsAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  return !error && data !== null;
};

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { data: isAdmin } = useQuery({
    queryKey: ['isAdmin'],
    queryFn: checkIsAdmin,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate('/auth');
  };

  const syncDeals = async () => {
    try {
      toast.loading("Refreshing deals from source...");
      const { error } = await supabase.functions.invoke('sync-deals');
      
      if (error) throw error;
      
      toast.success("Deals refreshed successfully!");
      window.location.reload();
    } catch (error) {
      console.error('Error syncing deals:', error);
      toast.error("Failed to refresh deals");
    }
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/deals", label: "All Deals", icon: Tag },
    { path: "/test12345/sociallinks", label: "Social Deals", icon: Share2 },
    { path: "/social-links-generator", label: "AI Generator", icon: Sparkles },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", label: "Admin", icon: Settings });
    navItems.push({ path: "/admin/users", label: "Users", icon: Users });
    navItems.push({ path: "/admin/cron-jobs", label: "Cron Jobs", icon: Clock });
    navItems.push({ path: "/admin/cron-analytics", label: "Analytics", icon: BarChart3 });
    navItems.push({ path: "/admin/cron-monitoring", label: "Monitoring", icon: Shield });
  }

  return (
    <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Relay Station" className="h-10 w-auto" />
              <span className="hidden sm:inline font-semibold text-lg">Relay Station</span>
            </Link>
            <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncDeals}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh Deals</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
