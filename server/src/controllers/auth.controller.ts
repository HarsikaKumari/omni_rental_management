import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { AUTH_COOKIE_NAME, cookieOptions, signToken } from '../utils/jwt';

// ⚠️ If you switched to bcryptjs on Windows, change the import above to:
//    import bcrypt from 'bcryptjs';

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return the same message for "no user" and "bad password" — no user enumeration.
    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is suspended');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    const token = signToken({ userId: user.id, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);

    res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        },
    });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
    // requireAuth already populated req.user from the DB.
    res.json({ user: req.user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
    };

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.unauthorized();

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ ok: true });
});
