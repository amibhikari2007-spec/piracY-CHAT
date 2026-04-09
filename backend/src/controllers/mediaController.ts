import { Response } from 'express';
import multer from 'multer';
import { uploadEncryptedMedia } from '../services/mediaService';
import { AuthRequest } from '../middleware/auth';

// Store in memory for processing
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'application/pdf',
      'application/octet-stream', // encrypted blobs
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * Upload an already-encrypted media file.
 * Client encrypts file with AES-256 before upload.
 * We store the encrypted blob without being able to read it.
 */
export const uploadMedia = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const { originalname, mimetype, buffer, size } = req.file;

    const result = await uploadEncryptedMedia(buffer, 'e2ee-media', 'raw');

    res.json({
      success: true,
      data: {
        url: result.url,
        fileName: originalname,
        mimeType: mimetype,
        fileSize: size,
      },
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};
