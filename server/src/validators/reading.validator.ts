import { z } from 'zod';

export const addReadingSchema = z.object({
    occupancyId: z.string().min(1),
    reading: z.coerce.number().min(0).max(99_999_999),
    readingDate: z.coerce.date().optional(),
    confirmedRollover: z.coerce.boolean().optional(),
});
