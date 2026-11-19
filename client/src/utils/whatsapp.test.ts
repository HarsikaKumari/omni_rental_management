import { describe, it, expect } from 'vitest';
import {
    buildBillMessage,
    buildWhatsAppLink,
    formatBillingMonth,
    sanitizeWhatsAppNumber,
    type WhatsAppBillData,
} from './whatsapp';

// Two sample bills — one with rent, one electricity-only.
const rentAndElec: WhatsAppBillData = {
    tenantName: 'Ravi Kumar',
    whatsappNumber: '+919876543210',
    billingMonth: '2025-01',
    fromReading: 100,
    toReading: 200,
    units: 100,
    ratePerUnitPaise: 800,
    electricityAmountPaise: 80000,
    rentAmountPaise: 500000,
    totalPaise: 580000,
    type: 'RENT_AND_ELECTRICITY',
};

const elecOnly: WhatsAppBillData = {
    ...rentAndElec,
    type: 'ELECTRICITY_ONLY',
};

describe('sanitizeWhatsAppNumber', () => {
    it('strips +, spaces, dashes and parens', () => {
        expect(sanitizeWhatsAppNumber('+91 98765-43210')).toBe('919876543210');
        expect(sanitizeWhatsAppNumber('(987) 654-3210')).toBe('919876543210');
    });

    it('prepends 91 for a bare 10-digit number', () => {
        expect(sanitizeWhatsAppNumber('9876543210')).toBe('919876543210');
    });
});

describe('formatBillingMonth', () => {
    it('formats YYYY-MM into a month name', () => {
        expect(formatBillingMonth('2025-01')).toBe('January 2025');
        expect(formatBillingMonth('2024-12')).toBe('December 2024');
    });

    it('returns the input unchanged when malformed', () => {
        // Defensive fallback — never throw on a bad month string.
        expect(formatBillingMonth('garbage')).toBe('garbage');
    });
});

describe('buildBillMessage', () => {
    it('includes a Rent line for rent+electricity bills', () => {
        const msg = buildBillMessage(rentAndElec);
        expect(msg).toContain('Hello Ravi Kumar');
        expect(msg).toContain('January 2025');
        expect(msg).toContain('Rent:');          // present
        expect(msg).toContain('Electricity:');
        expect(msg).toContain('Total:');
        // The specific amount depends on Intl formatting — assert substring, not exact.
    });

    it('omits the Rent line for electricity-only bills', () => {
        const msg = buildBillMessage(elecOnly);
        expect(msg).not.toContain('Rent:');
        expect(msg).toContain('Total:');
    });

    it('appends previous rent due only when > 0', () => {
        const noDue = buildBillMessage(rentAndElec);
        expect(noDue).not.toContain('Previous rent due');

        const withDue = buildBillMessage({ ...rentAndElec, previousRentDuePaise: 500000 });
        expect(withDue).toContain('Previous rent due');
    });
});

describe('buildWhatsAppLink', () => {
    it('produces a wa.me URL with the sanitized number', () => {
        const link = buildWhatsAppLink({ ...rentAndElec, whatsappNumber: '+91 98765-43210' });
        expect(link.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    });

    it('URL-encodes the message', () => {
        const link = buildWhatsAppLink(rentAndElec);
        // No raw space or rupee sign after the host: they must be percent-encoded.
        expect(link).not.toMatch(/[\s₹]/);
        expect(link).toContain('%0A');       // newline → %0A
        expect(link).toContain('%E2%82%B9'); // ₹ → UTF-8 percent-encoding
    });
});
