import { Router } from 'express';
import { addReading } from '../controllers/reading.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addReadingSchema } from '../validators/reading.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.post('/', validate({ body: addReadingSchema }), addReading);

export default router;
