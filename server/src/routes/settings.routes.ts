import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateSettingsSchema } from '../validators/settings.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.get('/', getSettings);
router.put('/', validate({ body: updateSettingsSchema }), updateSettings);

export default router;
