import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import settingsRoutes from './settings.routes';
import roomsRoutes from './rooms.routes';
import tenantsRoutes from './tenants.routes';
import occupanciesRoutes from './occupancies.routes';
import readingsRoutes from './readings.routes';
import billsRoutes from './bills.routes';
import paymentsRoutes from './payments.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/rooms', roomsRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/occupancies', occupanciesRoutes);
router.use('/readings', readingsRoutes);
router.use('/bills', billsRoutes);
router.use('/payments', paymentsRoutes);

export default router;
