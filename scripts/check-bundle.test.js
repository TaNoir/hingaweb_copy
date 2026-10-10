import { describe, it, expect } from 'vitest';
import { SECRET_PATTERNS, closure, filesFor, lazyViolations } from './check-bundle.js';

const manifest = {
  'index.html': {
    file: 'assets/index.js',
    isEntry: true,
    imports: ['_ui.js'],
    css: ['assets/index.css'],
  },
  '_ui.js': { file: 'assets/ui.js', imports: ['_vocab.js'] },
  '_vocab.js': { file: 'assets/vocab.js' },
  'src/features/resources/ResourcesPage.jsx': {
    file: 'assets/ResourcesPage.js',
    isDynamicEntry: true,
    imports: ['_ui.js', 'index.html'],
  },
  'src/features/crisis/CrisisPage.jsx': { file: 'assets/Crisis.js', isDynamicEntry: true },
};

describe('check-bundle (2.1.6.1.2)', () => {
  it('follows static imports once each', () => {
    expect([...closure(manifest, 'index.html')]).toEqual(['index.html', '_ui.js', '_vocab.js']);
  });

  it('counts the main entry plus the view chunk and their CSS', () => {
    expect(filesFor(manifest, ['src/features/resources/ResourcesPage.jsx']).sort()).toEqual([
      'assets/ResourcesPage.js',
      'assets/index.css',
      'assets/index.js',
      'assets/ui.js',
      'assets/vocab.js',
    ]);
  });

  it('flags a crisis screen that was made lazy', () => {
    expect(lazyViolations(manifest)).toEqual(['src/features/crisis/CrisisPage.jsx']);
  });

  it('catches a service-role JWT or a secret key, but not the supabase-js prefix check', () => {
    const hit = (text) => SECRET_PATTERNS.some((re) => re.test(text));
    for (const pre of ['', 'a', 'ab']) {
      const payload = Buffer.from(`{"iss":"supabase","${pre}x":1,"role":"service_role"}`).toString(
        'base64url',
      );
      expect(hit(`const k = "eyJhbGciOiJIUzI1NiJ9.${payload}.sig"`)).toBe(true);
    }
    expect(hit('const k = "sb_secret_AbCdEfGhIjKlMnOpQrSt"')).toBe(true);
    expect(hit('e.startsWith(`sb_secret_`)')).toBe(false);
    expect(hit('const k = "sb_publishable_AbCdEfGhIjKlMnOpQrSt"')).toBe(false);
  });
});
