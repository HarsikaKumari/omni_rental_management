import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

interface Schemas {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}

/**
 * Parses and *replaces* req.body / req.params / req.query with the
 * zod-parsed values. That means downstream handlers get typed, safe data.
 */
export function validate(schemas: Schemas) {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schemas.body) req.body = schemas.body.parse(req.body);
            if (schemas.params) req.params = schemas.params.parse(req.params);
            if (schemas.query) req.query = schemas.query.parse(req.query) as never;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return next(ApiError.badRequest('Invalid request', err.flatten()));
            }
            next(err);
        }
    };
}
