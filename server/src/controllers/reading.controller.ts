import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const addReading = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { occupancyId, reading, readingDate, confirmedRollover } = req.body as {
        occupancyId: string;
        reading: number;
        readingDate?: Date;
        confirmedRollover?: boolean;
    };

    const occ = await prisma.occupancy.findFirst({
        where: { id: occupancyId, landlordId, endDate: null },
        select: { id: true, roomId: true, paidTillReading: true },
    });
    if (!occ) throw ApiError.notFound('Active occupancy not found');

    const latest = await prisma.meterReading.findFirst({
        where: { occupancyId: occ.id },
        orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
        select: { reading: true },
    });
    const latestVal = latest ? Number(latest.reading) : Number(occ.paidTillReading);
    if (reading < latestVal && !confirmedRollover) {
        throw new ApiError(
            422,
            'Reading is lower than the latest recorded reading. Confirm meter rollover to proceed.',
            'METER_ROLLOVER_UNCONFIRMED',
            { latestReading: latestVal },
        );
    }

    const mr = await prisma.meterReading.create({
        data: {
            landlordId,
            roomId: occ.roomId,
            occupancyId: occ.id,
            reading,
            type: 'MONTHLY',
            readingDate: readingDate ?? new Date(),
        },
        select: { id: true, reading: true, readingDate: true, type: true },
    });

    res.status(201).json({ reading: { ...mr, reading: Number(mr.reading) } });
});
