import { Router } from 'express';
import {
    createTenant,
    deleteTenantPhoto,
    getTenant,
    listCurrentTenants,
    listPreviousTenants,
    updateTenant,
    updateTenantPhoto,
} from '../controllers/tenant.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { singleImage } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
    createTenantSchema,
    tenantIdParamSchema,
    updateTenantSchema,
} from '../validators/tenant.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

// Order matters: /current and /previous before /:id.
router.get('/current', listCurrentTenants);
router.get('/previous', listPreviousTenants);

// Multipart form-data: photo is optional; scalars are validated after multer.
router.post(
    '/',
    singleImage('photo'),
    validate({ body: createTenantSchema }),
    createTenant,
);

router.get('/:id', validate({ params: tenantIdParamSchema }), getTenant);
router.patch(
    '/:id',
    validate({ params: tenantIdParamSchema, body: updateTenantSchema }),
    updateTenant,
);

router.put(
    '/:id/photo',
    validate({ params: tenantIdParamSchema }),
    singleImage('photo'),
    updateTenantPhoto,
);
router.delete('/:id/photo', validate({ params: tenantIdParamSchema }), deleteTenantPhoto);

export default router;
