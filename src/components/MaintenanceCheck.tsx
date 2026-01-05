import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getSystemSettings } from "@/hooks/useSystemSettings";

interface MaintenanceCheckProps {
  children: React.ReactNode;
}

const MaintenanceCheck = ({ children }: MaintenanceCheckProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Public paths that should be accessible even during maintenance
  const publicPaths = ["/", "/auth", "/terms", "/privacy", "/maintenance"];
  const isPublicPath = publicPaths.some(path =>
    location.pathname === path || location.pathname.startsWith("/auth/")
  );

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const settings = await getSystemSettings();
        setMaintenanceMode(settings.maintenanceMode);
      } catch (error) {
        console.error("Error checking maintenance mode:", error);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    checkMaintenance();

    // Check maintenance status periodically (every 30 seconds)
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Wait for all loading states to complete
    if (checkingMaintenance || authLoading || adminLoading) return;

    // If maintenance mode is active
    if (maintenanceMode) {
      // Admin can access everything
      if (isAdmin) return;

      // If user is on a protected route, redirect to maintenance
      if (!isPublicPath && location.pathname !== "/maintenance") {
        navigate("/maintenance", { replace: true });
      }
    } else {
      // If maintenance mode is off and user is on maintenance page, redirect them
      if (location.pathname === "/maintenance") {
        navigate(user ? "/dashboard" : "/", { replace: true });
      }
    }
  }, [
    maintenanceMode,
    checkingMaintenance,
    authLoading,
    adminLoading,
    isAdmin,
    isPublicPath,
    location.pathname,
    navigate,
    user,
  ]);

  return <>{children}</>;
};

export default MaintenanceCheck;
