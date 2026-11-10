import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import { Badge, Card, Spinner } from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import { useBills } from "../../hooks/useBills";
import { formatRupees } from "../../utils/money";
import type { BillStatus } from "../../types/bill";

const statusTone: Record<BillStatus, "red" | "amber" | "green" | "slate"> = {
  UNPAID: "red",
  PARTIAL: "amber",
  PAID: "green",
  CARRIED_FORWARD: "slate",
};

const FILTERS: { label: string; value: BillStatus[] | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Unpaid", value: ["UNPAID"] },
  { label: "Partial", value: ["PARTIAL"] },
  { label: "Paid", value: ["PAID"] },
  { label: "Carried fwd", value: ["CARRIED_FORWARD"] },
];

export default function BillingPage() {
  const [filterIdx, setFilterIdx] = useState(0);
  const bills = useBills({ status: FILTERS[filterIdx].value, limit: 100 });

  return (
    <AppShell title="Bills" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setFilterIdx(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filterIdx === i
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {bills.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {bills.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(bills.error)}
          </div>
        )}

        {bills.data && bills.data.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No bills yet. Generate one from a renter's page or from a room's
              tenant card.
            </p>
          </Card>
        )}

        <div className="space-y-2">
          {bills.data?.map((b) => (
            <Link key={b.id} to={`/landlord/bills/${b.id}`} className="block">
              <Card className="active:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {b.occupancy.tenant.name}
                      </p>
                      <span className="text-xs text-slate-500">
                        Room {b.occupancy.room.roomNumber}
                      </span>
                      {b.isFinal && <Badge tone="amber">FINAL</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {b.billingMonth} ·{" "}
                      {b.type === "RENT_AND_ELECTRICITY"
                        ? "Rent+Elec"
                        : "Elec only"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupees(b.totalPaise)}
                    </p>
                    <Badge tone={statusTone[b.status]}>
                      {b.status.replace("_", " ")}
                    </Badge>
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
