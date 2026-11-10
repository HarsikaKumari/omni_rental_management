import { z } from 'zod';

export const occupancyIdParamSchema = z.object({ id: z.string().min(1) });

const readingSchema = z.coerce
    .number({ invalid_type_error: 'Reading must be a number' })
    .min(0)
    .max(99_999_999);

export const shiftRoomSchema = z.object({
    newRoomId: z.string().min(1, 'New room is required'),
    oldRoomFinalReading: readingSchema,
    newRoomInitialReading: readingSchema,
    newMonthlyRentPaise: z.coerce.number().int().min(1).optional(),
    shiftDate: z.coerce.date().optional(),
    confirmedRollover: z.coerce.boolean().optional(),
});

export const moveOutSchema = z.object({
    finalReading: readingSchema,
    moveOutDate: z.coerce.date().optional(),
    confirmedRollover: z.coerce.boolean().optional(),
});
