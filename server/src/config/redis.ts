import { logger } from "@utils/logger";

export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const isRedisConfigured = (): boolean => {
  return !!process.env.REDIS_HOST && !!process.env.REDIS_PORT;
};

export const getRedisAdapter = async (): Promise<null> => {
  if (!isRedisConfigured()) {
    logger.warn("Redis not configured, using default in-memory adapter");
    return null;
  }

  logger.warn(
    "Redis is configured but redis packages are not installed. Install 'redis' and '@socket.io/redis-adapter' for production scaling.",
  );
  return null;
};
