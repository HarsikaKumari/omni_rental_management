import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

const configured =
  env.CLOUDINARY_CLOUD_NAME.trim() !== '' &&
  env.CLOUDINARY_API_KEY.trim() !== '' &&
  env.CLOUDINARY_API_SECRET.trim() !== '';

if (configured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const isCloudinaryConfigured = configured;
export { cloudinary };