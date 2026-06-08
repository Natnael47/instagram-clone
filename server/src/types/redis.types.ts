// src/types/redis.types.ts

/**
 * Redis connection states
 */
export enum RedisConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  enabled: boolean;
  url: string;
  password?: string;
  db: number;
  retryIntervalMinutes: number;
  maxRetriesPerAttempt: number;
  connectTimeoutMs: number;
}

/**
 * Redis health status
 */
export interface RedisHealthStatus {
  state: RedisConnectionState;
  isConnected: boolean;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  lastReconnectAttempt: Date | null;
  totalReconnectAttempts: number;
  successfulReconnects: number;
  failedReconnects: number;
  uptimeSeconds: number;
}

/**
 * Redis cache options
 */
export interface RedisCacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * Redis pub/sub message
 */
export interface RedisMessage {
  channel: string;
  message: string;
  timestamp: Date;
}
