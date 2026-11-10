import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getSignedPhotoUrl } from '../services/image.service';

const roomListSelect = {
  id: true,
  roomNumber: true,
  status: true,
  createdAt: true,
} as const;

// Tenant safe fields only. idNumber is NOT included in this view.
const occupancySummarySelect = {
  id: true,
  startDate: true,
  endDate: true,
  monthlyRentPaise: true,
  tenant: {
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      photoPublicId: true,
    },
  },
} as const;

function presentOccupancy<T extends { tenant: { photoPublicId: string | null } }>(o: T) {
  const { tenant, ...rest } = o;
  const { photoPublicId, ...tenantRest } = tenant;
  return { ...rest, tenant: { ...tenantRest, photoUrl: getSignedPhotoUrl(photoPublicId) } };
}

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const rooms = await prisma.room.findMany({
    where: { landlordId },
    orderBy: { roomNumber: 'asc' },
    select: roomListSelect,
  });
  res.json({ rooms });
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { id } = req.params as { id: string };

  const room = await prisma.room.findFirst({
    where: { id, landlordId },
    select: roomListSelect,
  });
  if (!room) throw ApiError.notFound('Room not found');

  const occupancies = await prisma.occupancy.findMany({
    where: { roomId: id, landlordId },
    orderBy: { startDate: 'desc' },
    take: 50,
    select: occupancySummarySelect,
  });

  const current = occupancies.find((o) => o.endDate === null) ?? null;
  const history = occupancies.filter((o) => o.endDate !== null);

  res.json({
    room: {
      ...room,
      current: current ? presentOccupancy(current) : null,
      history: history.map(presentOccupancy),
    },
  });
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { roomNumber } = req.body as { roomNumber: string };

  const existing = await prisma.room.findFirst({
    where: { landlordId, roomNumber },
    select: { id: true },
  });
  if (existing) throw ApiError.conflict(`Room ${roomNumber} already exists`);

  const room = await prisma.room.create({
    data: { landlordId, roomNumber, status: 'VACANT' },
    select: roomListSelect,
  });
  res.status(201).json({ room });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { id } = req.params as { id: string };
  const { roomNumber } = req.body as { roomNumber?: string };

  const target = await prisma.room.findFirst({
    where: { id, landlordId },
    select: { id: true },
  });
  if (!target) throw ApiError.notFound('Room not found');

  if (roomNumber) {
    const clash = await prisma.room.findFirst({
      where: { landlordId, roomNumber, NOT: { id } },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict(`Room ${roomNumber} already exists`);
  }

  const room = await prisma.room.update({
    where: { id },
    data: { roomNumber },
    select: roomListSelect,
  });
  res.json({ room });
});
