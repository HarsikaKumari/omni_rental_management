import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { moveOut, shiftRoom } from '../services/occupancy.service';

export const shiftRoomController = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const body = req.body as {
        newRoomId: string;
        oldRoomFinalReading: number;
        newRoomInitialReading: number;
        newMonthlyRentPaise?: number;
        shiftDate?: Date;
        confirmedRollover?: boolean;
    };

    const result = await shiftRoom({
        occupancyId: id,
        landlordId,
        ...body,
    });

    res.json(result);
});

export const moveOutController = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const body = req.body as {
        finalReading: number;
        moveOutDate?: Date;
        confirmedRollover?: boolean;
    };

    const result = await moveOut({
        occupancyId: id,
        landlordId,
        ...body,
    });

    res.json(result);
});
