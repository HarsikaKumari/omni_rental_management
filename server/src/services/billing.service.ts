import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import {
    calculateBill,
    computeBillStatus,
    computeUnits,
    toBillingMonth,
} from './billing.calc';

// Re-export pure helpers so existing imports from billing.service still work.
export {
    calculateBill,
    computeBillStatus,
    computeUnits,
    toBillingMonth,
};
export type { BillCalcInput, BillCalcResult, ComputedStatus } from './billing.calc';

// ─── internal helpers (need prisma tx) ──────────────────────────

async function recomputeBillStatuses(
    tx: Prisma.TransactionClient,
    occupancyId: string,
    landlordId: string,
): Promise<void> {
    const occ = await tx.occupancy.findFirst({
        where: { id: occupancyId, landlordId },
        select: { paidTillReading: true },
    });
    if (!occ) return;
    const paidTill = Number(occ.paidTillReading);

    const bills = await tx.bill.findMany({
        where: { occupancyId, landlordId, status: { not: 'CARRIED_FORWARD' } },
        select: {
            id: true,
            type: true,
            fromReading: true,
            toReading: true,
            rentPaid: true,
            status: true,
        },
    });

    for (const b of bills) {
        const next = computeBillStatus(
            {
                type: b.type,
                fromReading: Number(b.fromReading),
                toReading: Number(b.toReading),
                rentPaid: b.rentPaid,
            },
            paidTill,
        );
        if (next !== b.status) {
            await tx.bill.update({ where: { id: b.id }, data: { status: next } });
        }
    }
}

async function latestReadingValue(
    tx: Prisma.TransactionClient,
    occupancyId: string,
    fallback: number,
): Promise<number> {
    const latest = await tx.meterReading.findFirst({
        where: { occupancyId },
        orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
        select: { reading: true },
    });
    return latest ? Number(latest.reading) : fallback;
}

// ─── generate a bill (transaction) ──────────────────────────────

export interface GenerateBillInput {
    occupancyId: string;
    landlordId: string;
    type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
    billingMonth: string;
    currentReading: number;
    confirmedRollover?: boolean;
}

export async function generateBill(input: GenerateBillInput) {
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

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billingMonth)) {
            throw ApiError.badRequest('billingMonth must be YYYY-MM');
        }

        const dup = await tx.bill.findFirst({
            where: { occupancyId: occ.id, billingMonth: input.billingMonth, isFinal: false },
            select: { id: true },
        });
        if (dup) throw ApiError.conflict('A bill already exists for this month');

        const settings = await tx.settings.findUnique({
            where: { landlordId: input.landlordId },
            select: { ratePerUnitPaise: true, meterCapacity: true },
        });
        if (!settings || settings.ratePerUnitPaise <= 0) {
            throw ApiError.badRequest('Set your electricity rate in Settings first');
        }

        const paidTill = Number(occ.paidTillReading);
        const latestVal = await latestReadingValue(tx, occ.id, paidTill);

        // Reading must not be behind the latest recorded reading (rollover-aware).
        const unitsToLatest = computeUnits(paidTill, latestVal, settings.meterCapacity);
        const unitsToNew = computeUnits(paidTill, input.currentReading, settings.meterCapacity);
        if (unitsToNew < unitsToLatest) {
            throw ApiError.badRequest(
                `Reading is behind the latest recorded reading (${latestVal}).`,
            );
        }

        // calculateBill itself throws if rollover is required but not confirmed.
        let calc;
        try {
            calc = calculateBill({
                fromReading: paidTill,
                toReading: input.currentReading,
                ratePerUnitPaise: settings.ratePerUnitPaise,
                monthlyRentPaise: occ.monthlyRentPaise,
                type: input.type,
                meterCapacity: settings.meterCapacity,
                confirmedRollover: input.confirmedRollover,
            });
        } catch (err) {
            if (err instanceof Error && err.message.includes('rollover')) {
                throw new ApiError(
                    422,
                    'Reading is lower than paid-till reading. Confirm meter rollover to proceed.',
                    'METER_ROLLOVER_UNCONFIRMED',
                    { paidTillReading: paidTill, meterCapacity: settings.meterCapacity },
                );
            }
            throw err;
        }

        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: occ.roomId,
                occupancyId: occ.id,
                reading: input.currentReading,
                type: 'MONTHLY',
            },
        });

        await tx.bill.updateMany({
            where: { occupancyId: occ.id, status: { in: ['UNPAID', 'PARTIAL'] } },
            data: { status: 'CARRIED_FORWARD' },
        });

        const bill = await tx.bill.create({
            data: {
                landlordId: input.landlordId,
                occupancyId: occ.id,
                type: input.type,
                billingMonth: input.billingMonth,
                isFinal: false,
                fromReading: paidTill,
                toReading: input.currentReading,
                units: calc.units,
                ratePerUnitPaise: settings.ratePerUnitPaise,
                electricityAmountPaise: calc.electricityAmountPaise,
                rentAmountPaise: calc.rentAmountPaise,
                totalPaise: calc.totalPaise,
                status: calc.totalPaise === 0 ? 'PAID' : 'UNPAID',
            },
            select: { id: true },
        });

        return { billId: bill.id };
    });
}

// ─── paid-till (rollover-aware) ─────────────────────────────────

export interface PaidTillInput {
    billId: string;
    landlordId: string;
    paidTillReading: number;
}

