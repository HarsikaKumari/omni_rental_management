import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'rrm_token';

export interface JwtPayload {
  userId: string;
  role: Role;
}

const signOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const { userId, role } = decoded as Partial<JwtPayload>;
  if (!userId || (role !== 'ADMIN' && role !== 'LANDLORD')) {
    throw new Error('Invalid token payload');
  }
  return { userId, role };
}

/**
 * Cookie settings must stay in sync with JWT_EXPIRES_IN (default 1d).
 * - Dev (http://localhost): sameSite=lax, secure=false
 * - Prod (https, cross-site frontend↔backend): sameSite=none, secure=true
 *   (the app sets `trust proxy` so Express sees the request as https on Render)
 */
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};
