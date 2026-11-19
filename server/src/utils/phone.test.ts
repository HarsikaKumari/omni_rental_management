import { describe, it, expect } from 'vitest';
import { normalizeWhatsappNumber } from './phone';

describe('normalizeWhatsappNumber', () => {
    it('adds +91 to a bare 10-digit number', () => {
        // The common case: a landlord types just "9876543210".
        expect(normalizeWhatsappNumber('9876543210')).toBe('+919876543210');
    });

    it('strips spaces and dashes', () => {
        // Copy-pasted phone numbers often have spaces or dashes.
        expect(normalizeWhatsappNumber('98765 43210')).toBe('+919876543210');
        expect(normalizeWhatsappNumber('+91 9876-543-210')).toBe('+919876543210');
    });

    it('keeps a valid E.164 number unchanged', () => {
        expect(normalizeWhatsappNumber('+919876543210')).toBe('+919876543210');
        expect(normalizeWhatsappNumber('+14155550123')).toBe('+14155550123');
    });

    it('throws on a non-numeric string', () => {
        expect(() => normalizeWhatsappNumber('abc')).toThrow();
    });

    it('throws on a number that is too short', () => {
        expect(() => normalizeWhatsappNumber('12345')).toThrow();
    });

    it('throws on a number that is too long', () => {
        expect(() => normalizeWhatsappNumber('1234567890123456')).toThrow();
    });
});
