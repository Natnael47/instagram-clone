import { getCloudinary, isCloudinaryConfigured } from "@config/cloudinary";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export class UploadService {
  static async uploadImage(
    file: Express.Multer.File,
    folder: string = "posts",
  ): Promise<string> {
    if (!file) {
      throw ApiError.badRequest("No file provided");
    }

    if (isCloudinaryConfigured()) {
      return await this.uploadToCloudinary(file, folder);
    } else {
      return await this.saveToLocal(file);
    }
  }

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
   * Get file buffer regardless of storage type (memory or disk)
   */
  private static getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer) {
      return file.buffer;
    }

    if (file.path) {
      return fs.readFileSync(file.path);
    }

    throw new Error("No file data available");
  }

  private static async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    try {
      const cloudinary = getCloudinary();
      if (!cloudinary) {
        throw new Error("Cloudinary not configured");
      }

      const fileBuffer = this.getFileBuffer(file);

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("No file data available");
      }

      const compressedBuffer = await this.compressImage(fileBuffer);

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

  private static async saveToLocal(file: Express.Multer.File): Promise<string> {
    try {
      // File is already saved to disk by Multer, just return the URL
      const filename = file.filename || path.basename(file.path);
      const url = `/uploads/${filename}`;
      logger.info({ filename, url }, "Image saved locally");
      return url;
    } catch (error) {
      logger.error({ error }, "Failed to save image locally");
      throw ApiError.internal("Failed to save image");
    }
  }

  private static async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      if (!buffer || buffer.length === 0) {
        logger.warn("Empty buffer received, returning original");
        return buffer;
      }

      const compressed = await sharp(buffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      return compressed;
    } catch (error) {
      logger.error(
        { error },
        "Failed to compress image, using original buffer",
      );
      return buffer;
    }
  }

  static async deleteImage(url: string): Promise<void> {
    if (!url) return;

    if (url.includes("cloudinary.com") && isCloudinaryConfigured()) {
      try {
        const cloudinary = getCloudinary();
        if (!cloudinary) return;

        const parts = url.split("/");
        const filename = parts.at(-1);
        const folder = parts.at(-2);

        if (!filename || !folder) {
          logger.warn(
            { url },
            "Could not extract Cloudinary public ID from URL",
          );
          return;
        }

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
      const filepath = path.join(process.cwd(), url);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info({ filepath }, "Local image deleted");
      }
    }
  }

  static async uploadProfilePicture(
    file: Express.Multer.File,
  ): Promise<string> {
    return await this.uploadImage(file, "profiles");
  }

  static async uploadStory(file: Express.Multer.File): Promise<string> {
    return await this.uploadImage(file, "stories");
  }
}
