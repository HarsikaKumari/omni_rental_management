import { useParams, Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Badge, Button, Card, Spinner } from "../../components/ui";
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

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Currently occupied by
              </h3>
              {roomQuery.data.current ? (
                <Link
                  to={`/landlord/tenants/${roomQuery.data.current.tenant.id}`}
                  className="block"
                >
                  <Card className="active:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {roomQuery.data.current.tenant.photoUrl ? (
                          <img
                            src={roomQuery.data.current.tenant.photoUrl}
                            alt={roomQuery.data.current.tenant.name}
                            className="h-12 w-12 rounded-full object-cover bg-slate-100"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg">
                            {roomQuery.data.current.tenant.name
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-900 truncate">
                            {roomQuery.data.current.tenant.name}
                          </p>
                          <p className="text-sm text-slate-600 truncate">
                            {roomQuery.data.current.tenant.whatsappNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Since {formatDate(roomQuery.data.current.startDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatRupees(
                            roomQuery.data.current.monthlyRentPaise,
                          )}
                        </p>
                        <p className="text-xs text-slate-500">/ month</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Card>
                  <p className="text-sm text-slate-600">
                    Vacant — no one is staying here now.
                  </p>
                  <Link
                    to={`/landlord/tenants/new?roomId=${roomQuery.data.id}`}
                    className="mt-3 inline-block"
                  >
                    <Button>Add renter</Button>
                  </Link>
                </Card>
              )}
            </section>

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
                    <Link
                      key={occ.id}
                      to={`/landlord/tenants/${occ.tenant.id}`}
                      className="block"
                    >
                      <Card className="active:bg-slate-50">
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
                    </Link>
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
