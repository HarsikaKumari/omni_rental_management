import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Badge, Button, Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import {
  useBill,
  useMarkFullyPaid,
  useMarkRentPaid,
} from "../../hooks/useBills";
import { formatRupees } from "../../utils/money";
import { formatDate } from "../../utils/format";
import { PaidTillModal } from "../../components/bills/PaidTillModal";

const statusTone: Record<string, "red" | "amber" | "green" | "slate"> = {
  UNPAID: "red",
  PARTIAL: "amber",
  PAID: "green",
  CARRIED_FORWARD: "slate",
};

export default function BillDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const bill = useBill(id);
  const markPaid = useMarkFullyPaid();
  const markRent = useMarkRentPaid();
  const [paidTillOpen, setPaidTillOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <AppShell title="Bill" backTo="/landlord/bills" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {bill.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {bill.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(bill.error)}
          </div>
        )}

        {bill.data && (
          <>
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {bill.data.occupancy.tenant.name}
                    </h2>
                    <span className="text-xs text-slate-500">
                      Room {bill.data.occupancy.room.roomNumber}
                    </span>
                    {bill.data.isFinal && <Badge tone="amber">FINAL</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {bill.data.type === "RENT_AND_ELECTRICITY"
                      ? "Rent + Electricity"
                      : "Electricity only"}{" "}
                    · {bill.data.billingMonth}
                  </p>
                </div>
                <Badge tone={statusTone[bill.data.status]}>
                  {bill.data.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <Row
                  label="From reading"
                  value={bill.data.fromReading.toString()}
                />
                <Row
                  label="To reading"
                  value={bill.data.toReading.toString()}
                />
                <Row label="Units" value={bill.data.units.toString()} />
                <Row
                  label="Rate"
                  value={`${formatRupees(bill.data.ratePerUnitPaise)} / unit`}
                />
                <Row
                  label="Electricity"
                  value={formatRupees(bill.data.electricityAmountPaise)}
                />
                {bill.data.type === "RENT_AND_ELECTRICITY" && (
                  <Row
                    label="Rent"
                    value={`${formatRupees(bill.data.rentAmountPaise)} ${
                      bill.data.rentPaid ? "· paid" : ""
                    }`}
                  />
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold">
                    {formatRupees(bill.data.totalPaise)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Paid-till reading: {bill.data.occupancy.paidTillReading}
                {bill.data.latestReading !== null && (
                  <> · Latest: {bill.data.latestReading}</>
                )}
              </p>
            </Card>

            {bill.data.previousRentDuePaise > 0 && (
              <Card className="!bg-amber-50 !border-amber-200">
                <p className="text-sm font-medium text-amber-900">
                  Previous rent due:{" "}
                  {formatRupees(bill.data.previousRentDuePaise)}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Carried from older unpaid bills. Not included in this bill's
                  total.
                </p>
                <ul className="mt-2 space-y-1">
                  {bill.data.previousRentDueBills.map((b) => (
                    <li key={b.id} className="text-xs">
                      <Link
                        to={`/landlord/bills/${b.id}`}
                        className="text-amber-900 underline"
                      >
                        {b.billingMonth} — {formatRupees(b.rentAmountPaise)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {actionError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {bill.data.status !== "PAID" &&
                bill.data.status !== "CARRIED_FORWARD" && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActionError(null);
                        setPaidTillOpen(true);
                      }}
                    >
                      Paid till reading
                    </Button>
                    <Button
                      variant="primary"
                      loading={markPaid.isPending}
                      onClick={async () => {
                        setActionError(null);
                        try {
                          await markPaid.mutateAsync(bill.data!.id);
                        } catch (err) {
                          setActionError(getApiErrorMessage(err));
                        }
                      }}
                    >
                      Mark fully paid
                    </Button>
                  </>
                )}
              {bill.data.type === "RENT_AND_ELECTRICITY" &&
                !bill.data.rentPaid && (
                  <Button
                    variant="secondary"
                    loading={markRent.isPending}
                    onClick={async () => {
                      setActionError(null);
                      try {
                        await markRent.mutateAsync(bill.data!.id);
                      } catch (err) {
                        setActionError(getApiErrorMessage(err));
                      }
                    }}
                  >
                    Mark rent paid
                  </Button>
                )}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Payments ({bill.data.payments.length})
              </h3>
              {bill.data.payments.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-600">
                    No payments recorded yet.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {bill.data.payments.map((p) => (
                    <Card key={p.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {formatRupees(p.amountPaise)}
                          </p>
                          {p.note && (
                            <p className="text-xs text-slate-600">{p.note}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(p.paidOn)}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <PaidTillModal
              open={paidTillOpen}
              onClose={() => setPaidTillOpen(false)}
              billId={bill.data.id}
              currentPaidTill={bill.data.occupancy.paidTillReading}
              latestReading={bill.data.latestReading}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
