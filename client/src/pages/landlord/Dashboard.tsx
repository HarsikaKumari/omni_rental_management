import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { LandlordNav } from '../../components/layout/LandlordNav';
import { Badge, Card, Spinner } from '../../components/ui';
import { getApiErrorMessage } from '../../api/client';
import { useDashboard } from '../../hooks/useDashboard';
import { formatRupees } from '../../utils/money';
import type { BillStatus } from '../../types/bill';

const statusTone: Record<BillStatus, 'red' | 'amber' | 'green' | 'slate'> = {
  UNPAID: 'red',
  PARTIAL: 'amber',
  PAID: 'green',
  CARRIED_FORWARD: 'slate',
};

export default function LandlordDashboard() {
  const dash = useDashboard();

  return (
    <AppShell title="RentRoom" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {dash.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {dash.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(dash.error)}
          </div>
        )}

        {dash.data && (
          <>
            {/* Room occupancy */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Occupied
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {dash.data.occupiedRooms}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Vacant
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {dash.data.vacantRooms}
                </p>
              </Card>
            </div>

            {/* Dues */}
            <Card
              className={
                dash.data.totalDuePaise > 0
                  ? '!border-amber-200 !bg-amber-50'
                  : undefined
              }
            >
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Outstanding dues
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">
                {formatRupees(dash.data.totalDuePaise)}
              </p>
              <div className="mt-2 space-y-1 text-sm text-amber-900">
                <div className="flex justify-between">
                  <span>Rent</span>
                  <span>{formatRupees(dash.data.totalRentDuePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Electricity</span>
                  <span>{formatRupees(dash.data.totalElectricityDuePaise)}</span>
                </div>
              </div>
              {dash.data.totalDuePaise === 0 && (
                <p className="mt-2 text-xs text-emerald-700">All settled — no dues.</p>
              )}
            </Card>

            {/* Rate hint */}
            {dash.data.ratePerUnitPaise === 0 && (
              <Card>
                <p className="text-sm text-slate-700">
                  <Link to="/landlord/settings" className="text-brand-600 underline">
                    Set your electricity rate
                  </Link>{' '}
                  before generating bills.
                </p>
              </Card>
            )}

            {/* Recent bills */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Recent bills</h3>
                <Link to="/landlord/bills" className="text-sm text-brand-600">
                  View all →
                </Link>
              </div>
              {dash.data.recentBills.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-600">
                    No bills yet. Open a renter's page and tap <strong>Generate bill</strong>.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dash.data.recentBills.map((b) => (
                    <Link key={b.id} to={`/landlord/bills/${b.id}`} className="block">
                      <Card className="active:bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {b.tenantName}
                              </p>
                              <span className="text-xs text-slate-500">
                                Room {b.roomNumber}
                              </span>
                              {b.isFinal && <Badge tone="amber">FINAL</Badge>}
                            </div>
                            <p className="text-xs text-slate-500">{b.billingMonth}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatRupees(b.totalPaise)}
                            </p>
                            <Badge tone={statusTone[b.status]}>
                              {b.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/landlord/rooms"
                className="rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white active:bg-brand-700"
              >
                Manage rooms
              </Link>
              <Link
                to="/landlord/tenants"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-800 active:bg-slate-50"
              >
                Renters
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
