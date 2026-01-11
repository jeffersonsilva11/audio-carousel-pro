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
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import MaintenanceCheck from "./components/MaintenanceCheck";
import VersionUpdateBanner from "./components/VersionUpdateBanner";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Support from "./pages/Support";
import SupportSuccess from "./pages/SupportSuccess";
import AnalyticsProvider from "./components/AnalyticsProvider";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
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
                  <MaintenanceCheck>
                    <AnalyticsProvider>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/auth/verify" element={<VerifyEmail />} />
                        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                        <Route path="/auth/reset-password" element={<ResetPassword />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/support/success" element={<SupportSuccess />} />

                        {/* Protected routes - require authentication */}
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/create" element={<ProtectedRoute><CreateCarousel /></ProtectedRoute>} />
                        <Route path="/carousel/:id" element={<ProtectedRoute><CarouselDetail /></ProtectedRoute>} />
                        <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />

                        {/* Admin routes - require admin role */}
                        <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />

                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AnalyticsProvider>
                  </MaintenanceCheck>
                  <VersionUpdateBanner />
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
