import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { NotificationsProvider } from "@/hooks/useNotifications";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/ErrorBoundary";
import { initSentry, setUser } from "@/lib/sentry";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CreateCarousel from "./pages/CreateCarousel";
import CarouselDetail from "./pages/CarouselDetail";
import ProfileSettings from "./pages/ProfileSettings";
import History from "./pages/History";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AnalyticsProvider from "./components/AnalyticsProvider";

const queryClient = new QueryClient();

// Initialize Sentry error monitoring
initSentry();

const App = () => {
  useEffect(() => {
    // Set user context for Sentry when auth changes
    // This is handled by the AuthProvider
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <NotificationsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AnalyticsProvider>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/verify" element={<VerifyEmail />} />
                      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                      <Route path="/auth/reset-password" element={<ResetPassword />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/create" element={<CreateCarousel />} />
                      <Route path="/carousel/:id" element={<CarouselDetail />} />
                      <Route path="/settings/profile" element={<ProfileSettings />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AnalyticsProvider>
                </BrowserRouter>
                <CookieConsent />
              </TooltipProvider>
            </NotificationsProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
