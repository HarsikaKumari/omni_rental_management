import { useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Badge, Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import { useRoom } from "../../hooks/useRooms";
import { formatRupees } from "../../utils/money";
import { formatDate, formatDateRange, monthsBetween } from "../../utils/format";

export default function RoomDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const roomQuery = useRoom(id);

  return (
    <AppShell title="Room" backTo="/landlord/rooms" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {roomQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {roomQuery.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(roomQuery.error)}
          </div>
        )}

        {roomQuery.data && (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Room {roomQuery.data.roomNumber}
                </h2>
                <Badge
                  tone={roomQuery.data.status === "OCCUPIED" ? "blue" : "green"}
                >
                  {roomQuery.data.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Added {formatDate(roomQuery.data.createdAt)}
              </p>
            </div>

            {/* Current renter */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Currently occupied by
              </h3>
              {roomQuery.data.current ? (
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900">
                        {roomQuery.data.current.tenant.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {roomQuery.data.current.tenant.whatsappNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Since {formatDate(roomQuery.data.current.startDate)} ·{" "}
                        {monthsBetween(roomQuery.data.current.startDate, null)}{" "}
                        month
                        {monthsBetween(
                          roomQuery.data.current.startDate,
                          null,
                        ) === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatRupees(roomQuery.data.current.monthlyRentPaise)}
                      </p>
                      <p className="text-xs text-slate-500">/ month</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card>
                  <p className="text-sm text-slate-600">
                    Vacant — no one is staying here now.
                  </p>
                </Card>
              )}
            </section>

            {/* Renter history for THIS room */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Renter history ({roomQuery.data.history.length})
              </h3>
              {roomQuery.data.history.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-600">
                    No past renters yet for this room.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {roomQuery.data.history.map((occ) => (
                    <Card key={occ.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {occ.tenant.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateRange(occ.startDate, occ.endDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {monthsBetween(occ.startDate, occ.endDate)} month
                            {monthsBetween(occ.startDate, occ.endDate) === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-nowrap">
                          {formatRupees(occ.monthlyRentPaise)}/mo
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
