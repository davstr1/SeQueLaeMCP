import { Pool, PoolConfig, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export interface PoolManagerConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

/**
 * Manages a singleton connection pool for the application
 */
export class PoolManager {
  private static instance: PoolManager;
  private pool: Pool | null = null;
  private config: PoolManagerConfig | null = null;

  private constructor() {}

  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  /**
   * Initialize the pool with configuration
   */
  initialize(config: PoolManagerConfig): void {
    // If pool exists with different config, close it
    if (this.pool && this.config?.connectionString !== config.connectionString) {
      this.close();
    }

    // If pool already exists with same config, reuse it
    if (this.pool && this.config?.connectionString === config.connectionString) {
      return;
    }

    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: config.maxConnections || parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis:
        config.idleTimeoutMillis || parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '10000'),
      connectionTimeoutMillis:
        config.connectionTimeoutMillis ||
        parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '30000'),
      statement_timeout:
        config.statementTimeout || parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT || '120000'),
    };

    this.pool = new Pool(poolConfig);
    this.config = config;

    // Handle pool errors
    this.pool.on('error', err => {
      logger.error('Unexpected error on idle client', { error: err });
    });
  }

  /**
   * Get the current pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Get a client with retry logic
   */
  async getClient(maxRetries = 3, initialDelay = 1000): Promise<PoolClient> {
    const pool = this.getPool();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await pool.connect();
      } catch (error) {
        logger.warn(`Failed to get client (attempt ${attempt + 1}/${maxRetries})`, { error });

        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Simple exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to get client after all retries');
  }

  /**
   * Check if pool is initialized
   */
  isInitialized(): boolean {
    return this.pool !== null;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Get pool status information
   */
  getStatus(): {
    initialized: boolean;
    total: number;
    idle: number;
    waiting: number;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  } {
    const stats = this.getStats();
    return {
      initialized: this.isInitialized(),
      ...stats,
      maxConnections: this.config?.maxConnections || 10,
      idleTimeout: this.config?.idleTimeoutMillis || 10000,
      connectionTimeout: this.config?.connectionTimeoutMillis || 0,
    };
  }

  /**
   * Close the pool and cleanup
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.config = null;
    }
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static reset(): void {
    if (PoolManager.instance) {
      PoolManager.instance.close();
      PoolManager.instance = new PoolManager();
    }
  }
}
