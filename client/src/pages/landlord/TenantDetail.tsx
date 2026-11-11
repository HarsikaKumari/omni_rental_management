import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Badge, Button, Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import {
  useRemoveTenantPhoto,
  useTenant,
  useUpdateTenantPhoto,
} from "../../hooks/useTenants";
import { useRooms } from "../../hooks/useRooms";
import { useSettings } from "../../hooks/useSettings";
import { formatRupees } from "../../utils/money";
import { formatDate, formatDateRange } from "../../utils/format";
import { maskIdNumber } from "../../utils/mask";
import { MoveOutModal } from "../../components/tenants/MoveOutModal";
import { ShiftRoomModal } from "../../components/tenants/ShiftRoomModal";
import { GenerateBillModal } from "../../components/bills/GenerateBillModal";

export default function TenantDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useTenant(id);
  const rooms = useRooms();
  const settings = useSettings();
  const updatePhoto = useUpdateTenantPhoto();
  const removePhoto = useRemoveTenantPhoto();
  const [shiftOpen, setShiftOpen] = useState(false);
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const active =
    tenant.data?.occupancies.find((o) => o.endDate === null) ?? null;
  const history =
    tenant.data?.occupancies.filter((o) => o.endDate !== null) ?? [];

  return (
    <AppShell
      title="Renter"
      backTo="/landlord/tenants"
      bottomNav={<LandlordNav />}
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {tenant.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {tenant.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(tenant.error)}
          </div>
        )}

        {tenant.data && (
          <>
            <Card>
              <div className="flex items-center gap-3">
                {tenant.data.photoUrl ? (
                  <img
                    src={tenant.data.photoUrl}
                    alt={tenant.data.name}
                    className="h-16 w-16 rounded-full object-cover bg-slate-100"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                    {tenant.data.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {tenant.data.name}
                  </h2>
                  <p className="text-sm text-slate-600 truncate">
                    {tenant.data.whatsappNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tenant.data.idType === "AADHAAR" ? "Aadhaar" : "ID"}{" "}
                    {maskIdNumber(tenant.data.idNumberLast4)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50">
                  {tenant.data.photoUrl ? "Replace photo" : "Add photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        await updatePhoto.mutateAsync({
                          id: tenant.data!.id,
                          file: f,
                        });
                      e.target.value = "";
                    }}
                  />
                </label>
                {tenant.data.photoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => removePhoto.mutateAsync(tenant.data!.id)}
                  >
                    Remove photo
                  </Button>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-900">
                Current stay
              </h3>
              {active ? (
                <>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p>
                      Room <strong>{active.room.roomNumber}</strong>
                    </p>
                    <p>Since {formatDate(active.startDate)}</p>
                    <p>Rent {formatRupees(active.monthlyRentPaise)} / month</p>
                    <p>Paid-till reading: {active.paidTillReading}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setBillOpen(true)}
                      disabled={(settings.data?.ratePerUnitPaise ?? 0) <= 0}
                    >
                      Generate bill
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShiftOpen(true)}
                    >
                      Change room
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setMoveOutOpen(true)}
                    >
                      Move out
                    </Button>
                  </div>
                  {(settings.data?.ratePerUnitPaise ?? 0) <= 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      Set your electricity rate in Settings before generating
                      bills.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Not currently staying.
                </p>
              )}
            </Card>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Stay history ({history.length})
              </h3>
              {history.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-600">No previous stays.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {history.map((o) => (
                    <Card key={o.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            Room {o.room.roomNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateRange(o.startDate, o.endDate)}
                          </p>
                        </div>
                        <Badge tone="slate">
                          {formatRupees(o.monthlyRentPaise)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {active && (
              <>
                <ShiftRoomModal
                  open={shiftOpen}
                  onClose={() => setShiftOpen(false)}
                  occupancyId={active.id}
                  currentRoomId={active.room.id}
                  currentRentPaise={active.monthlyRentPaise}
                  rooms={(rooms.data ?? []).filter(
                    (r) => r.id !== active.room.id,
                  )}
                />
                <MoveOutModal
                  open={moveOutOpen}
                  onClose={() => setMoveOutOpen(false)}
                  occupancyId={active.id}
                  onMovedOut={() => navigate("/landlord/tenants")}
                />
                <GenerateBillModal
                  open={billOpen}
                  onClose={() => setBillOpen(false)}
                  occupancyId={active.id}
                  roomNumber={active.room.roomNumber}
                  paidTillReading={active.paidTillReading}
                  ratePerUnitPaise={settings.data?.ratePerUnitPaise ?? 0}
                  meterCapacity={settings.data?.meterCapacity ?? 99999}
                />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
