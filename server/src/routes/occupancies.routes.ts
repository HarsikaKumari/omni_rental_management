import { Router } from 'express';
import {
    moveOutController,
    shiftRoomController,
} from '../controllers/occupancy.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    moveOutSchema,
    occupancyIdParamSchema,
    shiftRoomSchema,
} from '../validators/occupancy.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.post(
    '/:id/shift',
    validate({ params: occupancyIdParamSchema, body: shiftRoomSchema }),
    shiftRoomController,
);
router.post(
    '/:id/move-out',
    validate({ params: occupancyIdParamSchema, body: moveOutSchema }),
    moveOutController,
);

export default router;
