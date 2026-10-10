import { describe, it, expect } from 'vitest';
import { CHECKIN_ITEMS, CHECKIN_ITEMS_STATUS, storedValue, tappedValue } from './checkin-items.js';
import { checkinCopy } from '../copy/en/checkin.js';

describe('check-in items (00 Section 6.3; D-08, D-09)', () => {
  it('has the six columns in screen order and stays provisional until co-design', () => {
    expect(CHECKIN_ITEMS.map((i) => i.column)).toEqual(['c1', 'c2', 'c3', 'c4', 'mood', 'stress']);
    expect(CHECKIN_ITEMS_STATUS).toBe('provisional');
  });

  it('every item has English text', () => {
    for (const i of CHECKIN_ITEMS) {
      const key = i.textKey.split('.').pop();
      expect(checkinCopy.items[key]).toBeTruthy();
    }
  });

  it('only C4 is reverse-coded: tapping "Very much" (5) stores 1', () => {
    expect(CHECKIN_ITEMS.filter((i) => i.reverseCoded).map((i) => i.column)).toEqual(['c4']);
    const c4 = CHECKIN_ITEMS[3];
    expect([1, 2, 3, 4, 5].map((v) => storedValue(c4, v))).toEqual([5, 4, 3, 2, 1]);
    expect([1, 2, 3, 4, 5].map((v) => tappedValue(c4, storedValue(c4, v)))).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(storedValue(CHECKIN_ITEMS[0], 5)).toBe(5);
  });
});
