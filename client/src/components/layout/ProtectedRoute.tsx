import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types/auth";

interface Props {
  children: ReactNode;
  /** If provided, only users with this role can render the children. */
  role?: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember the original URL so login can bounce the user back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user?.role !== role) {
    return (
      <Navigate to={user?.role === "ADMIN" ? "/admin" : "/landlord"} replace />
    );
  }

  return <>{children}</>;
}
