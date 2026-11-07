import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Settings are created when a landlord account is created (Phase 3), so this
 * should always return a row. We fall back to a safe default instead of 404
 * so the client never crashes if a settings row is missing for any reason.
 */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const settings = await prisma.settings.findUnique({
    where: { landlordId },
    select: { ratePerUnitPaise: true, updatedAt: true },
  });

  res.json({
    settings: settings ?? { ratePerUnitPaise: 0, updatedAt: null },
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { ratePerUnitPaise } = req.body as { ratePerUnitPaise: number };

  // Upsert defends against the (rare) case where the settings row was missing.
  const settings = await prisma.settings.upsert({
    where: { landlordId },
    create: { landlordId, ratePerUnitPaise },
    update: { ratePerUnitPaise },
    select: { ratePerUnitPaise: true, updatedAt: true },
  });

  res.json({ settings });
});
