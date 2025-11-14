import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Deals from "./pages/Deals";
import DealLanding from "./pages/DealLanding";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Test12345SocialLinks from "./pages/Test12345SocialLinks";
import SocialLinksGenerator from "./pages/SocialLinksGenerator";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import CronJobs from "./pages/CronJobs";
import CronAnalytics from "./pages/CronAnalytics";
import CronMonitoring from "./pages/CronMonitoring";
import ProjectDeals from "./pages/ProjectDeals";
import ProjectSocial from "./pages/ProjectSocial";
import LogoEditor from "./pages/LogoEditor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/deal/:id" element={<DealLanding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/test12345/sociallinks" element={<Test12345SocialLinks />} />
            <Route path="/social-links-generator" element={<SocialLinksGenerator />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/cron-jobs" element={<CronJobs />} />
            <Route path="/admin/cron-analytics" element={<CronAnalytics />} />
            <Route path="/admin/cron-monitoring" element={<CronMonitoring />} />
            <Route path="/project/:slug/deals" element={<ProjectDeals />} />
            <Route path="/project/:slug/social" element={<ProjectSocial />} />
            <Route path="/logo-editor" element={<LogoEditor />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
