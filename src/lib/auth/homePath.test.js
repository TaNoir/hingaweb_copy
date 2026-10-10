import { describe, it, expect } from 'vitest';
import { homePathFor } from './homePath.js';

const aal2 = { current: 'aal2', next: 'aal2' };
const aal1WithFactor = { current: 'aal1', next: 'aal2' };
const aal1NoFactor = { current: 'aal1', next: 'aal1' };

describe('homePathFor', () => {
  it('sends anonymous users to log in', () => {
    expect(homePathFor({ kind: 'anonymous' }, null)).toBe('/login');
    expect(homePathFor(null, null)).toBe('/login');
  });
  it('sends a student without assent to the walkthrough', () => {
    expect(homePathFor({ kind: 'student', assent: 'none', tier2: false }, null)).toBe('/welcome');
    expect(homePathFor({ kind: 'student', assent: 'withdrawn', tier2: false }, null)).toBe(
      '/welcome',
    );
  });
  it('sends a student with assent but no parental consent to the waiting page', () => {
    expect(homePathFor({ kind: 'student', assent: 'granted', tier2: false }, null)).toBe(
      '/waiting-for-consent',
    );
  });
  it('sends a Tier 2 student to the check-in', () => {
    expect(homePathFor({ kind: 'student', assent: 'granted', tier2: true }, null)).toBe(
      '/check-in',
    );
  });
  it('sends staff without the second factor to verify or set up', () => {
    expect(homePathFor({ kind: 'guidance', is_active: true }, aal1WithFactor)).toBe(
      '/staff/verify',
    );
    expect(homePathFor({ kind: 'administrator', is_active: true }, aal1NoFactor)).toBe(
      '/staff/setup',
    );
  });
  it('sends verified staff to their home', () => {
    expect(homePathFor({ kind: 'guidance', is_active: true }, aal2)).toBe('/staff/queue');
    expect(homePathFor({ kind: 'administrator', is_active: true }, aal2)).toBe('/admin/accounts');
  });
  it('sends inactive staff back to sign in', () => {
    expect(homePathFor({ kind: 'guidance', is_active: false }, aal2)).toBe('/staff/login');
  });
  it('treats an account with no profile as signed out', () => {
    expect(homePathFor({ kind: 'none' }, null)).toBe('/login');
  });
});
