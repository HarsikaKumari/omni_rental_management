import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const roomPublicSelect = {
    id: true,
    roomNumber: true,
    status: true,
    createdAt: true,
} as const;

// Every handler gets landlordId from the JWT — never from req.body/params/query.

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;

    const rooms = await prisma.room.findMany({
        where: { landlordId },
        orderBy: { roomNumber: 'asc' },
        select: roomPublicSelect,
    });

    res.json({ rooms });
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };

    // findFirst (not findUnique) so we can constrain landlordId in the same query.
    const room = await prisma.room.findFirst({
        where: { id, landlordId },
        select: roomPublicSelect,
    });
    if (!room) throw ApiError.notFound('Room not found');

    res.json({ room });
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { roomNumber } = req.body as { roomNumber: string };

    // Friendly 409 instead of a raw Prisma unique-violation error.
    const existing = await prisma.room.findFirst({
        where: { landlordId, roomNumber },
        select: { id: true },
    });
    if (existing) throw ApiError.conflict(`Room ${roomNumber} already exists`);

    const room = await prisma.room.create({
        data: { landlordId, roomNumber, status: 'VACANT' },
        select: roomPublicSelect,
    });

    res.status(201).json({ room });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const { roomNumber } = req.body as { roomNumber?: string };

    const target = await prisma.room.findFirst({
        where: { id, landlordId },
        select: { id: true },
    });
    if (!target) throw ApiError.notFound('Room not found');

    if (roomNumber) {
        const clash = await prisma.room.findFirst({
            where: { landlordId, roomNumber, NOT: { id } },
            select: { id: true },
        });
        if (clash) throw ApiError.conflict(`Room ${roomNumber} already exists`);
    }

    const room = await prisma.room.update({
        where: { id },
        data: { roomNumber },
        select: roomPublicSelect,
    });

    res.json({ room });
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };

    const target = await prisma.room.findFirst({
        where: { id, landlordId },
        select: { id: true },
    });
    if (!target) throw ApiError.notFound('Room not found');

    // Rooms that ever had a renter are part of history — occupancies reference
    // roomId, so deleting would break previous-renters views. Block it.
    const occupancyCount = await prisma.occupancy.count({ where: { roomId: id } });
    if (occupancyCount > 0) {
        throw ApiError.conflict(
            'This room has history (past or current renters) and cannot be deleted.',
        );
    }

    await prisma.room.delete({ where: { id } });
    res.json({ ok: true });
});
