import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Dashboard summary. Dues computation:
 *   - For each PAID bill: nothing owed.
 *   - For each CARRIED_FORWARD bill: only rent still owed (if rentPaid=false).
 *     Electricity from carried-forward bills was absorbed into the newer bill.
 *   - For each UNPAID/PARTIAL bill: rent owed if !rentPaid; electricity owed
 *     is (electricityAmount - electricityPortionPaid).
 *
 * "electricityPortionPaid" is derived from recorded payments on that bill:
 * if rentPaid is true, the rent portion was covered, so any remaining
 * payments went to electricity; if rentPaid is false, all payments went
 * to electricity.
 */
function computeDues(
    bills: Array<{
        status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'CARRIED_FORWARD';
        type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
        totalPaise: number;
        rentAmountPaise: number;
        electricityAmountPaise: number;
        rentPaid: boolean;
        payments: { amountPaise: number }[];
    }>,
): { rentDuePaise: number; electricityDuePaise: number } {
    let rentDuePaise = 0;
    let electricityDuePaise = 0;

    for (const b of bills) {
        if (b.status === 'PAID') continue;

        const paid = b.payments.reduce((s, p) => s + p.amountPaise, 0);

        if (b.status === 'CARRIED_FORWARD') {
            if (b.type === 'RENT_AND_ELECTRICITY' && !b.rentPaid) {
                rentDuePaise += b.rentAmountPaise;
            }
            continue;
        }

        const rentPortion = b.type === 'RENT_AND_ELECTRICITY' ? b.rentAmountPaise : 0;
        const elecPortion = b.electricityAmountPaise;

        if (b.rentPaid) {
            const elecPaid = Math.max(0, paid - rentPortion);
            electricityDuePaise += Math.max(0, elecPortion - elecPaid);
        } else {
            electricityDuePaise += Math.max(0, elecPortion - paid);
            rentDuePaise += rentPortion;
        }
    }

    return { rentDuePaise, electricityDuePaise };
}

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const landlordId = req.user!.id;

    const [occupiedRooms, vacantRooms, bills, recentBills, settings] = await Promise.all([
        prisma.room.count({ where: { landlordId, status: 'OCCUPIED' } }),
        prisma.room.count({ where: { landlordId, status: 'VACANT' } }),
        prisma.bill.findMany({
            where: { landlordId },
            select: {
                status: true,
                type: true,
                totalPaise: true,
                rentAmountPaise: true,
                electricityAmountPaise: true,
                rentPaid: true,
                payments: { select: { amountPaise: true } },
            },
        }),
        prisma.bill.findMany({
            where: { landlordId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                billingMonth: true,
                status: true,
                totalPaise: true,
                isFinal: true,
                occupancy: {
                    select: {
                        room: { select: { roomNumber: true } },
                        tenant: { select: { name: true } },
                    },
                },
            },
        }),
        prisma.settings.findUnique({
            where: { landlordId },
            select: { ratePerUnitPaise: true, meterCapacity: true },
        }),
    ]);

    const { rentDuePaise, electricityDuePaise } = computeDues(bills);

    res.json({
        occupiedRooms,
        vacantRooms,
        totalRooms: occupiedRooms + vacantRooms,
        ratePerUnitPaise: settings?.ratePerUnitPaise ?? 0,
        meterCapacity: settings?.meterCapacity ?? 99999,
        totalRentDuePaise: rentDuePaise,
        totalElectricityDuePaise: electricityDuePaise,
        totalDuePaise: rentDuePaise + electricityDuePaise,
        recentBills: recentBills.map((b) => ({
            id: b.id,
            billingMonth: b.billingMonth,
            status: b.status,
            totalPaise: b.totalPaise,
            isFinal: b.isFinal,
            tenantName: b.occupancy.tenant.name,
            roomNumber: b.occupancy.room.roomNumber,
        })),
    });
});
