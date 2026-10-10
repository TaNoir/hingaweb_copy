import { describe, it, expect } from 'vitest';
import * as CONFIG from './scoring-config.js';
import {
  scoreS,
  bandFor,
  inGrayZone,
  firedGuardrails,
  triage,
  checkinPrompt,
  validateConfig,
} from './saw.js';

const noGray = { ...CONFIG, GRAY_ZONE_HALF_WIDTH: 0 };
const r = (c1, c2, c3, c4) => ({ c1, c2, c3, c4 });
const all = [];
for (let a = 1; a <= 5; a++)
  for (let b = 1; b <= 5; b++)
    for (let c = 1; c <= 5; c++) for (let d = 1; d <= 5; d++) all.push(r(a, b, c, d));
const count = (list) => list.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});

describe('config', () => {
  it('the weights sum to 1 and thresholds are ordered', () => {
    expect(() => validateConfig(CONFIG)).not.toThrow();
  });
});

// The manuscript's worked examples use the PLACEHOLDER weights and thresholds. They run while
// scoring-config.js is still provisional and are skipped after the scoring session replaces the
// values (Phase 10), so changing the config never breaks the build.
const PLACEHOLDER = CONFIG.PROVISIONAL === true;

describe.runIf(PLACEHOLDER)('Equation 1 — manuscript 2.2.2.3 worked examples', () => {
  it('(1,1,5,1) scores 1.4728: P3 by score, raised to P2 by guardrail (a)', () => {
    expect(scoreS(r(1, 1, 5, 1), CONFIG.WEIGHTS)).toBe(1.4728);
    expect(bandFor(1.4728, CONFIG.THRESHOLDS)).toBe('P3');
    const t = triage(r(1, 1, 5, 1), noGray);
    expect(t.band).toBe('P2');
    expect(t.guardrails.fired).toEqual(['anySingleAtMax']);
  });
  it('(5,5,1,1) scores 3.8588 and reaches P1', () => {
    expect(triage(r(5, 5, 1, 1), noGray)).toMatchObject({ score: 3.8588, band: 'P1' });
  });
  it('(5,1,5,5) scores 3.1876 and stays P2 (no guardrail produces P1)', () => {
    expect(triage(r(5, 1, 5, 5), noGray)).toMatchObject({ score: 3.1876, band: 'P2' });
  });
});

describe.runIf(PLACEHOLDER)('625-profile enumeration (manuscript 2.2.2.3, gray zone off)', () => {
  it('179 / 326 / 120 before guardrails', () => {
    expect(count(all.map((x) => bandFor(scoreS(x, CONFIG.WEIGHTS), CONFIG.THRESHOLDS)))).toEqual({
      P1: 179,
      P2: 326,
      P3: 120,
    });
  });
  it('179 / 356 / 90 after guardrails', () => {
    expect(count(all.map((x) => triage(x, noGray).band))).toEqual({ P1: 179, P2: 356, P3: 90 });
  });
  it('P1 is gated on C2: none with C2 = 1, two with C2 <= 2, 21 with C2 <= 3', () => {
    const p1 = all.filter((x) => bandFor(scoreS(x, CONFIG.WEIGHTS), CONFIG.THRESHOLDS) === 'P1');
    expect(p1.filter((x) => x.c2 === 1)).toHaveLength(0);
    expect(p1.filter((x) => x.c2 <= 2)).toHaveLength(2);
    expect(p1.filter((x) => x.c2 <= 3)).toHaveLength(21);
  });
});

describe('gray zone and For Review', () => {
  it.runIf(PLACEHOLDER)('a score near a threshold goes to For Review, never auto-labelled', () => {
    expect(inGrayZone(2.2, CONFIG.THRESHOLDS, 0.1)).toBe(true);
    expect(inGrayZone(2.35, CONFIG.THRESHOLDS, 0.1)).toBe(false); // |2.35 - 2.25| = 0.10 is not < 0.10
    expect(inGrayZone(3.45, CONFIG.THRESHOLDS, 0.1)).toBe(true);
  });
  it('a request with no check-in goes to For Review with no score', () => {
    expect(triage(null, CONFIG)).toMatchObject({ score: null, band: 'FR' });
  });
  it('the saved rule set records weights, thresholds, gray zone, and provisional flag (N-06)', () => {
    expect(triage(r(2, 2, 2, 2), CONFIG).guardrails).toEqual({
      fired: [],
      weights: CONFIG.WEIGHTS,
      thresholds: CONFIG.THRESHOLDS,
      grayZoneHalfWidth: CONFIG.GRAY_ZONE_HALF_WIDTH,
      provisional: CONFIG.PROVISIONAL,
    });
  });
});

describe('guardrails', () => {
  it('rule (b) fires on two ratings at 4 or above', () => {
    expect(firedGuardrails(r(4, 1, 4, 1), CONFIG.GUARDRAILS)).toEqual(['twoOrMoreHigh']);
  });
  it.runIf(PLACEHOLDER)('the C4 floor to P1 is off until the raters decide', () => {
    expect(firedGuardrails(r(1, 1, 1, 5), CONFIG.GUARDRAILS)).toEqual(['anySingleAtMax']);
  });
});

describe('check-in prompt (2.1.5.1.7; N-01)', () => {
  it('max_sev when any criterion is 5', () => {
    expect(checkinPrompt(r(1, 1, 1, 5), CONFIG)).toBe('max_sev');
  });
  it.runIf(PLACEHOLDER)('gray_zone when the score sits near a threshold', () => {
    // S = 0.2616*2 + 0.4531*2 + 0.1182*2 + 0.1671*3 = 2.1671 -> within 0.10 of 2.25
    expect(checkinPrompt(r(2, 2, 2, 3), CONFIG)).toBe('gray_zone');
  });
  it('null otherwise', () => {
    expect(checkinPrompt(r(1, 1, 1, 1), CONFIG)).toBeNull();
  });
  it('returns only a type, never a number', () => {
    for (const x of all) expect(['max_sev', 'gray_zone', null]).toContain(checkinPrompt(x, CONFIG));
  });
});
