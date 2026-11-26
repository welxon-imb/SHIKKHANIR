import test from 'node:test';
import assert from 'node:assert/strict';
import { LoginAttemptLimiter } from './rateLimiter';

test('LoginAttemptLimiter blocks after maxAttempts and unlocks after lockoutMs', () => {
  const limiter = new LoginAttemptLimiter({
    maxAttempts: 5,
    windowMs: 60_000,
    lockoutMs: 30_000,
  });

  const key = '127.0.0.1';
  const t0 = 1_000_000;

  assert.deepEqual(limiter.check(key, t0), {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: 5,
  });

  for (let i = 1; i <= 4; i++) {
    const res = limiter.recordFailure(key, t0 + i * 100);
    assert.equal(res.locked, false);
    assert.equal(res.remainingAttempts, 5 - i);
  }

  const fifth = limiter.recordFailure(key, t0 + 500);
  assert.equal(fifth.locked, true);
  assert.equal(fifth.retryAfterSeconds, 30);
  assert.equal(fifth.remainingAttempts, 0);

  const blocked = limiter.check(key, t0 + 5_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 26);

  const unlocked = limiter.check(key, t0 + 30_600);
  assert.deepEqual(unlocked, {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: 5,
  });
});

test('LoginAttemptLimiter resets failure count on successful login', () => {
  const limiter = new LoginAttemptLimiter({
    maxAttempts: 3,
    windowMs: 60_000,
    lockoutMs: 30_000,
  });
  const key = 'client-a';
  limiter.recordFailure(key, 1000);
  limiter.recordFailure(key, 2000);
  limiter.reset(key);
  assert.deepEqual(limiter.check(key, 3000), {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: 3,
  });
});
