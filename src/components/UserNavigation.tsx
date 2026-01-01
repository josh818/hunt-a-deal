import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Store, User, LogOut, Menu, Tag, Settings } from "lucide-react";
import { useState } from "react";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const UserNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  const navLinks = [
    { href: "/dashboard", label: "My Store", icon: Store },
    { href: "/deals", label: "Browse Deals", icon: Tag },
    { href: "/profile", label: "Profile", icon: Settings },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-8 sm:h-10" />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              My Store
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/deals" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Browse Deals
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <img src={relayLogo} alt="Relay Station" className="h-8" />
                  </Link>
                </div>
                <div className="flex-1 p-4 space-y-1">
                  {navLinks.map((link) => (
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
