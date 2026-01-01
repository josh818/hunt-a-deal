import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu, Tag, HelpCircle } from "lucide-react";
import { useState } from "react";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const PublicNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#how-it-works", label: "How It Works", icon: HelpCircle },
    { href: "/deals", label: "Browse Deals", icon: Tag },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-8 sm:h-10" />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link to={link.href} className="flex items-center gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          ))}
          <Button size="sm" className="font-semibold ml-2" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <Button size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
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
                  <SheetClose asChild>
                    <Button className="w-full" asChild>
                      <Link to="/auth">
                        Get Started Free
                      </Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
