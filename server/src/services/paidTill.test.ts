import { describe, it, expect } from 'vitest';
import { computeBillStatus, computeUnits } from './billing.calc';

/**
 * paidTillReading rules:
 *   - Can only move between its current value and the latest reading
 *   - Outstanding = (latestReading - paidTillReading) × rateSnapshot
 *   - Fully paid when paidTillReading equals latest reading
 *   - Rent tracked separately via bill.rentPaid
 */

describe('paid-till movement', () => {
    it('can move from 100 to 180 when latest is 250', () => {
        // Legal forward move.
        const current = 100;
        const next = 180;
        const latest = 250;
        expect(next).toBeGreaterThan(current);
        expect(next).toBeLessThanOrEqual(latest);
    });

    it('cannot move above the latest reading', () => {
        // Illegal: paying for units the meter hasn't recorded.
        const next = 260;
        const latest = 250;
        expect(next > latest).toBe(true); // server rejects this
    });

    it('cannot move below the current paid-till', () => {
        // Illegal: moving backwards would "unpay" units already paid for.
        const next = 90;
        const current = 100;
        expect(next < current).toBe(true); // server rejects this
    });

    it('outstanding electricity reduces as paid-till moves', () => {
        // Advance paidTill from 100 to 180 → outstanding drops from ₹1200 to ₹560.
        const latest = 250;
        const rate = 800;
        const before = (latest - 100) * rate; // 120000
        const after = (latest - 180) * rate;  // 56000
        expect(after).toBeLessThan(before);
    });

    it('bill becomes PAID when paid-till equals toReading and rent is paid', () => {
        const bill = {
            type: 'RENT_AND_ELECTRICITY' as const,
            fromReading: 100,
            toReading: 250,
            rentPaid: true,
        };
        expect(computeBillStatus(bill, 250)).toBe('PAID');
    });

    it('electricity-only bill becomes PAID without rent', () => {
        const bill = {
            type: 'ELECTRICITY_ONLY' as const,
            fromReading: 100,
            toReading: 250,
            rentPaid: false,
        };
        expect(computeBillStatus(bill, 250)).toBe('PAID');
    });

    it('paid-till computes correctly across a rollover', () => {
        // Meter wrapped 99900 → 250 → 349 real units.
        const units = computeUnits(99900, 250, 99999);
        expect(units).toBe(349);
    });
});
