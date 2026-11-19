import { describe, it, expect } from 'vitest';
import {
    calculateBill,
    computeBillStatus,
    computeUnits,
    toBillingMonth,
} from './billing.calc';

// ─── computeUnits: raw meter-reading arithmetic ────────────────
describe('computeUnits', () => {
    it('normal advancement', () => {
        // from 100 to 200 is a plain 100 units, no wrap.
        expect(computeUnits(100, 200, 99999)).toBe(100);
    });

    it('zero change', () => {
        // Same reading twice = 0 units.
        expect(computeUnits(100, 100, 99999)).toBe(0);
    });

    it('rollover (5-digit meter)', () => {
        // Meter wrapped from 99900 back to 50. Real units used = 99 + 50 = 149.
        expect(computeUnits(99900, 50, 99999)).toBe(149);
    });

    it('rollover at exact max', () => {
        // Meter exactly at 99999 -> wrapped immediately to 0. Units = 0.
        expect(computeUnits(99999, 0, 99999)).toBe(0);
    });

    it('4-digit meter rollover', () => {
        // Same math with a smaller capacity (9999).
        expect(computeUnits(9900, 100, 9999)).toBe(199);
    });

    it('throws on non-positive capacity', () => {
        // A capacity of 0 or -1 is nonsense — the function must refuse, not silently return garbage.
        expect(() => computeUnits(100, 200, 0)).toThrow(/meterCapacity/);
        expect(() => computeUnits(100, 200, -1)).toThrow(/meterCapacity/);
    });

    it('throws on negative reading', () => {
        // A meter reading below 0 is impossible — surface it loudly.
        expect(() => computeUnits(-1, 200, 99999)).toThrow(/non-negative/);
    });
});

describe('calculateBill', () => {
    it('rent and electricity', () => {
        const result = calculateBill({
            fromReading: 100,
            toReading: 200,
            ratePerUnitPaise: 800,       // ₹8.00 per unit in paise
            monthlyRentPaise: 500000,    // ₹5,000 in paise
            type: 'RENT_AND_ELECTRICITY',
            meterCapacity: 99999,
        });
        // 100 units × ₹8 = ₹800 electricity + ₹5000 rent = ₹5800 total.
        expect(result).toEqual({
            units: 100,
            electricityAmountPaise: 80000,
            rentAmountPaise: 500000,
            totalPaise: 580000,
        });
    });

    it('electricity only ignores rent', () => {
        const result = calculateBill({
            fromReading: 100,
            toReading: 200,
            ratePerUnitPaise: 800,
            monthlyRentPaise: 500000,   // even though rent is passed in, it must be ignored
            type: 'ELECTRICITY_ONLY',
            meterCapacity: 99999,
        });
        expect(result.rentAmountPaise).toBe(0);
        expect(result.totalPaise).toBe(80000);
    });

    it('rollover with confirmation', () => {
        const result = calculateBill({
            fromReading: 99900,
            toReading: 50,
            ratePerUnitPaise: 800,
            monthlyRentPaise: 0,
            type: 'ELECTRICITY_ONLY',
            meterCapacity: 99999,
            confirmedRollover: true,   // the caller explicitly said "yes, the meter wrapped"
        });
        expect(result.units).toBe(149);
        expect(result.electricityAmountPaise).toBe(149 * 800);
    });

    it('rollover without confirmation throws', () => {
        // A decreasing reading without rollover confirmation is a data-entry error — refuse it.
        expect(() =>
            calculateBill({
                fromReading: 99900,
                toReading: 50,
                ratePerUnitPaise: 800,
                monthlyRentPaise: 0,
                type: 'ELECTRICITY_ONLY',
                meterCapacity: 99999,
            }),
        ).toThrow(/rollover/);
    });

    it('zero units still charges rent', () => {
        // No electricity used this month, but rent is still owed.
        const result = calculateBill({
            fromReading: 100,
            toReading: 100,
            ratePerUnitPaise: 800,
            monthlyRentPaise: 500000,
            type: 'RENT_AND_ELECTRICITY',
            meterCapacity: 99999,
        });
        expect(result.units).toBe(0);
        expect(result.electricityAmountPaise).toBe(0);
        expect(result.totalPaise).toBe(500000);
    });

    it('rounds electricity to nearest paise', () => {
        // 100.5 units × 875 paise = 87937.5 — must round to 87938, not truncate.
        const result = calculateBill({
            fromReading: 100,
            toReading: 200.5,
            ratePerUnitPaise: 875,
            monthlyRentPaise: 0,
            type: 'ELECTRICITY_ONLY',
            meterCapacity: 99999,
        });
        expect(result.units).toBe(100.5);
        expect(result.electricityAmountPaise).toBe(87938);
    });
});

describe('computeBillStatus', () => {
    // Status is derived from where paidTillReading sits relative to from/to readings.
    it('elec fully paid + rent paid -> PAID', () => {
        expect(
            computeBillStatus(
                { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: true },
                200,
            ),
        ).toBe('PAID');
    });

    it('elec fully paid + rent unpaid -> PARTIAL', () => {
        expect(
            computeBillStatus(
                { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
                200,
            ),
        ).toBe('PARTIAL');
    });

    it('elec partially paid -> PARTIAL', () => {
        // Paid only half the electricity (150 out of 100→200).
        expect(
            computeBillStatus(
                { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
                150,
            ),
        ).toBe('PARTIAL');
    });

    it('nothing paid -> UNPAID', () => {
        expect(
            computeBillStatus(
                { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
                100,
            ),
        ).toBe('UNPAID');
    });

    it('rent paid only -> PARTIAL', () => {
        // Rent covered but electricity hasn't moved.
        expect(
            computeBillStatus(
                { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: true },
                100,
            ),
        ).toBe('PARTIAL');
    });

    it('electricity-only fully paid -> PAID', () => {
        // No rent to worry about.
        expect(
            computeBillStatus(
                { type: 'ELECTRICITY_ONLY', fromReading: 100, toReading: 200, rentPaid: false },
                200,
            ),
        ).toBe('PAID');
    });
});

describe('toBillingMonth', () => {
    it('formats with zero padding', () => {
        // January is month 1 → must be "01", not "1".
        expect(toBillingMonth(new Date('2025-01-15'))).toBe('2025-01');
        expect(toBillingMonth(new Date('2024-12-01'))).toBe('2024-12');
        expect(toBillingMonth(new Date('2030-09-30'))).toBe('2030-09');
    });
});
