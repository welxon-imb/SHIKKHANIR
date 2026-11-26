export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

interface AttemptEntry {
  failures: number[];
  lockedUntil: number;
}

export class LoginAttemptLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;
  private readonly entries = new Map<string, AttemptEntry>();

  constructor(config: RateLimitConfig) {
    this.maxAttempts = config.maxAttempts;
    this.windowMs = config.windowMs;
    this.lockoutMs = config.lockoutMs;
  }

  private prune(entry: AttemptEntry, now: number): void {
    const cutoff = now - this.windowMs;
    entry.failures = entry.failures.filter((ts) => ts > cutoff);
    if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
      entry.lockedUntil = 0;
    }
  }

  check(
    key: string,
    now = Date.now()
  ): { allowed: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const entry = this.entries.get(key);
    if (!entry) {
      return { allowed: true, retryAfterSeconds: 0, remainingAttempts: this.maxAttempts };
    }
    this.prune(entry, now);
    if (entry.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
        remainingAttempts: 0,
      };
    }
    if (entry.failures.length === 0) {
      this.entries.delete(key);
      return { allowed: true, retryAfterSeconds: 0, remainingAttempts: this.maxAttempts };
    }
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(0, this.maxAttempts - entry.failures.length),
    };
  }

  recordFailure(
    key: string,
    now = Date.now()
  ): { locked: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const entry = this.entries.get(key) ?? { failures: [], lockedUntil: 0 };
    this.prune(entry, now);
    entry.failures.push(now);

    if (entry.failures.length >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;
      entry.failures = [];
      this.entries.set(key, entry);
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil(this.lockoutMs / 1000)),
        remainingAttempts: 0,
      };
    }

    this.entries.set(key, entry);
    return {
      locked: false,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(0, this.maxAttempts - entry.failures.length),
    };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }
}
