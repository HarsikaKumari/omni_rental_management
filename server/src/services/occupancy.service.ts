import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * NOTE ON TRANSACTIONS:
 *   - shiftRoom and moveOut both use prisma.$transaction with an interactive
 *     callback so every read (latest reading check) and every write happen in
 *     one atomic scope.
 *   - We return plain objects with `Number(Decimal)` so responses serialize
 *     cleanly over JSON.
 *   - All ownership checks happen INSIDE the transaction using landlordId
 *     from the JWT — never trust anything else.
 */

interface ShiftInput {
    occupancyId: string;
    landlordId: string;
    newRoomId: string;
    oldRoomFinalReading: number;
    newRoomInitialReading: number;
    newMonthlyRentPaise?: number;
    shiftDate?: Date;
    confirmedRollover?: boolean;
}

interface MoveOutInput {
    occupancyId: string;
    landlordId: string;
    finalReading: number;
    moveOutDate?: Date;
    confirmedRollover?: boolean;
}

export async function shiftRoom(input: ShiftInput) {
    const shiftDate = input.shiftDate ?? new Date();

    return prisma.$transaction(async (tx) => {
        // 1. Current occupancy must be active and belong to landlord.
        const current = await tx.occupancy.findFirst({
            where: { id: input.occupancyId, landlordId: input.landlordId, endDate: null },
            select: {
                id: true,
                tenantId: true,
                roomId: true,
                monthlyRentPaise: true,
                paidTillReading: true,
            },
        });
        if (!current) throw ApiError.notFound('Active occupancy not found');

        if (current.roomId === input.newRoomId) {
            throw ApiError.badRequest('New room is the same as the current room');
        }

        // 2. New room must belong to landlord and be VACANT.
        const newRoom = await tx.room.findFirst({
            where: { id: input.newRoomId, landlordId: input.landlordId },
            select: { id: true, status: true },
        });
        if (!newRoom) throw ApiError.notFound('New room not found');
        if (newRoom.status !== 'VACANT') throw ApiError.conflict('New room is already occupied');

        // 3. Final reading must be ≥ latest reading on this occupancy (or rollover confirmed).
        const latest = await tx.meterReading.findFirst({
            where: { occupancyId: current.id },
            orderBy: { readingDate: 'desc' },
            select: { reading: true },
        });
        const latestValue = latest ? Number(latest.reading) : Number(current.paidTillReading);
        if (input.oldRoomFinalReading < latestValue && !input.confirmedRollover) {
            throw new ApiError(
                422,
                'Final reading is lower than the latest recorded reading. Confirm meter rollover to proceed.',
                'METER_ROLLOVER_UNCONFIRMED',
                { latestReading: latestValue },
            );
        }

        // 4. Close current occupancy.
        await tx.occupancy.update({
            where: { id: current.id },
            data: { endDate: shiftDate },
        });

        // 5. FINAL reading on the old room.
        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: current.roomId,
                occupancyId: current.id,
                reading: input.oldRoomFinalReading,
                type: 'FINAL',
                readingDate: shiftDate,
            },
        });

        // 6. Open new occupancy for the same tenant in the new room.
        const newOccupancy = await tx.occupancy.create({
            data: {
                landlordId: input.landlordId,
                tenantId: current.tenantId,
                roomId: input.newRoomId,
                monthlyRentPaise: input.newMonthlyRentPaise ?? current.monthlyRentPaise,
                startDate: shiftDate,
                paidTillReading: input.newRoomInitialReading,
                endDate: null,
            },
            select: {
                id: true,
                roomId: true,
                startDate: true,
                monthlyRentPaise: true,
                paidTillReading: true,
            },
        });

        // 7. INITIAL reading on the new room.
        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: input.newRoomId,
                occupancyId: newOccupancy.id,
                reading: input.newRoomInitialReading,
                type: 'INITIAL',
                readingDate: shiftDate,
            },
        });

        // 8. Flip room statuses.
        await tx.room.update({
            where: { id: current.roomId },
            data: { status: 'VACANT' },
        });
        await tx.room.update({
            where: { id: input.newRoomId },
            data: { status: 'OCCUPIED' },
        });

        return {
            occupancy: {
                ...newOccupancy,
                paidTillReading: Number(newOccupancy.paidTillReading),
            },
        };
    });
}

export async function moveOut(input: MoveOutInput) {
    const moveOutDate = input.moveOutDate ?? new Date();

    return prisma.$transaction(async (tx) => {
        // 1. Active occupancy for this landlord.
        const occ = await tx.occupancy.findFirst({
            where: { id: input.occupancyId, landlordId: input.landlordId, endDate: null },
            select: { id: true, roomId: true, paidTillReading: true },
        });
        if (!occ) throw ApiError.notFound('Active occupancy not found');

        // 2. Final reading ≥ latest reading (or rollover confirmed).
        const latest = await tx.meterReading.findFirst({
            where: { occupancyId: occ.id },
            orderBy: { readingDate: 'desc' },
            select: { reading: true },
        });
        const latestValue = latest ? Number(latest.reading) : Number(occ.paidTillReading);
        if (input.finalReading < latestValue && !input.confirmedRollover) {
            throw new ApiError(
                422,
                'Final reading is lower than the latest recorded reading. Confirm meter rollover to proceed.',
                'METER_ROLLOVER_UNCONFIRMED',
                { latestReading: latestValue },
            );
        }

        // 3. Close occupancy.
        await tx.occupancy.update({
            where: { id: occ.id },
            data: { endDate: moveOutDate },
        });

        // 4. FINAL reading.
        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: occ.roomId,
                occupancyId: occ.id,
                reading: input.finalReading,
                type: 'FINAL',
                readingDate: moveOutDate,
            },
        });

        // 5. Vacate room.
        await tx.room.update({
            where: { id: occ.roomId },
            data: { status: 'VACANT' },
        });

        return { occupancyId: occ.id, roomId: occ.roomId };
    });
}

/**
 * Build the tenant+occupancy+reading records in one transaction.
 * Called from the tenant controller AFTER the photo has been uploaded
 * (so a DB failure only needs the photo cleaned up, not vice versa).
 */
interface CreateTenantWithOccupancyInput {
    landlordId: string;
    name: string;
    whatsappNumber: string;
    idType: string;
    idNumber: string;
    photoUrl: string | null;
    photoPublicId: string | null;
    monthlyRentPaise: number;
    roomId: string;
    startDate: Date;
    initialReading: number;
}

export async function createTenantWithOccupancy(input: CreateTenantWithOccupancyInput) {
    return prisma.$transaction(async (tx) => {
        // 1. Room must be owned and VACANT.
        const room = await tx.room.findFirst({
            where: { id: input.roomId, landlordId: input.landlordId },
            select: { id: true, status: true },
        });
        if (!room) throw ApiError.notFound('Room not found');
        if (room.status !== 'VACANT') throw ApiError.conflict('Room is already occupied');

        // 2. Tenant.
        const tenant = await tx.tenant.create({
            data: {
                landlordId: input.landlordId,
                name: input.name,
                whatsappNumber: input.whatsappNumber,
                idType: input.idType,
                idNumber: input.idNumber,
                photoUrl: input.photoUrl,
                photoPublicId: input.photoPublicId,
            },
            select: { id: true, name: true, whatsappNumber: true, idType: true, idNumber: true },
        });

        // 3. Occupancy — paidTillReading starts equal to the initial reading.
        const occupancy = await tx.occupancy.create({
            data: {
                landlordId: input.landlordId,
                tenantId: tenant.id,
                roomId: input.roomId,
                monthlyRentPaise: input.monthlyRentPaise,
                startDate: input.startDate,
                paidTillReading: input.initialReading,
                endDate: null,
            },
            select: {
                id: true,
                roomId: true,
                startDate: true,
                monthlyRentPaise: true,
                paidTillReading: true,
            },
        });

        // 4. INITIAL meter reading.
        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: input.roomId,
                occupancyId: occupancy.id,
                reading: input.initialReading,
                type: 'INITIAL',
                readingDate: input.startDate,
            },
        });

        // 5. Room becomes OCCUPIED.
        await tx.room.update({ where: { id: input.roomId }, data: { status: 'OCCUPIED' } });

        return {
            tenant,
            occupancy: { ...occupancy, paidTillReading: Number(occupancy.paidTillReading) },
        };
    });
}

// Reference Prisma type so unused-import linting doesn't strip it if used later.
export type _Prisma = Prisma.TransactionClient;
