import { describe, it, expect } from 'vitest';
import { isExpired, timeoutFlag } from './idle.js';

const MIN = 60 * 1000;

describe('isExpired', () => {
  it('is false before 15 minutes', () => {
    expect(isExpired(0, 14 * MIN + 59_000, 15 * MIN)).toBe(false);
  });
  it('is true at exactly 15 minutes and after', () => {
    expect(isExpired(0, 15 * MIN, 15 * MIN)).toBe(true);
    expect(isExpired(0, 60 * MIN, 15 * MIN)).toBe(true);
  });
  it('is false when last activity is unknown', () => {
    expect(isExpired(null, 99 * MIN, 15 * MIN)).toBe(false);
  });
});

describe('timeoutFlag', () => {
  it('sets and clears', () => {
    timeoutFlag.set();
    expect(timeoutFlag.get()).toBe(true);
    timeoutFlag.clear();
    expect(timeoutFlag.get()).toBe(false);
  });
});
