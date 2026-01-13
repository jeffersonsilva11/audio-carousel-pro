import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component that guards routes requiring authentication.
 * Redirects unauthenticated users to /auth and optionally checks for admin role.
 */
const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const location = useLocation();

  // Show loading spinner while checking auth state
  const loading = authLoading || (requireAdmin && adminLoading);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    // For admin routes, redirect to landing page silently (don't reveal admin exists)
    if (requireAdmin) {
      return <Navigate to="/" replace />;
    }
    // For other protected routes, redirect to auth with return URL
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Check admin requirement - redirect to dashboard silently (don't reveal admin exists)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
