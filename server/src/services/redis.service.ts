// src/services/redis.service.ts
import { getRedisClient, isRedisAvailable } from "@config/redis";
import { logger } from "@utils/logger";
import type { RedisCacheOptions } from "../types/redis.types";

/**
 * Redis service with automatic fallbacks
 * All methods work without Redis (graceful degradation)
 */
export class RedisService {
  /**
   * Get a cached value
   * Returns null if not found or Redis unavailable
   */
  static async get(key: string): Promise<string | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const client = getRedisClient();
      if (!client) return null;

      const value = await client.get(key);
      return value;
    } catch (error) {
      logger.error({ err: error, key }, "Redis get error");
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL
   */
  static async set(
    key: string,
    value: string,
    options?: RedisCacheOptions,
  ): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      const finalKey = options?.prefix ? `${options.prefix}:${key}` : key;

      if (options?.ttl) {
        await client.setex(finalKey, options.ttl, value);
      } else {
        await client.set(finalKey, value);
      }

      return true;
    } catch (error) {
      logger.error({ err: error, key }, "Redis set error");
      return false;
    }
  }

  /**
   * Delete a cached value
   */
  static async del(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, "Redis del error");
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  static async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ err: error, key }, "Redis exists error");
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      await client.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, "Redis expire error");
      return false;
    }
  }

  /**
   * Increment a counter
   */
  static async incr(key: string): Promise<number | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const client = getRedisClient();
      if (!client) return null;

      const result = await client.incr(key);
      return result;
    } catch (error) {
      logger.error({ err: error, key }, "Redis incr error");
      return null;
    }
  }

  /**
   * Get time-to-live of a key in seconds
   */
  static async ttl(key: string): Promise<number | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const client = getRedisClient();
      if (!client) return null;

      const result = await client.ttl(key);
      return result;
    } catch (error) {
      logger.error({ err: error, key }, "Redis ttl error");
      return null;
    }
  }

  /**
   * Add member to a set
   */
  static async sadd(key: string, member: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      await client.sadd(key, member);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, "Redis sadd error");
      return false;
    }
  }

  /**
   * Check if member exists in set
   */
  static async sismember(key: string, member: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      const result = await client.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error({ err: error, key }, "Redis sismember error");
      return false;
    }
  }

  /**
   * Remove member from set
   */
  static async srem(key: string, member: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      await client.srem(key, member);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, "Redis srem error");
      return false;
    }
  }

  /**
   * Publish a message to a channel
   */
  static async publish(channel: string, message: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      if (!client) return false;

      await client.publish(channel, message);
      return true;
    } catch (error) {
      logger.error({ err: error, channel }, "Redis publish error");
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  static async mget(keys: string[]): Promise<(string | null)[]> {
    if (!isRedisAvailable() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const client = getRedisClient();
      if (!client) return keys.map(() => null);

      const values = await client.mget(...keys);
      return values;
    } catch (error) {
      logger.error({ err: error }, "Redis mget error");
      return keys.map(() => null);
    }
  }

  /**
   * Clear all keys with a prefix
   */
  static async clearByPrefix(prefix: string): Promise<number> {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      if (!client) return 0;

      const keys = await client.keys(`${prefix}:*`);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await client.del(...keys);
      return deleted;
    } catch (error) {
      logger.error({ err: error, prefix }, "Redis clearByPrefix error");
      return 0;
    }
  }
}
