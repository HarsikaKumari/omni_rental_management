import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('Only jpeg, png, or webp images are allowed'));
        }
        cb(null, true);
    },
});

/**
 * Wraps multer's .single() so its errors become ApiError, which the central
 * error handler already turns into clean JSON.
 */
export function singleImage(fieldName: string) {
    const middleware = upload.single(fieldName);
    return (req: Request, res: Response, next: NextFunction) => {
        middleware(req, res, (err) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(ApiError.badRequest('Image exceeds 2 MB'));
                }
                return next(ApiError.badRequest(err.message));
            }
            return next(ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed'));
        });
    };
}
