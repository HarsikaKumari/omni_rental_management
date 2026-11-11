import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import {
    calculateBill,
    computeUnits,
    toBillingMonth,
} from './billing.calc';
import type { BillType } from '@prisma/client';

// ─── shiftRoom (unchanged from Phase 5) ─────────────────────────

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

export async function shiftRoom(input: ShiftInput) {
    const shiftDate = input.shiftDate ?? new Date();

    return prisma.$transaction(async (tx) => {
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

        const newRoom = await tx.room.findFirst({
            where: { id: input.newRoomId, landlordId: input.landlordId },
            select: { id: true, status: true },
        });
        if (!newRoom) throw ApiError.notFound('New room not found');
        if (newRoom.status !== 'VACANT') throw ApiError.conflict('New room is already occupied');

        const latest = await tx.meterReading.findFirst({
            where: { occupancyId: current.id },
            orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
            select: { reading: true },
        });
        const latestVal = latest ? Number(latest.reading) : Number(current.paidTillReading);
        if (input.oldRoomFinalReading < latestVal && !input.confirmedRollover) {
            throw new ApiError(
                422,
                'Final reading is lower than the latest recorded reading. Confirm meter rollover to proceed.',
                'METER_ROLLOVER_UNCONFIRMED',
                { latestReading: latestVal },
            );
        }

        await tx.occupancy.update({
            where: { id: current.id },
            data: { endDate: shiftDate },
        });

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

        await tx.room.update({ where: { id: current.roomId }, data: { status: 'VACANT' } });
        await tx.room.update({ where: { id: input.newRoomId }, data: { status: 'OCCUPIED' } });

        return {
            occupancy: {
                ...newOccupancy,
                paidTillReading: Number(newOccupancy.paidTillReading),
            },
        };
    });
}

// ─── moveOut (now generates a final bill) ───────────────────────

interface MoveOutInput {
    occupancyId: string;
    landlordId: string;
    finalReading: number;
    moveOutDate?: Date;
    confirmedRollover?: boolean;
    finalBillType?: BillType;
}

export async function moveOut(input: MoveOutInput) {
    const moveOutDate = input.moveOutDate ?? new Date();

    return prisma.$transaction(async (tx) => {
        const occ = await tx.occupancy.findFirst({
            where: { id: input.occupancyId, landlordId: input.landlordId, endDate: null },
            select: {
                id: true,
                roomId: true,
                monthlyRentPaise: true,
                paidTillReading: true,
            },
        });
        if (!occ) throw ApiError.notFound('Active occupancy not found');

        const latest = await tx.meterReading.findFirst({
            where: { occupancyId: occ.id },
            orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
            select: { reading: true },
        });
        const latestVal = latest ? Number(latest.reading) : Number(occ.paidTillReading);
        const paidTill = Number(occ.paidTillReading);

        // Fetch capacity for rollover-aware validation.
        const settings = await tx.settings.findUnique({
            where: { landlordId: input.landlordId },
            select: { ratePerUnitPaise: true, meterCapacity: true },
        });
        const capacity = settings?.meterCapacity ?? 99999;

        const unitsToLatest = computeUnits(paidTill, latestVal, capacity);
        const unitsToNew = computeUnits(paidTill, input.finalReading, capacity);
        if (unitsToNew < unitsToLatest) {
            throw ApiError.badRequest(
                `Final reading is behind the latest recorded reading (${latestVal}).`,
            );
        }

        if (input.finalReading < paidTill && latestVal >= paidTill && !input.confirmedRollover) {
            throw new ApiError(
                422,
                'Final reading is lower than the paid-till reading. Confirm meter rollover to proceed.',
                'METER_ROLLOVER_UNCONFIRMED',
                { paidTillReading: paidTill, meterCapacity: capacity },
            );
        }

        await tx.occupancy.update({
            where: { id: occ.id },
            data: { endDate: moveOutDate },
        });

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

        let finalBillId: string | null = null;
        if (input.finalBillType) {
            if (!settings || settings.ratePerUnitPaise <= 0) {
                throw ApiError.badRequest(
                    'Set your electricity rate in Settings before moving out with a final bill',
                );
            }

            const calc = calculateBill({
                fromReading: paidTill,
                toReading: input.finalReading,
                ratePerUnitPaise: settings.ratePerUnitPaise,
                monthlyRentPaise: occ.monthlyRentPaise,
                type: input.finalBillType,
                meterCapacity: capacity,
                confirmedRollover: input.confirmedRollover,
            });

            await tx.bill.updateMany({
                where: { occupancyId: occ.id, status: { in: ['UNPAID', 'PARTIAL'] } },
                data: { status: 'CARRIED_FORWARD' },
            });

            const finalBill = await tx.bill.create({
                data: {
                    landlordId: input.landlordId,
                    occupancyId: occ.id,
                    type: input.finalBillType,
                    billingMonth: toBillingMonth(moveOutDate),
                    isFinal: true,
                    fromReading: paidTill,
                    toReading: input.finalReading,
                    units: calc.units,
                    ratePerUnitPaise: settings.ratePerUnitPaise,
                    electricityAmountPaise: calc.electricityAmountPaise,
                    rentAmountPaise: calc.rentAmountPaise,
                    totalPaise: calc.totalPaise,
                    status: calc.totalPaise === 0 ? 'PAID' : 'UNPAID',
                },
                select: { id: true },
            });
            finalBillId = finalBill.id;
        }

        await tx.room.update({ where: { id: occ.roomId }, data: { status: 'VACANT' } });

        return { occupancyId: occ.id, roomId: occ.roomId, finalBillId };
    });
}

// ─── createTenantWithOccupancy (unchanged) ──────────────────────

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
        const room = await tx.room.findFirst({
            where: { id: input.roomId, landlordId: input.landlordId },
            select: { id: true, status: true },
        });
        if (!room) throw ApiError.notFound('Room not found');
        if (room.status !== 'VACANT') throw ApiError.conflict('Room is already occupied');

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

        await tx.room.update({ where: { id: input.roomId }, data: { status: 'OCCUPIED' } });

        return {
            tenant,
            occupancy: { ...occupancy, paidTillReading: Number(occupancy.paidTillReading) },
        };
    });
}
