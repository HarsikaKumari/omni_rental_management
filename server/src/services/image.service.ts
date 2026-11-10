import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export interface UploadedPhoto {
    url: string;
    publicId: string;
}

/**
 * Upload a tenant photo to Cloudinary into landlords/<landlordId>/tenants.
 * Throws on validation/upload failure — callers handle best-effort.
 * Returns the authenticated `secure_url` (unusable without signing) and publicId.
 * Signed URLs are generated at read time via getSignedPhotoUrl().
 */
export async function uploadTenantPhoto(
    buffer: Buffer,
    landlordId: string,
    mimetype: string,
): Promise<UploadedPhoto> {
    if (!isCloudinaryConfigured) throw new Error('Cloudinary is not configured');
    if (!ALLOWED.has(mimetype)) throw new Error('Only jpeg, png, or webp images are allowed');
    if (buffer.byteLength > MAX_BYTES) throw new Error('Image exceeds 2 MB');

    return new Promise<UploadedPhoto>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `landlords/${landlordId}/tenants`,
                type: 'authenticated',
                resource_type: 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            },
            (err, result) => {
                if (err || !result) return reject(err ?? new Error('Upload failed'));
                resolve({ url: result.secure_url, publicId: result.public_id });
            },
        );
        stream.end(buffer);
    });
}

/** Best-effort delete; never throws. Used for cleanup and replacement. */
export async function deletePhoto(publicId: string): Promise<void> {
    if (!isCloudinaryConfigured) return;
    try {
        await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image' });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[cloudinary] delete failed:', err instanceof Error ? err.message : err);
    }
}

/**
 * Generate a short-lived signed URL for a stored publicId. The DB stores
 * the publicId as source of truth; this is what the API returns to the client.
 */
export function getSignedPhotoUrl(publicId: string | null): string | null {
    if (!publicId || !isCloudinaryConfigured) return null;
    return cloudinary.url(publicId, {
        type: 'authenticated',
        resource_type: 'image',
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    });
}
