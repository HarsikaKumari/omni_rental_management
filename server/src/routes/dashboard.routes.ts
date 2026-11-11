import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.get('/', getDashboard);

export default router;
