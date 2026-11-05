import { Router } from 'express';
import {
    createLandlord,
    deleteLandlord,
    getLandlord,
    getStats,
    listLandlords,
    updateLandlord,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    createLandlordSchema,
    landlordIdParamSchema,
    listLandlordsQuerySchema,
    updateLandlordSchema,
} from '../validators/admin.validator';

const router = Router();

// Every admin route requires an authenticated ADMIN. Role is enforced here,
// not in the controller — controllers stay focused on the action.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', getStats);

router.get('/landlords', validate({ query: listLandlordsQuerySchema }), listLandlords);
router.post('/landlords', validate({ body: createLandlordSchema }), createLandlord);

router.get('/landlords/:id', validate({ params: landlordIdParamSchema }), getLandlord);
router.patch(
    '/landlords/:id',
    validate({ params: landlordIdParamSchema, body: updateLandlordSchema }),
    updateLandlord,
);
router.delete('/landlords/:id', validate({ params: landlordIdParamSchema }), deleteLandlord);

export default router;
