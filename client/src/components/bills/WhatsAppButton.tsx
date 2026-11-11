import type { BillDetail } from "../../types/bill";
import { buildWhatsAppLink } from "../../utils/whatsapp";

/**
 * Anchor styled like our secondary Button. Using an <a> (not window.open)
 * so mobile OS deep-linking to the WhatsApp app works reliably and the
 * button is keyboard-accessible.
 */
export function WhatsAppButton({ bill }: { bill: BillDetail }) {
  const hasNumber = !!bill.occupancy.tenant.whatsappNumber?.trim();

  if (!hasNumber) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-slate-100 text-slate-400 px-4 py-2.5 text-base cursor-not-allowed"
        title="No WhatsApp number on file for this renter"
      >
        <span aria-hidden>💬</span>
        No number on file
      </button>
    );
  }

  const link = buildWhatsAppLink({
    tenantName: bill.occupancy.tenant.name,
    whatsappNumber: bill.occupancy.tenant.whatsappNumber,
    billingMonth: bill.billingMonth,
    fromReading: bill.fromReading,
    toReading: bill.toReading,
    units: bill.units,
    ratePerUnitPaise: bill.ratePerUnitPaise,
    electricityAmountPaise: bill.electricityAmountPaise,
    rentAmountPaise: bill.rentAmountPaise,
    totalPaise: bill.totalPaise,
    type: bill.type,
    previousRentDuePaise: bill.previousRentDuePaise,
  });

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-base"
    >
      <span aria-hidden>💬</span>
      Send on WhatsApp
    </a>
  );
}
