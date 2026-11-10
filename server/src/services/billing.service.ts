import type { BillType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

// ─── Pure, unit-testable helpers ────────────────────────────────

export type ComputedStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface BillCalcInput {
    fromReading: number;
    toReading: number;
    ratePerUnitPaise: number;
    monthlyRentPaise: number;
    type: BillType;
}

export interface BillCalcResult {
    units: number;
    electricityAmountPaise: number;
    rentAmountPaise: number;
    totalPaise: number;
}

/**
 * Electricity = round(units * rate). Rent is only added for
 * RENT_AND_ELECTRICITY bills. Never use floats for money beyond this point.
 */
export function calculateBill(input: BillCalcInput): BillCalcResult {
    if (input.toReading < input.fromReading) {
        throw new Error('toReading must be >= fromReading');
    }
    const units = input.toReading - input.fromReading;
    const electricityAmountPaise = Math.round(units * input.ratePerUnitPaise);
    const rentAmountPaise =
        input.type === 'RENT_AND_ELECTRICITY' ? input.monthlyRentPaise : 0;
    const totalPaise = electricityAmountPaise + rentAmountPaise;
    return { units, electricityAmountPaise, rentAmountPaise, totalPaise };
}

/**
 * Bill status derivation. `paidTillReading` lives on the occupancy and is
 * the single source of truth for how much electricity has been paid.
 */
export function computeBillStatus(
    bill: { type: BillType; fromReading: number; toReading: number; rentPaid: boolean },
    paidTillReading: number,
): ComputedStatus {
    const electricityFullyPaid = paidTillReading >= bill.toReading;
    const electricityPartiallyPaid = paidTillReading > bill.fromReading;
    const rentConsidered = bill.type === 'ELECTRICITY_ONLY' || bill.rentPaid;

    if (electricityFullyPaid && rentConsidered) return 'PAID';
    if (electricityPartiallyPaid || bill.rentPaid) return 'PARTIAL';
    return 'UNPAID';
}

export function toBillingMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

// ─── Internal helper (used inside transactions only) ────────────

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

// ─── Generate a bill (transaction) ──────────────────────────────

export interface GenerateBillInput {
    occupancyId: string;
    landlordId: string;
    type: BillType;
    billingMonth: string; // YYYY-MM
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

        // Block duplicate normal bills for the same month (spec).
        const dup = await tx.bill.findFirst({
            where: { occupancyId: occ.id, billingMonth: input.billingMonth, isFinal: false },
            select: { id: true },
        });
        if (dup) throw ApiError.conflict('A bill already exists for this month');

        const settings = await tx.settings.findUnique({
            where: { landlordId: input.landlordId },
            select: { ratePerUnitPaise: true },
        });
        if (!settings || settings.ratePerUnitPaise <= 0) {
            throw ApiError.badRequest('Set your electricity rate in Settings first');
        }

        const paidTill = Number(occ.paidTillReading);
        const latestVal = await latestReadingValue(tx, occ.id, paidTill);
        if (input.currentReading < latestVal && !input.confirmedRollover) {
            throw new ApiError(
                422,
                'Reading is lower than the latest recorded reading. Confirm meter rollover to proceed.',
                'METER_ROLLOVER_UNCONFIRMED',
                { latestReading: latestVal },
            );
        }

        const calc = calculateBill({
            fromReading: paidTill,
            toReading: input.currentReading,
            ratePerUnitPaise: settings.ratePerUnitPaise,
            monthlyRentPaise: occ.monthlyRentPaise,
            type: input.type,
        });

        // 1. Persist the reading that justifies this bill.
        await tx.meterReading.create({
            data: {
                landlordId: input.landlordId,
                roomId: occ.roomId,
                occupancyId: occ.id,
                reading: input.currentReading,
                type: 'MONTHLY',
            },
        });

        // 2. Carry forward older unpaid/partial bills BEFORE creating the new one,
        //    so the new bill itself doesn't get flipped to CARRIED_FORWARD.
        await tx.bill.updateMany({
            where: { occupancyId: occ.id, status: { in: ['UNPAID', 'PARTIAL'] } },
            data: { status: 'CARRIED_FORWARD' },
        });

        // 3. Create the new bill.
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

// ─── Paid-till reading (transaction) ────────────────────────────

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

        const currentPaidTill = Number(occ.paidTillReading);
        if (input.paidTillReading < currentPaidTill) {
            throw ApiError.badRequest(
                `Paid-till cannot be lower than current paid-till (${currentPaidTill})`,
            );
        }
        const latestVal = await latestReadingValue(tx, occ.id, currentPaidTill);
        if (input.paidTillReading > latestVal) {
            throw ApiError.badRequest(
                `Paid-till cannot exceed the latest reading (${latestVal})`,
            );
        }
        if (input.paidTillReading === currentPaidTill) {
            return { ok: true, alreadyAtReading: currentPaidTill };
        }

        await tx.occupancy.update({
            where: { id: occ.id },
            data: { paidTillReading: input.paidTillReading },
        });

        const unitsPaid = input.paidTillReading - currentPaidTill;
        const amountPaise = Math.round(unitsPaid * bill.ratePerUnitPaise);
        if (amountPaise > 0) {
            await tx.payment.create({
                data: {
                    landlordId: input.landlordId,
                    billId: bill.id,
                    amountPaise,
                    note: `Paid till reading ${input.paidTillReading} (${unitsPaid} units)`,
                },
            });
        }

        await recomputeBillStatuses(tx, occ.id, input.landlordId);
        return { ok: true };
    });
}

// ─── Mark fully paid (elec + rent) ──────────────────────────────

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
        if (bill.status === 'PAID') {
            return { ok: true, alreadyPaid: true };
        }

        const occ = await tx.occupancy.findFirst({
            where: { id: bill.occupancyId, landlordId },
            select: { id: true, paidTillReading: true },
        });
        if (!occ) throw ApiError.notFound('Occupancy not found');

        const currentPaidTill = Number(occ.paidTillReading);
        const latestVal = await latestReadingValue(tx, occ.id, currentPaidTill);

        if (latestVal > currentPaidTill) {
            await tx.occupancy.update({
                where: { id: occ.id },
                data: { paidTillReading: latestVal },
            });
            const unitsPaid = latestVal - currentPaidTill;
            const amountPaise = Math.round(unitsPaid * bill.ratePerUnitPaise);
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

// ─── Mark rent paid (one-way) ───────────────────────────────────

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
        if (bill.rentPaid) {
            return { ok: true, alreadyPaid: true };
        }

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

// ─── Manual payment (log only, no status change) ────────────────

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
