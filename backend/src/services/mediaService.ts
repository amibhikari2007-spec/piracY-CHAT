import { v2 as cloudinary } from 'cloudinary';
import config from '../config/env';

if (config.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
}

/**
 * Upload encrypted media buffer to Cloudinary.
 * The buffer is already encrypted client-side — stored as raw binary.
 */
export const uploadEncryptedMedia = async (
  buffer: Buffer,
  folder: string = 'e2ee-media',
  resourceType: 'raw' | 'image' | 'video' | 'auto' = 'raw'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Tag encrypted files clearly
        tags: ['encrypted', 'e2ee'],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

export const deleteMedia = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};
