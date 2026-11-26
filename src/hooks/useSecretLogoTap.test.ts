import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLogoTapSequence } from './useSecretLogoTap';

test('taps 1 through 4 never trigger unlock', () => {
  let count = 0;
  let lastMs = 0;
  for (let i = 1; i <= 4; i++) {
    const res = evaluateLogoTapSequence(count, lastMs, 1000 + i * 200);
    assert.equal(res.triggered, false);
    assert.equal(res.nextCount, i);
    count = res.nextCount;
    lastMs = res.lastTapMs;
  }
});

test('5th consecutive tap within window triggers unlock and resets counter', () => {
  let count = 0;
  let lastMs = 0;
  for (let i = 1; i <= 4; i++) {
    const res = evaluateLogoTapSequence(count, lastMs, 1000 + i * 250);
    count = res.nextCount;
    lastMs = res.lastTapMs;
  }
  const fifth = evaluateLogoTapSequence(count, lastMs, 2250);
  assert.equal(fifth.triggered, true);
  assert.equal(fifth.nextCount, 0);
  assert.equal(fifth.lastTapMs, 0);
});

test('slow tap exceeding maxGapMs resets sequence back to 1', () => {
  const t1 = evaluateLogoTapSequence(0, 0, 1000);
  const t2 = evaluateLogoTapSequence(t1.nextCount, t1.lastTapMs, 1300);
  const t3 = evaluateLogoTapSequence(t2.nextCount, t2.lastTapMs, 1600);
  assert.equal(t3.nextCount, 3);
  const slowTap = evaluateLogoTapSequence(t3.nextCount, t3.lastTapMs, 5000, 2500, 5);
  assert.equal(slowTap.triggered, false);
  assert.equal(slowTap.nextCount, 1);
});
