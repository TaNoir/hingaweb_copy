import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDate, shortRef } from './format.js';

describe('format', () => {
  it('shows times in Manila (UTC+8)', () => {
    expect(formatDateTime('2026-10-12T00:14:00Z')).toBe('12 Oct 2026, 8:14 AM');
  });
  it('rolls the date over at Manila midnight', () => {
    expect(formatDate('2026-10-12T16:30:00Z')).toBe('13 Oct 2026');
  });
  it('shortens ids to a reference', () => {
    expect(shortRef('1a2b3c4d-0000-4000-8000-000000000000')).toBe('Ref 1a2b3c4d');
  });
});
