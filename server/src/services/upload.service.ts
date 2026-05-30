import { getCloudinary, isCloudinaryConfigured } from "@config/cloudinary";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Upload Service
 * Handles image upload, processing, and storage (Cloudinary or local)
 */
export class UploadService {
  /**
   * Upload a single image
   * @param file - Express Multer file object
   * @param folder - Optional folder name in Cloudinary
   * @returns Image URL
   */
  static async uploadImage(
    file: Express.Multer.File,
    folder: string = "posts",
  ): Promise<string> {
    if (!file) {
      throw ApiError.badRequest("No file provided");
    }

    // Check if Cloudinary is configured
    if (isCloudinaryConfigured()) {
      return await this.uploadToCloudinary(file, folder);
    } else {
      return await this.saveToLocal(file);
    }
  }

  /**
   * Upload multiple images
   * @param files - Array of Express Multer file objects
   * @param folder - Optional folder name in Cloudinary
   * @returns Array of image URLs
   */
  static async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = "posts",
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw ApiError.badRequest("No files provided");
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));

    return await Promise.all(uploadPromises);
  }

  /**
   * Upload image to Cloudinary
   * @param file - Express Multer file object
   * @param folder - Folder name in Cloudinary
   * @returns Cloudinary image URL
   */
  private static async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    try {
      const cloudinary = getCloudinary();
      if (!cloudinary) {
        throw new Error("Cloudinary not configured");
      }

      // Compress image before upload
      const compressedBuffer = await this.compressImage(file.buffer);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `instagram-clone/${folder}`,
            transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        uploadStream.end(compressedBuffer);
      });

      logger.info(
        { publicId: result.public_id, folder },
        "Image uploaded to Cloudinary",
      );

      return result.secure_url;
    } catch (error) {
      logger.error({ error }, "Failed to upload to Cloudinary");
      throw ApiError.internal("Failed to upload image to Cloudinary");
    }
  }

  /**
   * Save image to local storage
   * @param file - Express Multer file object
   * @returns Local image URL
   */
  private static async saveToLocal(file: Express.Multer.File): Promise<string> {
    try {
      // Compress image
      const compressedBuffer = await this.compressImage(file.buffer);

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const filename = `${timestamp}-${random}${ext}`;
      const filepath = path.join(process.cwd(), "uploads", filename);

      // Save compressed image
      fs.writeFileSync(filepath, compressedBuffer);

      const url = `/uploads/${filename}`;
      logger.info({ filename, url }, "Image saved locally");

      return url;
    } catch (error) {
      logger.error({ error }, "Failed to save image locally");
      throw ApiError.internal("Failed to save image");
    }
  }

  /**
   * Compress image using Sharp
   * @param buffer - Image buffer
   * @returns Compressed image buffer
   */
  private static async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      const compressed = await sharp(buffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      return compressed;
    } catch (error) {
      logger.error({ error }, "Failed to compress image");
      // Return original buffer if compression fails
      return buffer;
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param url - Image URL
   */
  static async deleteImage(url: string): Promise<void> {
    if (!url) return;

    // Only delete from Cloudinary if it's a Cloudinary URL
    if (url.includes("cloudinary.com") && isCloudinaryConfigured()) {
      try {
        const cloudinary = getCloudinary();
        if (!cloudinary) return;

        // Extract public ID from URL safely
        const parts = url.split("/");

        // Use .at() for safer array access (returns undefined if index doesn't exist)
        const filename = parts.at(-1);
        const folder = parts.at(-2);

        // Check if we successfully extracted filename and folder
        if (!filename || !folder) {
          logger.warn(
            { url },
            "Could not extract Cloudinary public ID from URL",
          );
          return;
        }

        // Extract public ID without extension using path.parse
        const publicId = path.parse(filename).name;
        const fullPublicId = `instagram-clone/${folder}/${publicId}`;

        await cloudinary.uploader.destroy(fullPublicId);
        logger.info(
          { publicId: fullPublicId },
          "Image deleted from Cloudinary",
        );
      } catch (error) {
        logger.error({ error, url }, "Failed to delete image from Cloudinary");
      }
    } else if (url.startsWith("/uploads/")) {
      // Delete local file
      const filepath = path.join(process.cwd(), url);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info({ filepath }, "Local image deleted");
      }
    }
  }

  /**
   * Upload profile picture
   * @param file - Express Multer file object
   * @returns Profile picture URL
   */
  static async uploadProfilePicture(
    file: Express.Multer.File,
  ): Promise<string> {
    return await this.uploadImage(file, "profiles");
  }

  /**
   * Upload story image
   * @param file - Express Multer file object
   * @returns Story image URL
   */
  static async uploadStory(file: Express.Multer.File): Promise<string> {
    return await this.uploadImage(file, "stories");
  }
}
