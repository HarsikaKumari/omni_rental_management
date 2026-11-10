import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Button, Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import { useCurrentRenters } from "../../hooks/useTenants";
import { formatRupees } from "../../utils/money";
import { formatDate } from "../../utils/format";

export default function TenantsPage() {
  const renters = useCurrentRenters();

  return (
    <AppShell
      title="Renters"
      bottomNav={<LandlordNav />}
      rightSlot={
        <Link to="/landlord/tenants/new">
          <Button size="sm">Add</Button>
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {renters.data?.length ?? 0} current renter
            {(renters.data?.length ?? 0) === 1 ? "" : "s"}
          </p>
          <Link
            to="/landlord/tenants/previous"
            className="text-sm text-brand-600"
          >
            Previous renters →
          </Link>
        </div>

        {renters.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {renters.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(renters.error)}
          </div>
        )}

        {renters.data && renters.data.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No renters yet. Add your first renter to a vacant room.
            </p>
            <Link to="/landlord/tenants/new">
              <Button className="mt-3">Add renter</Button>
            </Link>
          </Card>
        )}

        <div className="space-y-3">
          {renters.data?.map((r) => (
            <Link
              key={r.occupancyId}
              to={`/landlord/tenants/${r.tenant.id}`}
              className="block"
            >
              <Card className="active:bg-slate-50">
                <div className="flex items-center gap-3">
                  {r.tenant.photoUrl ? (
                    <img
                      src={r.tenant.photoUrl}
                      alt={r.tenant.name}
                      className="h-12 w-12 rounded-full object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg">
                      {r.tenant.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-900 truncate">
                      {r.tenant.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Room {r.room.roomNumber} · since {formatDate(r.startDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupees(r.monthlyRentPaise)}
                    </p>
                    <p className="text-xs text-slate-500">/ month</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
