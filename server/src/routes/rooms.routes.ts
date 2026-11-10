import { Router } from 'express';
import {
  createRoom,
  getRoom,
  listRooms,
  updateRoom,
} from '../controllers/room.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createRoomSchema,
  roomIdParamSchema,
  updateRoomSchema,
} from '../validators/room.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.get('/', listRooms);
router.post('/', validate({ body: createRoomSchema }), createRoom);
router.get('/:id', validate({ params: roomIdParamSchema }), getRoom);
router.patch(
  '/:id',
  validate({ params: roomIdParamSchema, body: updateRoomSchema }),
  updateRoom,
);

export default router;