export async function recordPaidTill(input: PaidTillInput) {
    return prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findFirst({
            where: { id: input.billId, landlordId: input.landlordId },
            select: { id: true, occupancyId: true, ratePerUnitPaise: true },
        });
        if (!bill) throw ApiError.notFound('Bill not found');

        const occ = await tx.occupancy.findFirst({
            where: { id: bill.occupancyId, landlordId: input.landlordId },
            select: { id: true, paidTillReading: true },
        });
        if (!occ) throw ApiError.notFound('Occupancy not found');

        const settings = await tx.settings.findUnique({
            where: { landlordId: input.landlordId },
            select: { meterCapacity: true },
        });
        const capacity = settings?.meterCapacity ?? 99999;

        const currentPaidTill = Number(occ.paidTillReading);
        const latestVal = await latestReadingValue(tx, occ.id, currentPaidTill);

        // Rollover-aware comparison: computeUnits handles the "X < paidTill" wrap.
        const unitsToX = computeUnits(currentPaidTill, input.paidTillReading, capacity);
        const unitsToLatest = computeUnits(currentPaidTill, latestVal, capacity);

        if (unitsToX > unitsToLatest) {
            throw ApiError.badRequest(
                `Paid-till cannot exceed the latest reading (${latestVal}).`,
            );
        }
        if (unitsToX === 0) {
            return { ok: true, alreadyAtReading: currentPaidTill };
        }

        await tx.occupancy.update({
            where: { id: occ.id },
            data: { paidTillReading: input.paidTillReading },
        });

        const amountPaise = Math.round(unitsToX * bill.ratePerUnitPaise);
        if (amountPaise > 0) {
            await tx.payment.create({
                data: {
                    landlordId: input.landlordId,
                    billId: bill.id,
                    amountPaise,
                    note: `Paid till reading ${input.paidTillReading} (${unitsToX} units)`,
                },
            });
        }

        await recomputeBillStatuses(tx, occ.id, input.landlordId);
        return { ok: true };
    });
}

// ─── mark fully paid ────────────────────────────────────────────

export async function markFullyPaid(billId: string, landlordId: string) {
    return prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findFirst({
            where: { id: billId, landlordId },
            select: {
                id: true,
                occupancyId: true,
                type: true,
                rentPaid: true,
                rentAmountPaise: true,
                ratePerUnitPaise: true,
                status: true,
            },
        });
        if (!bill) throw ApiError.notFound('Bill not found');
        if (bill.status === 'CARRIED_FORWARD') {
            throw ApiError.badRequest(
                'Cannot mark fully paid on a carried-forward bill. Use "Mark rent paid" or pay the current bill.',
            );
        }
        if (bill.status === 'PAID') return { ok: true, alreadyPaid: true };

        const occ = await tx.occupancy.findFirst({
            where: { id: bill.occupancyId, landlordId },
            select: { id: true, paidTillReading: true },
        });
        if (!occ) throw ApiError.notFound('Occupancy not found');

        const settings = await tx.settings.findUnique({
            where: { landlordId },
            select: { meterCapacity: true },
        });
        const capacity = settings?.meterCapacity ?? 99999;

        const currentPaidTill = Number(occ.paidTillReading);
        const latestVal = await latestReadingValue(tx, occ.id, currentPaidTill);

        const unitsOutstanding = computeUnits(currentPaidTill, latestVal, capacity);
        if (unitsOutstanding > 0) {
            await tx.occupancy.update({
                where: { id: occ.id },
                data: { paidTillReading: latestVal },
            });
            const amountPaise = Math.round(unitsOutstanding * bill.ratePerUnitPaise);
            if (amountPaise > 0) {
                await tx.payment.create({
                    data: {
                        landlordId,
                        billId: bill.id,
                        amountPaise,
                        note: `Electricity fully paid (reading ${latestVal})`,
                    },
                });
            }
        }

        if (bill.type === 'RENT_AND_ELECTRICITY' && !bill.rentPaid && bill.rentAmountPaise > 0) {
            await tx.bill.update({ where: { id: bill.id }, data: { rentPaid: true } });
            await tx.payment.create({
                data: {
                    landlordId,
                    billId: bill.id,
                    amountPaise: bill.rentAmountPaise,
                    note: 'Rent paid',
                },
            });
        }

        await recomputeBillStatuses(tx, occ.id, landlordId);
        return { ok: true };
    });
}

// ─── mark rent paid ─────────────────────────────────────────────

export async function markRentPaid(billId: string, landlordId: string) {
    return prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findFirst({
            where: { id: billId, landlordId },
            select: {
                id: true,
                occupancyId: true,
                type: true,
                rentPaid: true,
                rentAmountPaise: true,
            },
        });
        if (!bill) throw ApiError.notFound('Bill not found');
        if (bill.type !== 'RENT_AND_ELECTRICITY') {
            throw ApiError.badRequest('This bill has no rent component');
        }
        if (bill.rentPaid) return { ok: true, alreadyPaid: true };

        await tx.bill.update({ where: { id: bill.id }, data: { rentPaid: true } });
        if (bill.rentAmountPaise > 0) {
            await tx.payment.create({
                data: {
                    landlordId,
                    billId: bill.id,
                    amountPaise: bill.rentAmountPaise,
                    note: 'Rent paid',
                },
            });
        }

        await recomputeBillStatuses(tx, bill.occupancyId, landlordId);
        return { ok: true };
    });
}

// ─── manual payment ─────────────────────────────────────────────

export interface AddPaymentInput {
    landlordId: string;
    billId: string;
    amountPaise: number;
    paidOn?: Date;
    note?: string;
}

export async function addPayment(input: AddPaymentInput) {
    const bill = await prisma.bill.findFirst({
        where: { id: input.billId, landlordId: input.landlordId },
        select: { id: true },
    });
    if (!bill) throw ApiError.notFound('Bill not found');

    return prisma.payment.create({
        data: {
            landlordId: input.landlordId,
            billId: input.billId,
            amountPaise: input.amountPaise,
            paidOn: input.paidOn ?? new Date(),
            note: input.note,
        },
        select: { id: true, amountPaise: true, paidOn: true, note: true },
    });
}
