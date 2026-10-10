import { describe, it, expect } from 'vitest';
import { primaryArea } from './primaryArea.js';

describe('primaryArea', () => {
  it('picks the highest attribute', () => {
    expect(primaryArea({ school_work: 1, home_family: 1, future: 5, managing: 0 })).toEqual({
      attribute: 'future',
      label: 'Future',
    });
  });
  it('breaks ties in criteria order', () => {
    expect(primaryArea({ school_work: 3, home_family: 3, future: 0, managing: 3 }).label).toBe(
      'School work',
    );
  });
});
