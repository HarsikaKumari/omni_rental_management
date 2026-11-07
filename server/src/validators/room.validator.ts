import { z } from 'zod';

export const createRoomSchema = z.object({
  roomNumber: z
    .string()
    .trim()
    .min(1, 'Room number is required')
    .max(20, 'Room number is too long'),
});

export const updateRoomSchema = z
  .object({
    roomNumber: z.string().trim().min(1).max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  });

export const roomIdParamSchema = z.object({
  id: z.string().min(1),
});
