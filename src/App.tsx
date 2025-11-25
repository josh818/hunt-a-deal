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
import CronJobs from "./pages/CronJobs";
import CronAnalytics from "./pages/CronAnalytics";
import CronMonitoring from "./pages/CronMonitoring";
import ProjectDeals from "./pages/ProjectDeals";
import ProjectSocial from "./pages/ProjectSocial";
import LogoEditor from "./pages/LogoEditor";
import Projects from "./pages/Projects";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicationPending from "./pages/ApplicationPending";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminApplications from "./pages/AdminApplications";

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
            <Route path="/apply" element={<ApplicationForm />} />
            <Route path="/application-pending" element={<ApplicationPending />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/test12345/sociallinks" element={<Test12345SocialLinks />} />
            <Route path="/social-links-generator" element={<SocialLinksGenerator />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/cron-jobs" element={<CronJobs />} />
            <Route path="/admin/cron-analytics" element={<CronAnalytics />} />
            <Route path="/admin/cron-monitoring" element={<CronMonitoring />} />
            <Route path="/projects" element={<Projects />} />
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
