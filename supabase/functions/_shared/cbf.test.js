import { describe, it, expect } from 'vitest';
import {
  cosine,
  primaryAttribute,
  rankResources,
  toResourceVector,
  toStudentVector,
} from './cbf.js';

const res = (id, title, a) => ({
  id,
  title,
  url: `https://example.org/${id}`,
  attributes: { school_work: a[0], home_family: a[1], future: a[2], managing: a[3] },
});

describe('Equation 2 (2.2.2.4)', () => {
  it('matches the manuscript micro-example to 4 decimals', () => {
    expect(cosine([4, 1], [5, 1]).toFixed(4)).toBe('0.9989');
    expect(cosine([4, 1], [1, 5]).toFixed(4)).toBe('0.4281');
  });

  it('is 0 for an all-zero vector and 1 for parallel vectors', () => {
    expect(cosine([0, 0, 0, 0], [1, 2, 3, 4])).toBe(0);
    expect(cosine([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 12);
  });

  it('maps c1..c4 to school_work, home_family, future, managing', () => {
    expect(toStudentVector({ c1: 5, c2: 4, c3: 3, c4: 2, mood: 1, stress: 1 })).toEqual([
      5, 4, 3, 2,
    ]);
    expect(toResourceVector({ managing: 4, future: 3, home_family: 2, school_work: 1 })).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('names the primary area, ties to the earlier one', () => {
    expect(primaryAttribute({ school_work: 1, home_family: 5, future: 5, managing: 0 })).toBe(
      'home_family',
    );
  });
});

describe('rankResources', () => {
  const library = [
    res('a', 'Talking to family about money worries', [1, 5, 1, 1]),
    res('b', 'Managing exam pressure', [5, 1, 1, 2]),
    res('c', 'Thinking about life after senior high', [1, 1, 5, 1]),
    res('d', 'When everything feels like too much', [1, 1, 1, 5]),
  ];

  it('puts topically congruent guides first (validation in 2.2.2.4)', () => {
    const order = rankResources({ c1: 5, c2: 1, c3: 1, c4: 1 }, library).map((r) => r.id);
    expect(order[0]).toBe('b');
    expect(rankResources({ c1: 1, c2: 5, c3: 1, c4: 1 }, library)[0].id).toBe('a');
    expect(rankResources({ c1: 1, c2: 1, c3: 1, c4: 5 }, library)[0].id).toBe('d');
  });

  it('breaks ties by title, then id', () => {
    const tied = [res('z', 'B title', [1, 1, 1, 1]), res('y', 'A title', [2, 2, 2, 2])];
    expect(rankResources({ c1: 3, c2: 3, c3: 3, c4: 3 }, tied).map((r) => r.id)).toEqual([
      'y',
      'z',
    ]);
  });

  it('returns only id, title, url, area: never a similarity or a vector', () => {
    const out = rankResources({ c1: 5, c2: 1, c3: 1, c4: 1 }, library);
    for (const r of out) expect(Object.keys(r).sort()).toEqual(['area', 'id', 'title', 'url']);
    expect(out.find((r) => r.id === 'b').area).toBe('school_work');
  });

  it('does not change the input', () => {
    const copy = structuredClone(library);
    rankResources({ c1: 1, c2: 1, c3: 5, c4: 1 }, library);
    expect(library).toEqual(copy);
  });
});
