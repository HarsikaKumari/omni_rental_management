import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import { useRooms } from "../../hooks/useRooms";
import { useSettings } from "../../hooks/useSettings";
import { formatRupees } from "../../utils/money";

export default function LandlordDashboard() {
  const rooms = useRooms();
  const settings = useSettings();

  const occupied =
    rooms.data?.filter((r) => r.status === "OCCUPIED").length ?? 0;
  const vacant = rooms.data?.filter((r) => r.status === "VACANT").length ?? 0;
  const total = rooms.data?.length ?? 0;
  const rate = settings.data?.ratePerUnitPaise ?? 0;

  return (
    <AppShell title="RentRoom" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Occupied
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {rooms.isLoading ? <Spinner className="h-6 w-6" /> : occupied}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Vacant
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {rooms.isLoading ? <Spinner className="h-6 w-6" /> : vacant}
            </p>
          </Card>
          <Card className="col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Electricity rate
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {settings.isLoading ? (
                <Spinner className="h-6 w-6" />
              ) : rate > 0 ? (
                <>
                  {formatRupees(rate)}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    / unit
                  </span>
                </>
              ) : (
                <Link
                  to="/landlord/settings"
                  className="text-base text-brand-600"
                >
                  Set your rate →
                </Link>
              )}
            </p>
          </Card>
        </div>

        {rooms.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(rooms.error)}
          </div>
        )}

        {!rooms.isLoading && total === 0 && (
          <Card>
            <p className="text-sm text-slate-700">
              Start by adding rooms you rent out, then set your electricity
              rate.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/landlord/rooms"
            className="rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white active:bg-brand-700"
          >
            Manage rooms
          </Link>
          <Link
            to="/landlord/settings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-800 active:bg-slate-50"
          >
            Settings
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
