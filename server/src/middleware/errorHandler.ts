import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message, details: err.details },
        });
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Invalid request', details: err.flatten() },
        });
    }

    // Log the message only — never log request bodies (may contain ID numbers, passwords).
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err instanceof Error ? err.message : err);

    res.status(500).json({
        error: {
            code: 'INTERNAL',
            message: 'Internal server error',
            ...(env.NODE_ENV !== 'production' && err instanceof Error
                ? { details: { message: err.message, stack: err.stack } }
                : {}),
        },
    });
}
