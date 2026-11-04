import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap async controllers so thrown errors/rejected promises reach the
 * central error handler. Without this, Express 4 swallows rejections.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };