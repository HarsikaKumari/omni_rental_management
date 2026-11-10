import { Router } from 'express';
import { createPayment } from '../controllers/payment.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addPaymentSchema } from '../validators/payment.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.post('/', validate({ body: addPaymentSchema }), createPayment);

export default router;
