import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import { usePreviousRenters } from "../../hooks/useTenants";
import { formatRupees } from "../../utils/money";
import { formatDateRange } from "../../utils/format";

export default function PreviousTenantsPage() {
  const renters = usePreviousRenters();

  return (
    <AppShell
      title="Previous renters"
      backTo="/landlord/tenants"
      bottomNav={<LandlordNav />}
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
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
              No renters have moved out yet.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {renters.data?.map((r) => (
            <Link key={r.id} to={`/landlord/tenants/${r.id}`} className="block">
              <Card className="active:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg">
                    {r.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-900 truncate">
                      {r.name}
                    </p>
                    {r.lastStay && (
                      <>
                        <p className="text-xs text-slate-500">
                          Room {r.lastStay.room.roomNumber} ·{" "}
                          {formatDateRange(
                            r.lastStay.startDate,
                            r.lastStay.endDate,
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRupees(r.lastStay.monthlyRentPaise)}/mo
                        </p>
                      </>
                    )}
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
