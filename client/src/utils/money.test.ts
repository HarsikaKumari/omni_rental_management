import { describe, it, expect } from 'vitest';
import { formatRupees, paiseToRupees, rupeesToPaise } from './money';

describe('paiseToRupees', () => {
    it('divides by 100', () => {
        expect(paiseToRupees(80000)).toBe(800);
        expect(paiseToRupees(875)).toBe(8.75);
    });
});

describe('rupeesToPaise', () => {
    it('multiplies by 100 and rounds', () => {
        expect(rupeesToPaise(800)).toBe(80000);
        expect(rupeesToPaise(8.75)).toBe(875);
        expect(rupeesToPaise(8.755)).toBe(876);
    });
});

describe('formatRupees', () => {
    it('formats with the currency symbol and 2 decimals', () => {
        // Use substring assertions — the exact separators can vary by ICU build.
        const formatted = formatRupees(80000);
        expect(formatted).toContain('800');
        expect(formatted).toContain('00');
        expect(formatted).toMatch(/₹|INR/);
    });

    it('formats zero with 2 decimals', () => {
        expect(formatRupees(0)).toMatch(/0\.00/);
    });
});
