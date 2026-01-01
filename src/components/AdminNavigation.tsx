import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Users, 
  Store, 
  LogOut, 
  LayoutDashboard, 
  DollarSign, 
  Menu,
  Clock,
  Activity,
  Tag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const AdminNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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

  const mainNavLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { 
      href: "/admin/applications", 
      label: "Applications", 
      icon: Users,
      badge: pendingCount && pendingCount > 0 ? pendingCount : null
    },
    { href: "/admin/earnings", label: "Earnings", icon: DollarSign },
    { href: "/projects", label: "Stores", icon: Store },
  ];

  const settingsLinks = [
    { href: "/admin/cron-jobs", label: "Cron Jobs", icon: Clock },
    { href: "/admin/cron-monitoring", label: "Monitoring", icon: Activity },
    { href: "/deals", label: "Browse Deals", icon: Tag },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-8 sm:h-10" />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {mainNavLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link to={link.href} className="flex items-center gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.badge && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {link.badge}
                  </Badge>
                )}
              </Link>
            </Button>
          ))}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {settingsLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link to={link.href} className="flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Menu className="h-5 w-5" />
                {pendingCount && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Link to="/admin" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <img src={relayLogo} alt="Relay Station" className="h-8" />
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-3 py-2">Main</p>
                    {mainNavLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link
                          to={link.href}
                          className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                        >
                          <div className="flex items-center gap-3">
                            <link.icon className="h-5 w-5 text-muted-foreground" />
                            {link.label}
                          </div>
                          {link.badge && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {link.badge}
                            </Badge>
                          )}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                  <div className="p-4 space-y-1 border-t">
                    <p className="text-xs font-medium text-muted-foreground px-3 py-2">Settings</p>
                    {settingsLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link
                          to={link.href}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                        >
                          <link.icon className="h-5 w-5 text-muted-foreground" />
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3" 
                    onClick={() => { handleSignOut(); setIsOpen(false); }}
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
