import { describe, it, expect } from 'vitest';
import { HOTLINES, GUIDANCE_OFFICE, SPECIALISTS, emergencyHotline } from './directory.js';

describe('static directory (D-03, 1.4)', () => {
  it('has the four referral targets: guidance office, IPBM, external professionals, hotlines', () => {
    expect(GUIDANCE_OFFICE.id).toBe('guidance_office');
    expect(SPECIALISTS.map((s) => s.id)).toEqual(['ipbm', 'external_professionals']);
    expect(HOTLINES.length).toBeGreaterThanOrEqual(1);
  });
  it('marks exactly one hotline as the emergency line', () => {
    expect(HOTLINES.filter((h) => h.emergency)).toHaveLength(1);
    expect(emergencyHotline()).toBeDefined();
  });
  it('gives every hotline a name, number, and dial value', () => {
    for (const h of HOTLINES) {
      expect(h.name && h.number && h.dial).toBeTruthy();
    }
  });
});
