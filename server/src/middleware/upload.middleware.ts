import { asyncHandler } from "@middleware/asyncHandler";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-randomNumber-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.",
      ),
    );
  }
};

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware for single file upload
 * @param fieldName - Name of the form field containing the file
 */
export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

/**
 * Middleware for multiple file upload
 * @param fieldName - Name of the form field containing the files
 * @param maxCount - Maximum number of files to upload
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware for multiple file fields upload
 * @param fields - Array of field configurations
 */
export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
  return upload.fields(fields);
};

/**
 * Handle file upload errors
 * Wraps upload middleware to catch multer errors
 */
export const handleUpload = (uploadMiddleware: any) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      uploadMiddleware(req, res, (err: any) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            // Multer error codes - using string comparison instead of enum
            if (err.code === "LIMIT_FILE_SIZE") {
              throw ApiError.badRequest("File too large. Maximum size is 5MB.");
            }
            if (err.code === "LIMIT_UNEXPECTED_FILE") {
              throw ApiError.badRequest(`Unexpected field: ${err.field}`);
            }
            if (err.code === "LIMIT_FILE_COUNT") {
              throw ApiError.badRequest("Too many files uploaded.");
            }
            throw ApiError.badRequest(`Upload error: ${err.message}`);
          }
          throw ApiError.badRequest(err.message);
        }
        next();
      });
    },
  );
};

/**
 * Get file URL
 * Returns local URL or Cloudinary URL based on configuration
 * @param filename - Name of the file
 * @returns File URL
 */
export const getFileUrl = (filename: string): string => {
  // For local development, return local URL
  // In production with Cloudinary, this would be the Cloudinary URL
  return `/uploads/${filename}`;
};

/**
 * Delete file from local storage
 * @param filepath - Path to the file
 */
export const deleteLocalFile = (filepath: string): void => {
  try {
    const fullPath = path.join(process.cwd(), filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info({ filepath }, "File deleted from local storage");
    }
  } catch (error) {
    logger.error({ error, filepath }, "Failed to delete file");
  }
};

/**
 * Cleanup uploaded files on error
 * Middleware to remove uploaded files if subsequent processing fails
 */
export const cleanupOnError = () => {
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    // Delete uploaded file if exists
    if (req.file) {
      const filepath = path.join(process.cwd(), req.file.path);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(
          { filepath: req.file.path },
          "Cleaned up uploaded file after error",
        );
      }
    }

    // Delete multiple files if they exist
    if (req.files) {
      const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();
      files.forEach((file: Express.Multer.File) => {
        if (file && file.path) {
          const filepath = path.join(process.cwd(), file.path);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      });
    }

    next(err);
  };
};

// Export multer for direct use if needed
export { upload };
