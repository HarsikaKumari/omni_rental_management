import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const settings = await prisma.settings.findUnique({
    where: { landlordId },
    select: { ratePerUnitPaise: true, meterCapacity: true, updatedAt: true },
  });

  res.json({
    settings: settings ?? {
      ratePerUnitPaise: 0,
      meterCapacity: 99999,
      updatedAt: null,
    },
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const body = req.body as { ratePerUnitPaise?: number; meterCapacity?: number };

  const settings = await prisma.settings.upsert({
    where: { landlordId },
    create: {
      landlordId,
      ratePerUnitPaise: body.ratePerUnitPaise ?? 0,
      meterCapacity: body.meterCapacity ?? 99999,
    },
    update: {
      ...(body.ratePerUnitPaise !== undefined
        ? { ratePerUnitPaise: body.ratePerUnitPaise }
        : {}),
      ...(body.meterCapacity !== undefined ? { meterCapacity: body.meterCapacity } : {}),
    },
    select: { ratePerUnitPaise: true, meterCapacity: true, updatedAt: true },
  });

  res.json({ settings });
});
