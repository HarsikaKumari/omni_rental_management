import type { BillType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────
// This module is PURE. It has no Prisma client import, no env access,
// no I/O. Everything here is unit-testable with plain JS.
// All money is in integer paise.
// ─────────────────────────────────────────────────────────────────

export type ComputedStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface BillCalcInput {
    fromReading: number;
    toReading: number;
    ratePerUnitPaise: number;
    monthlyRentPaise: number;
    type: BillType;
    meterCapacity: number;
    /** Required when toReading < fromReading (rollover). */
    confirmedRollover?: boolean;
}

export interface BillCalcResult {
    units: number;
    electricityAmountPaise: number;
    rentAmountPaise: number;
    totalPaise: number;
}

/**
 * Compute units between two raw meter readings, handling at most ONE
 * rollover in the interval.
 *
 *   if toReading >= fromReading  →  toReading - fromReading
 *   else                          →  (capacity - fromReading) + toReading
 *
 * Readings are expected to be in [0, capacity]. `capacity` is the highest
 * number the meter displays before wrapping to zero (e.g. 99999 for a
 * 5-digit meter).
 */
export function computeUnits(
    fromReading: number,
    toReading: number,
    capacity: number,
): number {
    if (capacity <= 0) throw new Error('meterCapacity must be positive');
    if (fromReading < 0 || toReading < 0) throw new Error('Readings must be non-negative');
    if (toReading >= fromReading) return toReading - fromReading;
    return capacity - fromReading + toReading;
}

/**
 * Full bill calculation. Throws if a rollover is required but not confirmed.
 * Use `computeUnits` directly if you need rollover math without this guard.
 */
export function calculateBill(input: BillCalcInput): BillCalcResult {
    if (input.meterCapacity <= 0) {
        throw new Error('meterCapacity must be positive');
    }
    if (input.toReading < input.fromReading && !input.confirmedRollover) {
        throw new Error('Meter rollover requires confirmation');
    }

    const units = computeUnits(input.fromReading, input.toReading, input.meterCapacity);
    const electricityAmountPaise = Math.round(units * input.ratePerUnitPaise);
    const rentAmountPaise =
        input.type === 'RENT_AND_ELECTRICITY' ? input.monthlyRentPaise : 0;
    const totalPaise = electricityAmountPaise + rentAmountPaise;

    return { units, electricityAmountPaise, rentAmountPaise, totalPaise };
}

/**
 * Bill status derived from the occupancy's rolling `paidTillReading`.
 * - Electricity is "fully paid" iff paidTillReading >= bill.toReading.
 * - Electricity is "partially paid" iff paidTillReading > bill.fromReading.
 * - Rent considered paid iff type=ELECTRICITY_ONLY or rentPaid=true.
 */
export function computeBillStatus(
    bill: {
        type: BillType;
        fromReading: number;
        toReading: number;
        rentPaid: boolean;
    },
    paidTillReading: number,
): ComputedStatus {
    const electricityFullyPaid = paidTillReading >= bill.toReading;
    const electricityPartiallyPaid = paidTillReading > bill.fromReading;
    const rentConsidered = bill.type === 'ELECTRICITY_ONLY' || bill.rentPaid;

    if (electricityFullyPaid && rentConsidered) return 'PAID';
    if (electricityPartiallyPaid || bill.rentPaid) return 'PARTIAL';
    return 'UNPAID';
}

export function toBillingMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
