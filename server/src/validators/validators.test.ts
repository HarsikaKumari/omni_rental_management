import { describe, it, expect } from 'vitest';
import { createLandlordSchema } from './admin.validator';
import { loginSchema, changePasswordSchema } from './auth.validator';
import { createTenantSchema } from './tenant.validator';
import { generateBillSchema } from './bill.validator';
import { createRoomSchema } from './room.validator';

// Each schema gets a "good input" test (accepts) and a "bad input" test (rejects).
// This is the standard pattern for testing zod schemas.

describe('loginSchema', () => {
    it('accepts a valid email and password', () => {
        expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret' }).success).toBe(true);
    });

    it('rejects a bad email', () => {
        expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    });

    it('rejects an empty password', () => {
        expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    });
});

describe('changePasswordSchema', () => {
    it('rejects a new password under 8 characters', () => {
        expect(
            changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success,
        ).toBe(false);
    });
});

describe('createLandlordSchema', () => {
    it('accepts valid input', () => {
        expect(
            createLandlordSchema.safeParse({
                name: 'Ravi Kumar',
                email: 'ravi@example.com',
                phone: '+919876543210',
                password: 'Test1234!',
            }).success,
        ).toBe(true);
    });

    it('rejects an invalid phone', () => {
        expect(
            createLandlordSchema.safeParse({
                name: 'Ravi Kumar',
                email: 'ravi@example.com',
                phone: '9876543210', // missing +91
                password: 'Test1234!',
            }).success,
        ).toBe(false);
    });
});

describe('createRoomSchema', () => {
    it('accepts a valid room number', () => {
        expect(createRoomSchema.safeParse({ roomNumber: '101' }).success).toBe(true);
    });

    it('rejects an empty room number', () => {
        expect(createRoomSchema.safeParse({ roomNumber: '' }).success).toBe(false);
    });
});

describe('createTenantSchema', () => {
    it('normalises a bare 10-digit phone to E.164', () => {
        // The schema has a .transform() — verify it actually fires.
        const result = createTenantSchema.safeParse({
            name: 'Ravi Kumar',
            whatsappNumber: '9876543210',
            idType: 'AADHAAR',
            idNumber: '123456789012',
            monthlyRentPaise: 500000,
            roomId: 'room_1',
            startDate: '2025-01-15',
            initialReading: 100,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.whatsappNumber).toBe('+919876543210');
        }
    });

    it('rejects a negative initial reading', () => {
        const result = createTenantSchema.safeParse({
            name: 'Ravi Kumar',
            whatsappNumber: '+919876543210',
            idType: 'AADHAAR',
            idNumber: '123456789012',
            monthlyRentPaise: 500000,
            roomId: 'room_1',
            startDate: '2025-01-15',
            initialReading: -5,
        });
        expect(result.success).toBe(false);
    });
});

describe('generateBillSchema (duplicate month guard input)', () => {
    it('accepts YYYY-MM format', () => {
        expect(
            generateBillSchema.safeParse({
                occupancyId: 'occ_1',
                type: 'RENT_AND_ELECTRICITY',
                billingMonth: '2025-01',
                currentReading: 200,
            }).success,
        ).toBe(true);
    });

    it('rejects a non-YYYY-MM billing month', () => {
        // Both "month 13" and "Jan 2025" must be rejected.
        expect(
            generateBillSchema.safeParse({
                occupancyId: 'occ_1',
                type: 'RENT_AND_ELECTRICITY',
                billingMonth: '2025-13',
                currentReading: 200,
            }).success,
        ).toBe(false);
        expect(
            generateBillSchema.safeParse({
                occupancyId: 'occ_1',
                type: 'RENT_AND_ELECTRICITY',
                billingMonth: 'Jan 2025',
                currentReading: 200,
            }).success,
        ).toBe(false);
    });
});
