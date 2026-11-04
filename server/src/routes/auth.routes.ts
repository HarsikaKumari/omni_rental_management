import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, login, logout, me } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
        res.status(429).json({
            error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
        });
    },
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/password', requireAuth, validate({ body: changePasswordSchema }), changePassword);

export default router;
