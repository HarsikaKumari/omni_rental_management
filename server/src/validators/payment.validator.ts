import { z } from 'zod';

export const addPaymentSchema = z.object({
    billId: z.string().min(1),
    amountPaise: z.coerce.number().int().min(1),
    paidOn: z.coerce.date().optional(),
    note: z.string().trim().max(200).optional(),
});
