import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyse, combine, parseEntry, toMatrix, weightsFrom, weightsLine } from './ahp.js';
import { WEIGHTS } from '../supabase/functions/_shared/scoring-config.js';

const example = JSON.parse(readFileSync('scripts/ahp.example.json', 'utf8'));

describe('scripts/ahp.js (2.2.2.2; N-04)', () => {
  it('reproduces the Table 7 worked example', () => {
    const { raters, combined } = analyse(example);
    const r = raters[0];
    expect(r.weights).toEqual([0.2616, 0.4531, 0.1182, 0.1671]);
    expect(r.lambdaMax).toBe(4.0709);
    expect(r.ci).toBe(0.0236);
    expect(r.cr).toBe(0.0262);
    expect(r.acceptable).toBe(true);
    // N-04: the recomputed ratios (the manuscript prints 4.0472, 4.0437, 4.0912, 4.1013)
    expect(r.ratios).toEqual([4.0475, 4.0439, 4.0917, 4.1004]);
    expect(combined).toEqual(r.weights);
  });

  it('matches the provisional weights in scoring-config.js', () => {
    expect(analyse(example).combined).toEqual([WEIGHTS.c1, WEIGHTS.c2, WEIGHTS.c3, WEIGHTS.c4]);
  });

  it('gives CR 0.0265 with RI 0.89', () => {
    expect(analyse(example, 0.89).raters[0].cr).toBe(0.0265);
  });

  it('combining two raters equals the geometric mean of their judgments', () => {
    const a = toMatrix(example.raters[0].matrix);
    const b = toMatrix([
      [1, 1, 3, 2],
      [1, 1, 2, 2],
      ['1/3', '1/2', 1, 1],
      ['1/2', '1/2', 1, 1],
    ]);
    const c = combine([a, b]);
    expect(c[0][1]).toBeCloseTo(Math.sqrt(0.5 * 1), 12);
    expect(c[1][0] * c[0][1]).toBeCloseTo(1, 12);
    const w = weightsFrom(c);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
  });

  it('rejects a matrix that is not reciprocal or not 4x4', () => {
    expect(() =>
      toMatrix([
        [1, 2],
        [0.5, 1],
      ]),
    ).toThrow(/4 rows/);
    expect(() =>
      toMatrix([
        [1, 2, 1, 1],
        [2, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ]),
    ).toThrow(/reciprocals/);
    expect(() => parseEntry('two')).toThrow();
  });

  it('flags a rater whose CR is 0.10 or more', () => {
    const bad = analyse({
      raters: [
        {
          name: 'inconsistent',
          matrix: [
            [1, 9, '1/9', 9],
            ['1/9', 1, 9, '1/9'],
            [9, '1/9', 1, 9],
            ['1/9', 9, '1/9', 1],
          ],
        },
      ],
    });
    expect(bad.raters[0].acceptable).toBe(false);
  });

  it('prints a WEIGHTS line in the scoring-config.js shape', () => {
    expect(weightsLine([0.2616, 0.4531, 0.1182, 0.1671])).toBe(
      'export const WEIGHTS = Object.freeze({ c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 });',
    );
  });
});
