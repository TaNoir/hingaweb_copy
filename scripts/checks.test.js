import { describe, it, expect } from 'vitest';
import { findViolations } from './check-copy.js';
import { scanFile } from './check-colour-words.js';
import { PLACEHOLDER } from './check-placeholders.js';

describe('check-copy', () => {
  it('flags diagnostic and scoring words in student copy', () => {
    const v = findViolations({ checkin: { a: 'Your score is ready', b: 'Signs of anxiety' } }, []);
    expect(v.map((x) => x.key)).toEqual(['checkin.a', 'checkin.b']);
  });
  it('lets staff copy use priority words', () => {
    expect(findViolations({ staff: { queue: { a: 'P1 requests first' } } }, [])).toEqual([]);
  });
  it('treats guidance.* (Phase 08 dashboard) as staff copy, but still bans diagnostic words there', () => {
    expect(findViolations({ guidance: { queue: { a: 'P1 first; For Review; score S' } } }, [])).toEqual([]);
    expect(findViolations({ guidance: { a: 'possible depression' } }, [])).toHaveLength(1);
    expect(findViolations({ guidancex: { a: 'P1 first' } }, [])).toHaveLength(1);
  });
  it('honours the exact-sentence allowlist', () => {
    const s = 'It is not a diagnosis and it is not a replacement for talking to someone.';
    expect(findViolations({ landing: { a: s } }, [s])).toEqual([]);
  });
});

describe('check-colour-words', () => {
  it('flags a colour word in ordinary code', () => {
    expect(scanFile('src/features/x.jsx', "const tone = 'red';")).toHaveLength(1);
  });
  it('ignores words that only contain colour letters', () => {
    expect(scanFile('src/x.js', 'referred required reduce greenery')).toEqual([]);
  });
  it('allows colour words only between office-tag markers', () => {
    const text = "a: 'red'\n// office-tags:start\nb: 'Red'\n// office-tags:end\nc: 'green'";
    expect(scanFile('src/copy/en.js', text).map((x) => x.line)).toEqual([1, 5]);
  });
  it('allows the office_tags migration', () => {
    expect(
      scanFile('supabase/migrations/20261010000200_office_tags.sql', "('green','yellow','red')"),
    ).toEqual([]);
  });
});

describe('check-placeholders', () => {
  it('matches the three owners only', () => {
    const s = '[[GUIDANCE:hotline_1]] [[TEAM:CEB:assent.title]] [[SCHOOL:it]] [[OTHER:x]]';
    expect([...s.matchAll(PLACEHOLDER)].map((m) => m[1])).toEqual(['GUIDANCE', 'TEAM', 'SCHOOL']);
  });
});
