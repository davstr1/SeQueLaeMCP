/**
 * Simple rate limiter implementation using token bucket algorithm
 */

export interface RateLimiterOptions {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  toolSpecificLimits?: Record<string, { maxRequests: number; windowMs: number }>;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private globalRequests: RequestRecord = {
    count: 0,
    resetTime: Date.now() + this.options.windowMs,
  };

  constructor(private options: RateLimiterOptions) {}

  /**
   * Check if a request is allowed and update counters
   * @param identifier - Unique identifier for the requester (e.g., connection ID)
   * @param tool - Optional tool name for tool-specific limits
   * @returns Object with allowed status and retry-after time if rate limited
   */
  checkLimit(identifier: string, tool?: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();

    // Check tool-specific limit if applicable
    if (tool && this.options.toolSpecificLimits?.[tool]) {
      const toolLimit = this.options.toolSpecificLimits[tool];
      const toolKey = `${identifier}:${tool}`;
      const toolRecord = this.getOrCreateRecord(toolKey, now, toolLimit.windowMs);

      if (toolRecord.count >= toolLimit.maxRequests) {
        return {
          allowed: false,
          retryAfter: Math.ceil((toolRecord.resetTime - now) / 1000),
        };
      }
    }

    // Check global limit
    const record = this.getOrCreateRecord(identifier, now, this.options.windowMs);

    if (record.count >= this.options.maxRequests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    // Increment counters
    record.count++;
    if (tool && this.options.toolSpecificLimits?.[tool]) {
      const toolKey = `${identifier}:${tool}`;
      const toolRecord = this.requests.get(toolKey);
      if (toolRecord) {
        toolRecord.count++;
      }
    }

    return { allowed: true };
  }

  /**
   * Get or create a request record
   */
  private getOrCreateRecord(key: string, now: number, windowMs: number): RequestRecord {
    let record = this.requests.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
      this.requests.set(key, record);
    }

    return record;
  }

  /**
   * Clean up expired records to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (record.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get current usage statistics for a requester
   */
  getUsage(identifier: string): {
    global: { used: number; limit: number; resetIn: number };
    tools?: Record<string, { used: number; limit: number; resetIn: number }>;
  } {
    const now = Date.now();
    const globalRecord = this.requests.get(identifier);
    const globalUsed = globalRecord && globalRecord.resetTime > now ? globalRecord.count : 0;
    const globalResetIn = globalRecord
      ? Math.max(0, Math.ceil((globalRecord.resetTime - now) / 1000))
      : 0;

    const result: ReturnType<RateLimiter['getUsage']> = {
      global: {
        used: globalUsed,
        limit: this.options.maxRequests,
        resetIn: globalResetIn,
      },
    };

    // Add tool-specific usage if configured
    if (this.options.toolSpecificLimits) {
      result.tools = {};
      for (const [tool, limits] of Object.entries(this.options.toolSpecificLimits)) {
        const toolKey = `${identifier}:${tool}`;
        const toolRecord = this.requests.get(toolKey);
        const toolUsed = toolRecord && toolRecord.resetTime > now ? toolRecord.count : 0;
        const toolResetIn = toolRecord
          ? Math.max(0, Math.ceil((toolRecord.resetTime - now) / 1000))
          : 0;

        result.tools[tool] = {
          used: toolUsed,
          limit: limits.maxRequests,
          resetIn: toolResetIn,
        };
      }
    }

    return result;
  }
}
