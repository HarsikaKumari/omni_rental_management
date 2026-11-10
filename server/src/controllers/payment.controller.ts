import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { addPayment } from '../services/billing.service';

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { billId, amountPaise, paidOn, note } = req.body as {
        billId: string;
        amountPaise: number;
        paidOn?: Date;
        note?: string;
    };

    const payment = await addPayment({
        landlordId,
        billId,
        amountPaise,
        paidOn,
        note,
    });

    res.status(201).json({ payment });
});
