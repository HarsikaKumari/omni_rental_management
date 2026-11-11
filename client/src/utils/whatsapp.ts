import { paiseToRupees } from './money';

/**
 * Pure WhatsApp message helpers. No I/O, no libraries, no API keys.
 * The output is what you paste into a wa.me link — nothing else.
 */

export interface WhatsAppBillData {
    tenantName: string;
    whatsappNumber: string; // E.164 with leading +
    billingMonth: string; // "YYYY-MM"
    fromReading: number;
    toReading: number;
    units: number;
    ratePerUnitPaise: number;
    electricityAmountPaise: number;
    rentAmountPaise: number;
    totalPaise: number;
    type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
    previousRentDuePaise?: number;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2025-01" → "January 2025". Falls back to the input on bad format. */
export function formatBillingMonth(yyyymm: string): string {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yyyymm);
    if (!match) return yyyymm;
    const year = Number(match[1]);
    const monthIdx = Number(match[2]) - 1;
    return `${MONTH_NAMES[monthIdx]} ${year}`;
}

/**
 * Strip +, spaces, dashes, parens. Prepend 91 if the caller gave a bare
 * 10-digit Indian number. Everything else passes through as-is.
 */
export function sanitizeWhatsAppNumber(input: string): string {
    const cleaned = input.replace(/[\s\-()+]/g, '');
    if (/^\d{10}$/.test(cleaned)) return `91${cleaned}`;
    return cleaned;
}

/**
 * Build the multi-line message for a bill.
 * Two variants:
 *   - RENT_AND_ELECTRICITY: rent line + electricity line + total
 *   - ELECTRICITY_ONLY:    electricity line + total
 * A trailing "Previous rent due" line is appended if provided.
 */
export function buildBillMessage(data: WhatsAppBillData): string {
    const month = formatBillingMonth(data.billingMonth);
    const rate = paiseToRupees(data.ratePerUnitPaise).toFixed(2);
    const elec = paiseToRupees(data.electricityAmountPaise).toFixed(2);
    const total = paiseToRupees(data.totalPaise).toFixed(2);

    const lines: string[] = [`Hello ${data.tenantName}, your bill for ${month}:`];

    if (data.type === 'RENT_AND_ELECTRICITY') {
        const rent = paiseToRupees(data.rentAmountPaise).toFixed(2);
        lines.push(`Rent: ₹${rent}`);
    }

    lines.push(
        `Electricity: ${data.fromReading} → ${data.toReading} = ${data.units} units × ₹${rate} = ₹${elec}`,
    );
    lines.push(`Total: ₹${total}`);

    if (data.previousRentDuePaise && data.previousRentDuePaise > 0) {
        const prev = paiseToRupees(data.previousRentDuePaise).toFixed(2);
        lines.push(`Previous rent due: ₹${prev}`);
    }

    return lines.join('\n');
}

/**
 * Full wa.me click-to-chat URL. Tapping it on mobile opens the WhatsApp app
 * (if installed) with the message pre-filled; the landlord just hits Send.
 */
export function buildWhatsAppLink(data: WhatsAppBillData): string {
    const number = sanitizeWhatsAppNumber(data.whatsappNumber);
    const text = buildBillMessage(data);
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
