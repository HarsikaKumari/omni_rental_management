import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, monthsBetween } from './format';

describe('formatDate', () => {
    it('formats an ISO date without throwing', () => {
        const s = formatDate('2025-01-15T00:00:00.000Z');
        expect(typeof s).toBe('string');
        expect(s).toContain('2025');
    });
});

describe('formatDateRange', () => {
    it('shows "present" when end is null', () => {
        // Active stay — the user should see "→ present", not "→ null".
        expect(formatDateRange('2025-01-15T00:00:00.000Z', null)).toContain('present');
    });

    it('shows both dates when end is set', () => {
        const s = formatDateRange(
            '2025-01-15T00:00:00.000Z',
            '2025-03-15T00:00:00.000Z',
        );
        expect(s).toContain('2025');
        expect(s).not.toContain('present');
    });
});

describe('monthsBetween', () => {
    it('returns at least 1 for the same month', () => {
        // A stay that began and ended in the same month still counts as 1 month.
        expect(monthsBetween('2025-01-01', '2025-01-31')).toBeGreaterThanOrEqual(1);
    });

    it('counts across a year boundary', () => {
        // Jan 2024 → Mar 2025 = 14 months.
        expect(monthsBetween('2024-01-15T00:00:00.000Z', '2025-03-15T00:00:00.000Z')).toBe(14);
    });
});
