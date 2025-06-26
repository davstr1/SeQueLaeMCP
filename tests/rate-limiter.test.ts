import { RateLimiter } from '../src/utils/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic rate limiting', () => {
    beforeEach(() => {
      limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
    });

    test('should allow requests under limit', () => {
      const identifier = 'test-user';

      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeUndefined();
      }
    });

    test('should block requests over limit', () => {
      const identifier = 'test-user';

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(identifier);
      }

      // Next request should be blocked
      const result = limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60); // 60 seconds
    });

    test('should reset after window expires', () => {
      const identifier = 'test-user';

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(identifier);
      }

      // Should be blocked
      expect(limiter.checkLimit(identifier).allowed).toBe(false);

      // Advance time past the window
      jest.advanceTimersByTime(61000);

      // Should be allowed again
      expect(limiter.checkLimit(identifier).allowed).toBe(true);
    });

    test('should track different identifiers separately', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // Use up all requests for user1
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(user1);
      }

      // user1 should be blocked
      expect(limiter.checkLimit(user1).allowed).toBe(false);

      // user2 should still be allowed
      expect(limiter.checkLimit(user2).allowed).toBe(true);
    });
  });

  describe('Tool-specific limits', () => {
    beforeEach(() => {
      limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        toolSpecificLimits: {
          sql_exec: { maxRequests: 3, windowMs: 30000 },
          sql_backup: { maxRequests: 1, windowMs: 300000 }, // 5 minutes
        },
      });
    });

    test('should enforce tool-specific limits', () => {
      const identifier = 'test-user';

      // sql_exec should allow 3 requests
      for (let i = 0; i < 3; i++) {
        const result = limiter.checkLimit(identifier, 'sql_exec');
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = limiter.checkLimit(identifier, 'sql_exec');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(30); // 30 seconds

      // Other tools should still work
      expect(limiter.checkLimit(identifier, 'sql_schema').allowed).toBe(true);
    });

    test('should enforce both global and tool limits', () => {
      const identifier = 'test-user';

      // Use the one allowed backup
      expect(limiter.checkLimit(identifier, 'sql_backup').allowed).toBe(true);
      expect(limiter.checkLimit(identifier, 'sql_backup').allowed).toBe(false);

      // Use remaining global requests with other tools
      for (let i = 0; i < 9; i++) {
        expect(limiter.checkLimit(identifier, 'sql_schema').allowed).toBe(true);
      }

      // Global limit should now be reached
      expect(limiter.checkLimit(identifier, 'sql_schema').allowed).toBe(false);
    });
  });

  describe('Usage statistics', () => {
    beforeEach(() => {
      limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        toolSpecificLimits: {
          sql_exec: { maxRequests: 2, windowMs: 30000 },
        },
      });
    });

    test('should report usage statistics', () => {
      const identifier = 'test-user';

      // Make some requests
      limiter.checkLimit(identifier);
      limiter.checkLimit(identifier, 'sql_exec');

      const usage = limiter.getUsage(identifier);

      expect(usage.global).toEqual({
        used: 2,
        limit: 5,
        resetIn: 60,
      });

      expect(usage.tools?.sql_exec).toEqual({
        used: 1,
        limit: 2,
        resetIn: 30,
      });
    });

    test('should show zero usage for expired records', () => {
      const identifier = 'test-user';

      // Make a request
      limiter.checkLimit(identifier);

      // Advance past window
      jest.advanceTimersByTime(61000);

      const usage = limiter.getUsage(identifier);
      expect(usage.global.used).toBe(0);
    });
  });

  describe('Cleanup', () => {
    test('should remove expired records', () => {
      limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      // Create records for multiple users
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');

      // Advance time past window
      jest.advanceTimersByTime(61000);

      // Create new record
      limiter.checkLimit('user3');

      // Run cleanup
      limiter.cleanup();

      // Old records should be gone, new one should remain
      const usage1 = limiter.getUsage('user1');
      const usage3 = limiter.getUsage('user3');

      expect(usage1.global.used).toBe(0); // Expired record
      expect(usage3.global.used).toBe(1); // Active record
    });
  });
});
