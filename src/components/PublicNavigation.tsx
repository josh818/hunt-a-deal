import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import relayLogo from "@/assets/relay-station-logo-new.png";

export const PublicNavigation = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={relayLogo} alt="Relay Station" className="h-10" />
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="#how-it-works">How It Works</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/deals">Browse Deals</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
