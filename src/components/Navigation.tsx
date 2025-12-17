import { Link, useLocation } from "react-router-dom";
import { Home, Tag, Share2, Sparkles, Folder, Settings, Clock, BarChart3, Shield, LogOut, RefreshCw, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: checkIsAdmin,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const syncDeals = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      toast.loading("Refreshing deals from source...", { id: "sync-deals" });

      // The backend automatically receives the user's auth context; don't override headers.
      const { error } = await supabase.functions.invoke("sync-deals");
      if (error) throw error;

      toast.success("Deals refreshed successfully!", { id: "sync-deals" });
      await queryClient.invalidateQueries({ queryKey: ["deals"] });
    } catch (error: any) {
      console.error("Error syncing deals:", error);
      toast.error(error?.message || "Failed to refresh deals. Please try again.", { id: "sync-deals" });
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/deals", label: "All Deals", icon: Tag },
    { path: "/test12345/sociallinks", label: "Social Deals", icon: Share2 },
    { path: "/social-links-generator", label: "AI Generator", icon: Sparkles },
    { path: "/projects", label: "Projects", icon: Folder },
  ];

  const adminItems = isAdmin ? [
    { path: "/admin", label: "Admin", icon: Settings },
    { path: "/admin/cron-jobs", label: "Cron Jobs", icon: Clock },
    { path: "/admin/cron-analytics", label: "Analytics", icon: BarChart3 },
    { path: "/admin/cron-monitoring", label: "Monitoring", icon: Shield },
  ] : [];

  const allItems = [...navItems, ...adminItems];

  return (
    <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Relay Station" className="h-8 sm:h-10 w-auto" />
            <span className="hidden sm:inline font-semibold text-lg">Relay Station</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {allItems.map((item) => {
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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncDeals}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Refresh Deals
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] overflow-y-auto">
                <div className="flex flex-col gap-2 mt-6">
                  <Link to="/" className="flex items-center gap-2 mb-4" onClick={() => setIsOpen(false)}>
                    <img src={logo} alt="Relay Station" className="h-8" />
                    <span className="font-semibold">Relay Station</span>
                  </Link>
                  
                  {allItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className="border-t my-4 pt-4 space-y-2">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          syncDeals();
                          setIsOpen(false);
                        }}
                        disabled={isSyncing}
                        className="w-full gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Refresh Deals
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleSignOut();
                        setIsOpen(false);
                      }}
                      className="w-full gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
