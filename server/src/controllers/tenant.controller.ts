import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { last4 } from '../utils/mask';
import { deletePhoto, getSignedPhotoUrl, uploadTenantPhoto } from '../services/image.service';
import { createTenantWithOccupancy } from '../services/occupancy.service';

// Note: `idNumber` is never selected by list endpoints. Detail selects it
// internally but masks it before sending to the client.

const tenantSummarySelect = {
    id: true,
    name: true,
    whatsappNumber: true,
    idType: true,
    idNumber: true, // masked before serialization
    photoPublicId: true,
    createdAt: true,
} as const;

function maskTenant<T extends { idNumber: string; photoPublicId: string | null }>(t: T) {
    const { idNumber, photoPublicId, ...rest } = t;
    return {
        ...rest,
        idNumberLast4: last4(idNumber),
        photoUrl: getSignedPhotoUrl(photoPublicId),
    };
}

// ── current renters ──────────────────────────────────────────────

export const listCurrentTenants = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;

    const occupancies = await prisma.occupancy.findMany({
        where: { landlordId, endDate: null },
        orderBy: { startDate: 'desc' },
        select: {
            id: true,
            startDate: true,
            monthlyRentPaise: true,
            paidTillReading: true,
            room: { select: { id: true, roomNumber: true } },
            tenant: { select: tenantSummarySelect },
        },
    });

    res.json({
        renters: occupancies.map((o) => ({
            occupancyId: o.id,
            startDate: o.startDate,
            monthlyRentPaise: o.monthlyRentPaise,
            paidTillReading: Number(o.paidTillReading),
            room: o.room,
            tenant: maskTenant(o.tenant),
        })),
    });
});

// ── previous renters ─────────────────────────────────────────────

export const listPreviousTenants = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;

    // Tenants with at least one past stay and no active stay.
    const tenants = await prisma.tenant.findMany({
        where: {
            landlordId,
            occupancies: {
                some: { endDate: { not: null } },
                none: { endDate: null },
            },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
            ...tenantSummarySelect,
            occupancies: {
                orderBy: { startDate: 'desc' },
                take: 1,
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    monthlyRentPaise: true,
                    room: { select: { id: true, roomNumber: true } },
                },
            },
        },
    });

    res.json({
        renters: tenants.map((t) => {
            const last = t.occupancies[0] ?? null;
            const { occupancies: _omit, ...rest } = t;
            return {
                ...maskTenant(rest),
                lastStay: last
                    ? {
                        occupancyId: last.id,
                        startDate: last.startDate,
                        endDate: last.endDate,
                        monthlyRentPaise: last.monthlyRentPaise,
                        room: last.room,
                    }
                    : null,
            };
        }),
    });
});

// ── single tenant detail (with all occupancies) ──────────────────

export const getTenant = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };

    const tenant = await prisma.tenant.findFirst({
        where: { id, landlordId },
        select: {
            ...tenantSummarySelect,
            occupancies: {
                orderBy: { startDate: 'desc' },
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    monthlyRentPaise: true,
                    paidTillReading: true,
                    room: { select: { id: true, roomNumber: true } },
                },
            },
        },
    });
    if (!tenant) throw ApiError.notFound('Renter not found');

    const { occupancies, ...rest } = tenant;
    res.json({
        tenant: {
            ...maskTenant(rest),
            occupancies: occupancies.map((o) => ({
                ...o,
                paidTillReading: Number(o.paidTillReading),
            })),
        },
    });
});

// ── create tenant + first occupancy ──────────────────────────────

export const createTenant = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const body = req.body as {
        name: string;
        whatsappNumber: string;
        idType: 'AADHAAR' | 'OTHER';
        idNumber: string;
        monthlyRentPaise: number;
        roomId: string;
        startDate: Date;
        initialReading: number;
    };

    // Reject future start dates (small tolerance for clock skew).
    if (body.startDate.getTime() > Date.now() + 60_000) {
        throw ApiError.badRequest('Start date cannot be in the future');
    }

    // Photo upload is OPTIONAL and best-effort: a failure must not block creation.
    let photo: { url: string; publicId: string } | null = null;
    const file = req.file as Express.Multer.File | undefined;
    if (file) {
        try {
            photo = await uploadTenantPhoto(file.buffer, landlordId, file.mimetype);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[tenant] photo upload failed:', err instanceof Error ? err.message : err);
        }
    }

    try {
        const result = await createTenantWithOccupancy({
            landlordId,
            ...body,
            photoUrl: photo?.url ?? null,
            photoPublicId: photo?.publicId ?? null,
        });

        res.status(201).json({
            tenant: maskTenant(result.tenant),
            occupancy: result.occupancy,
        });
    } catch (err) {
        // DB failed after a successful upload — clean up the orphan image.
        if (photo) await deletePhoto(photo.publicId);
        throw err;
    }
});

// ── update tenant basics (name/phone/id only) ────────────────────

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const updates = req.body as {
        name?: string;
        whatsappNumber?: string;
        idType?: 'AADHAAR' | 'OTHER';
        idNumber?: string;
    };

    const target = await prisma.tenant.findFirst({
        where: { id, landlordId },
        select: { id: true },
    });
    if (!target) throw ApiError.notFound('Renter not found');

    const tenant = await prisma.tenant.update({
        where: { id },
        data: updates,
        select: tenantSummarySelect,
    });

    res.json({ tenant: maskTenant(tenant) });
});

// ── update / remove photo ────────────────────────────────────────

export const updateTenantPhoto = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const file = req.file as Express.Multer.File | undefined;
    if (!file) throw ApiError.badRequest('No image provided');

    const target = await prisma.tenant.findFirst({
        where: { id, landlordId },
        select: { id: true, photoPublicId: true },
    });
    if (!target) throw ApiError.notFound('Renter not found');

    let uploaded: { url: string; publicId: string };
    try {
        uploaded = await uploadTenantPhoto(file.buffer, landlordId, file.mimetype);
    } catch (err) {
        throw ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed');
    }

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { photoUrl: uploaded.url, photoPublicId: uploaded.publicId },
            select: tenantSummarySelect,
        });
        // Best-effort: delete the previous photo AFTER the DB succeeded.
        if (target.photoPublicId) await deletePhoto(target.photoPublicId);
        res.json({ tenant: maskTenant(tenant) });
    } catch (err) {
        await deletePhoto(uploaded.publicId); // roll back the just-uploaded image
        throw err;
    }
});

export const deleteTenantPhoto = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };

    const target = await prisma.tenant.findFirst({
        where: { id, landlordId },
        select: { id: true, photoPublicId: true },
    });
    if (!target) throw ApiError.notFound('Renter not found');

    if (!target.photoPublicId) {
        return res.json({ ok: true }); // idempotent
    }

    const tenant = await prisma.tenant.update({
        where: { id },
        data: { photoUrl: null, photoPublicId: null },
        select: tenantSummarySelect,
    });
    await deletePhoto(target.photoPublicId);
    res.json({ tenant: maskTenant(tenant) });
});
