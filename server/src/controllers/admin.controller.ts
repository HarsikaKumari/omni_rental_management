import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// ⚠️ If you switched to bcryptjs on Windows, change the import above.

const landlordPublicSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    status: true,
    createdAt: true,
} as const;

export const listLandlords = asyncHandler(async (req: Request, res: Response) => {
    const { search } = req.query as { search?: string };

    const where = {
        role: 'LANDLORD' as const,
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search } },
                ],
            }
            : {}),
    };

    const landlords = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: landlordPublicSelect,
    });

    res.json({ landlords });
});

export const getLandlord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const landlord = await prisma.user.findFirst({
        where: { id, role: 'LANDLORD' },
        select: landlordPublicSelect,
    });
    if (!landlord) throw ApiError.notFound('Landlord not found');
    res.json({ landlord });
});

export const createLandlord = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, password } = req.body as {
        name: string;
        email: string;
        phone: string;
        password: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('A user with that email already exists');

    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user AND its settings row atomically — a landlord without a
    // settings row would crash the billing flow later.
    const landlord = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: { name, email, phone, passwordHash, role: 'LANDLORD', status: 'ACTIVE' },
            select: landlordPublicSelect,
        });
        await tx.settings.create({
            data: { landlordId: user.id, ratePerUnitPaise: 0 },
        });
        return user;
    });

    res.status(201).json({ landlord });
});

export const updateLandlord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const updates = req.body as {
        name?: string;
        email?: string;
        phone?: string;
        status?: 'ACTIVE' | 'SUSPENDED';
    };

    const target = await prisma.user.findFirst({
        where: { id, role: 'LANDLORD' },
        select: { id: true },
    });
    if (!target) throw ApiError.notFound('Landlord not found');

    // If the email changes, ensure it isn't already taken by anyone else.
    if (updates.email) {
        const clash = await prisma.user.findFirst({
            where: { email: updates.email, NOT: { id } },
            select: { id: true },
        });
        if (clash) throw ApiError.conflict('Email already in use');
    }

    const landlord = await prisma.user.update({
        where: { id },
        data: updates,
        select: landlordPublicSelect,
    });

    res.json({ landlord });
});

export const deleteLandlord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const target = await prisma.user.findFirst({
        where: { id, role: 'LANDLORD' },
        select: { id: true },
    });
    if (!target) throw ApiError.notFound('Landlord not found');

    // Cascade deletes (configured in schema.prisma) remove rooms, tenants,
    // occupancies, readings, bills, payments, and settings.
    // Note: Cloudinary images for this landlord's tenants will be orphaned;
    // acceptable for MVP — see "Edge cases" at the end of this phase.
    await prisma.user.delete({ where: { id } });

    res.json({ ok: true });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
    const [totalLandlords, activeLandlords, suspendedLandlords, totalRooms, activeRenters] =
        await Promise.all([
            prisma.user.count({ where: { role: 'LANDLORD' } }),
            prisma.user.count({ where: { role: 'LANDLORD', status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: 'LANDLORD', status: 'SUSPENDED' } }),
            prisma.room.count(),
            prisma.occupancy.count({ where: { endDate: null } }),
        ]);

    res.json({
        totalLandlords,
        activeLandlords,
        suspendedLandlords,
        totalRooms,
        activeRenters,
    });
});
