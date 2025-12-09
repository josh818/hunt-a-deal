import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const PublicNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "/deals", label: "Browse Deals" },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-8 sm:h-10" />
          <span className="font-semibold text-lg hidden sm:inline">Relay Station</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link to={link.href}>{link.label}</Link>
            </Button>
          ))}
          <Button variant="default" size="lg" className="font-semibold" asChild>
            <Link to="/auth">Sign In / Get Started</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/" className="flex items-center gap-2 mb-4" onClick={() => setIsOpen(false)}>
                  <img src={relayLogo} alt="Relay Station" className="h-8" />
                  <span className="font-semibold">Relay Station</span>
                </Link>
                {navLinks.map((link) => (
                  <Button key={link.href} variant="ghost" className="justify-start" asChild>
                    <Link to={link.href} onClick={() => setIsOpen(false)}>
                      {link.label}
                    </Link>
                  </Button>
                ))}
                <Button className="w-full mt-4" asChild>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    Get Started Free
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
