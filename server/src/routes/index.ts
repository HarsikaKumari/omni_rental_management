import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import settingsRoutes from './settings.routes';
import roomsRoutes from './rooms.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/rooms', roomsRoutes);

export default router;
