import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import LandlordsPage from "../pages/admin/LandlordsPage";
import LandlordDashboard from "../pages/landlord/Dashboard";
import RoomsPage from "../pages/landlord/Rooms";
import RoomDetailPage from "../pages/landlord/RoomDetail";
import TenantsPage from "../pages/landlord/Tenants";
import TenantDetailPage from "../pages/landlord/TenantDetail";
import AddRenterPage from "../pages/landlord/AddRenter";
import PreviousTenantsPage from "../pages/landlord/PreviousTenants";
import BillingPage from "../pages/landlord/Billing";
import BillDetailPage from "../pages/landlord/BillDetail";
import SettingsPage from "../pages/landlord/Settings";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate to={user.role === "ADMIN" ? "/admin" : "/landlord"} replace />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/landlords"
        element={
          <ProtectedRoute role="ADMIN">
            <LandlordsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/landlord"
        element={
          <ProtectedRoute role="LANDLORD">
            <LandlordDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/rooms"
        element={
          <ProtectedRoute role="LANDLORD">
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/rooms/:id"
        element={
          <ProtectedRoute role="LANDLORD">
            <RoomDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants"
        element={
          <ProtectedRoute role="LANDLORD">
            <TenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants/new"
        element={
          <ProtectedRoute role="LANDLORD">
            <AddRenterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants/previous"
        element={
          <ProtectedRoute role="LANDLORD">
            <PreviousTenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/tenants/:id"
        element={
          <ProtectedRoute role="LANDLORD">
            <TenantDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/bills"
        element={
          <ProtectedRoute role="LANDLORD">
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/bills/:id"
        element={
          <ProtectedRoute role="LANDLORD">
            <BillDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/landlord/settings"
        element={
          <ProtectedRoute role="LANDLORD">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
