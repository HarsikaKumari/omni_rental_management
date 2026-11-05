import { z } from 'zod';

// E.164: "+" then 10–15 digits starting with 1–9. Matches "+919876543210".
const phoneRegex = /^\+[1-9]\d{9,14}$/;

export const createLandlordSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().regex(phoneRegex, 'Format: +919876543210'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateLandlordSchema = z
    .object({
        name: z.string().trim().min(2).max(80).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
        phone: z.string().trim().regex(phoneRegex, 'Format: +919876543210').optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
        message: 'Provide at least one field to update',
    });

export const landlordIdParamSchema = z.object({
    id: z.string().min(1),
});

export const listLandlordsQuerySchema = z.object({
    search: z.string().trim().optional(),
});
