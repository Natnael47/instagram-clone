// src/utils/redisStateManager.ts
import { RedisConnectionState, type RedisHealthStatus } from '../types/redis.types';
import { logger } from './logger';

/**
 * Singleton state manager for Redis connection
 * Tracks connection state and health metrics
 */
export class RedisStateManager {
  private static instance: RedisStateManager;
  
  private state: RedisConnectionState = RedisConnectionState.DISCONNECTED;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectedAt: Date | null = null;
  private lastReconnectAttempt: Date | null = null;
  private totalReconnectAttempts: number = 0;
  private successfulReconnects: number = 0;
  private failedReconnects: number = 0;
  private connectedSince: Date | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RedisStateManager {
    if (!RedisStateManager.instance) {
      RedisStateManager.instance = new RedisStateManager();
    }
    return RedisStateManager.instance;
  }

  /**
   * Get current connection state
   */
  getState(): RedisConnectionState {
    return this.state;
  }

  /**
   * Check if Redis is currently connected
   */
  isConnected(): boolean {
    return this.state === RedisConnectionState.CONNECTED;
  }

  /**
   * Set state to connecting
   */
  setConnecting(): void {
    this.state = RedisConnectionState.CONNECTING;
    logger.debug('Redis state: CONNECTING');
  }

  /**
   * Set state to connected
   */
  setConnected(): void {
    const wasDisconnected = this.state !== RedisConnectionState.CONNECTED;
    this.state = RedisConnectionState.CONNECTED;
    this.lastConnectedAt = new Date();
    this.connectedSince = this.connectedSince || new Date();
    this.successfulReconnects++;
    
    if (wasDisconnected) {
      logger.info('Redis state: CONNECTED ✓');
    }
  }

  /**
   * Set state to reconnecting
   */
  setReconnecting(): void {
    this.state = RedisConnectionState.RECONNECTING;
    this.lastReconnectAttempt = new Date();
    this.totalReconnectAttempts++;
    logger.info('Redis state: RECONNECTING');
  }

  /**
   * Set state to disconnected
   */
  setDisconnected(): void {
    const wasConnected = this.state === RedisConnectionState.CONNECTED;
    this.state = RedisConnectionState.DISCONNECTED;
    this.lastDisconnectedAt = new Date();
    this.connectedSince = null;
    
    if (wasConnected) {
      logger.warn('Redis state: DISCONNECTED');
    }
  }

  /**
   * Set state to error
   */
  setError(): void {
    this.state = RedisConnectionState.ERROR;
    this.lastDisconnectedAt = new Date();
    this.connectedSince = null;
    this.failedReconnects++;
    logger.error('Redis state: ERROR');
  }

  /**
   * Record failed reconnection attempt
   */
  recordFailedAttempt(): void {
    this.failedReconnects++;
    this.lastReconnectAttempt = new Date();
  }

  /**
   * Get complete health status
   */
  getHealthStatus(): RedisHealthStatus {
    return {
      state: this.state,
      isConnected: this.isConnected(),
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastReconnectAttempt: this.lastReconnectAttempt,
      totalReconnectAttempts: this.totalReconnectAttempts,
      successfulReconnects: this.successfulReconnects,
      failedReconnects: this.failedReconnects,
      uptimeSeconds: this.connectedSince
        ? Math.floor((Date.now() - this.connectedSince.getTime()) / 1000)
        : 0,
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.state = RedisConnectionState.DISCONNECTED;
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.lastReconnectAttempt = null;
    this.totalReconnectAttempts = 0;
    this.successfulReconnects = 0;
    this.failedReconnects = 0;
    this.connectedSince = null;
  }
}