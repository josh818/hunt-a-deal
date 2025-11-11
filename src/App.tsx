import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Deals from "./pages/Deals";
import DealLanding from "./pages/DealLanding";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Test12345SocialLinks from "./pages/Test12345SocialLinks";
import SocialLinksGenerator from "./pages/SocialLinksGenerator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deal/:id" element={<DealLanding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/test12345/sociallinks" element={<Test12345SocialLinks />} />
          <Route path="/social-links-generator" element={<SocialLinksGenerator />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
