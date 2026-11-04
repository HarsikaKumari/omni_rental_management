import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { AUTH_COOKIE_NAME, verifyToken } from '../utils/jwt';

// Augment Express.Request with our authed user shape.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        name: string;
        email: string;
        status: 'ACTIVE' | 'SUSPENDED';
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (!token) throw ApiError.unauthorized('Not signed in');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Session expired or invalid');
    }

    // Re-check user on every request: catches deleted or suspended users.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, name: true, email: true, status: true },
    });

    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account suspended');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}
