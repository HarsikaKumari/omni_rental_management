import { z } from 'zod';
import { normalizeWhatsappNumber } from '../utils/phone';

const idNumberSchema = z
    .string()
    .trim()
    .min(4, 'ID number is too short')
    .max(30, 'ID number is too long')
    .regex(/^[A-Za-z0-9 \-]+$/, 'ID number can contain letters, digits, spaces, and dashes');

const whatsappSchema = z
    .string()
    .trim()
    .transform((v) => {
        try {
            return normalizeWhatsappNumber(v);
        } catch {
            throw new Error('Invalid WhatsApp number');
        }
    });

/**
 * Create flow uses multipart/form-data (because of the optional photo), so
 * all scalar fields arrive as strings. `coerce` bridges them to typed values.
 */
export const createTenantSchema = z.object({
    name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
    whatsappNumber: whatsappSchema,
    idType: z.enum(['AADHAAR', 'OTHER']),
    idNumber: idNumberSchema,
    monthlyRentPaise: z.coerce
        .number({ invalid_type_error: 'Rent must be a number' })
        .int()
        .min(1, 'Rent must be at least ₹0.01'),
    roomId: z.string().min(1, 'Room is required'),
    startDate: z.coerce.date(),
    initialReading: z.coerce
        .number({ invalid_type_error: 'Initial reading must be a number' })
        .min(0, 'Initial reading cannot be negative')
        .max(99_999_999, 'Initial reading is too large'),
});

export const updateTenantSchema = z
    .object({
        name: z.string().trim().min(2).max(80).optional(),
        whatsappNumber: whatsappSchema.optional(),
        idType: z.enum(['AADHAAR', 'OTHER']).optional(),
        idNumber: idNumberSchema.optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
        message: 'Provide at least one field to update',
    })
    .refine(
        (v) => {
            // idType and idNumber must change together — a type without a number
            // or vice versa would leave the record inconsistent.
            const hasType = v.idType !== undefined;
            const hasNumber = v.idNumber !== undefined;
            return hasType === hasNumber;
        },
        { message: 'Provide both idType and idNumber, or neither' },
    );

export const tenantIdParamSchema = z.object({ id: z.string().min(1) });
