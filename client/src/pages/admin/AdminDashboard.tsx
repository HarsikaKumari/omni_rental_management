import { Link } from "react-router-dom";
import { Card, Spinner } from "../../components/ui";
import { AppShell } from "../../components/layout/AppShell";
import { getApiErrorMessage } from "../../api/client";
import { useAdminStats } from "../../hooks/useLandlords";

export default function AdminDashboard() {
  const stats = useAdminStats();

  return (
    <AppShell title="Admin">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Landlords"
            value={stats.data?.totalLandlords}
            loading={stats.isLoading}
          />
          <StatCard
            label="Active"
            value={stats.data?.activeLandlords}
            loading={stats.isLoading}
          />
          <StatCard
            label="Suspended"
            value={stats.data?.suspendedLandlords}
            loading={stats.isLoading}
          />
          <StatCard
            label="Rooms"
            value={stats.data?.totalRooms}
            loading={stats.isLoading}
          />
          <StatCard
            label="Active renters"
            value={stats.data?.activeRenters}
            loading={stats.isLoading}
            fullWidth
          />
        </div>

        {stats.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(stats.error)}
          </div>
        )}

        <Link
          to="/admin/landlords"
          className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-base font-medium text-white active:bg-brand-700"
        >
          Manage landlords →
        </Link>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  loading,
  fullWidth,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Card className={fullWidth ? "col-span-2" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {loading ? <Spinner className="h-6 w-6" /> : (value ?? "—")}
      </p>
    </Card>
  );
}
