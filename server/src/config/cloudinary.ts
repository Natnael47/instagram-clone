import { env } from "@config/env";
import { logger } from "@utils/logger";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary configuration
 * Used for image uploads and storage
 */
export const configureCloudinary = (): void => {
  // Check if Cloudinary credentials are provided
  const hasCloudinaryConfig =
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET;

  if (!hasCloudinaryConfig) {
    logger.warn(
      "Cloudinary credentials not provided. Image upload will fallback to local storage.",
    );
    return;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  logger.info("Cloudinary configured successfully");
};

/**
 * Check if Cloudinary is configured
 * @returns Boolean indicating if Cloudinary is ready to use
 */
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

/**
 * Get Cloudinary instance
 * @returns Cloudinary instance or null if not configured
 */
export const getCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    return null;
  }
  return cloudinary;
};

// Default export for convenience
export default cloudinary;
