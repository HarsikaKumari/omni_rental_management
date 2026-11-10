import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import {
    calculateBill,
    generateBill,
    markFullyPaid,
    markRentPaid,
    recordPaidTill,
} from '../services/billing.service';

// ── preview (read-only) ─────────────────────────────────────────

export const previewBill = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { occupancyId, currentReading, type } = req.body as {
        occupancyId: string;
        currentReading: number;
        type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
    };

    const occ = await prisma.occupancy.findFirst({
        where: { id: occupancyId, landlordId, endDate: null },
        select: { id: true, monthlyRentPaise: true, paidTillReading: true },
    });
    if (!occ) throw ApiError.notFound('Active occupancy not found');

    const settings = await prisma.settings.findUnique({
        where: { landlordId },
        select: { ratePerUnitPaise: true },
    });
    if (!settings || settings.ratePerUnitPaise <= 0) {
        throw ApiError.badRequest('Set your electricity rate in Settings first');
    }

    const latest = await prisma.meterReading.findFirst({
        where: { occupancyId: occ.id },
        orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
        select: { reading: true },
    });
    const latestVal = latest ? Number(latest.reading) : Number(occ.paidTillReading);

    const paidTill = Number(occ.paidTillReading);
    const calc = calculateBill({
        fromReading: paidTill,
        toReading: currentReading,
        ratePerUnitPaise: settings.ratePerUnitPaise,
        monthlyRentPaise: occ.monthlyRentPaise,
        type,
    });

    // Prior unpaid rent (from carried-forward bills) shown as "previous due".
    const carried = await prisma.bill.findMany({
        where: {
            occupancyId: occ.id,
            landlordId,
            status: 'CARRIED_FORWARD',
            rentPaid: false,
            type: 'RENT_AND_ELECTRICITY',
        },
        select: { id: true, billingMonth: true, rentAmountPaise: true },
    });
    const previousRentDuePaise = carried.reduce((s, b) => s + b.rentAmountPaise, 0);

    res.json({
        preview: {
            fromReading: paidTill,
            toReading: currentReading,
            units: calc.units,
            ratePerUnitPaise: settings.ratePerUnitPaise,
            electricityAmountPaise: calc.electricityAmountPaise,
            rentAmountPaise: calc.rentAmountPaise,
            totalPaise: calc.totalPaise,
            latestReading: latestVal,
            valid: currentReading >= latestVal,
            previousRentDuePaise,
            previousRentDueBills: carried,
        },
    });
});

// ── generate ────────────────────────────────────────────────────

export const createBill = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const body = req.body as {
        occupancyId: string;
        type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
        billingMonth: string;
        currentReading: number;
        confirmedRollover?: boolean;
    };

    const result = await generateBill({ landlordId, ...body });
    res.status(201).json(result);
});

// ── list ────────────────────────────────────────────────────────

export const listBills = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { status, occupancyId, limit } = req.query as {
        status?: string[];
        occupancyId?: string;
        limit: number;
    };

    const bills = await prisma.bill.findMany({
        where: {
            landlordId,
            ...(occupancyId ? { occupancyId } : {}),
            ...(status && status.length
                ? { status: { in: status as ('UNPAID' | 'PARTIAL' | 'PAID' | 'CARRIED_FORWARD')[] } }
                : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            type: true,
            billingMonth: true,
            isFinal: true,
            fromReading: true,
            toReading: true,
            units: true,
            totalPaise: true,
            rentAmountPaise: true,
            electricityAmountPaise: true,
            status: true,
            rentPaid: true,
            createdAt: true,
            occupancy: {
                select: {
                    id: true,
                    paidTillReading: true,
                    room: { select: { id: true, roomNumber: true } },
                    tenant: { select: { id: true, name: true } },
                },
            },
        },
    });

    res.json({
        bills: bills.map((b) => ({
            ...b,
            fromReading: Number(b.fromReading),
            toReading: Number(b.toReading),
            units: Number(b.units),
            occupancy: {
                ...b.occupancy,
                paidTillReading: Number(b.occupancy.paidTillReading),
            },
        })),
    });
});

// ── get one ─────────────────────────────────────────────────────

export const getBill = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };

    const bill = await prisma.bill.findFirst({
        where: { id, landlordId },
        select: {
            id: true,
            type: true,
            billingMonth: true,
            isFinal: true,
            fromReading: true,
            toReading: true,
            units: true,
            ratePerUnitPaise: true,
            electricityAmountPaise: true,
            rentAmountPaise: true,
            totalPaise: true,
            status: true,
            rentPaid: true,
            createdAt: true,
            occupancy: {
                select: {
                    id: true,
                    paidTillReading: true,
                    tenant: {
                        select: { id: true, name: true, whatsappNumber: true },
                    },
                    room: { select: { id: true, roomNumber: true } },
                },
            },
            payments: {
                orderBy: { paidOn: 'desc' },
                select: { id: true, amountPaise: true, paidOn: true, note: true },
            },
        },
    });
    if (!bill) throw ApiError.notFound('Bill not found');

    const carried = await prisma.bill.findMany({
        where: {
            occupancyId: bill.occupancy.id,
            landlordId,
            status: 'CARRIED_FORWARD',
            rentPaid: false,
            type: 'RENT_AND_ELECTRICITY',
        },
        orderBy: { billingMonth: 'asc' },
        select: { id: true, billingMonth: true, rentAmountPaise: true },
    });
    const previousRentDuePaise = carried.reduce((s, b) => s + b.rentAmountPaise, 0);

    const latest = await prisma.meterReading.findFirst({
        where: { occupancyId: bill.occupancy.id },
        orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
        select: { reading: true },
    });

    res.json({
        bill: {
            ...bill,
            fromReading: Number(bill.fromReading),
            toReading: Number(bill.toReading),
            units: Number(bill.units),
            occupancy: {
                ...bill.occupancy,
                paidTillReading: Number(bill.occupancy.paidTillReading),
            },
            latestReading: latest ? Number(latest.reading) : null,
            previousRentDuePaise,
            previousRentDueBills: carried,
        },
    });
});

// ── paid-till ───────────────────────────────────────────────────

export const paidTill = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const { paidTillReading } = req.body as { paidTillReading: number };

    const result = await recordPaidTill({ billId: id, landlordId, paidTillReading });
    res.json(result);
});

// ── mark fully paid ─────────────────────────────────────────────

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const result = await markFullyPaid(id, landlordId);
    res.json(result);
});

// ── mark rent paid ──────────────────────────────────────────────

export const rentPaid = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;
    const { id } = req.params as { id: string };
    const result = await markRentPaid(id, landlordId);
    res.json(result);
});