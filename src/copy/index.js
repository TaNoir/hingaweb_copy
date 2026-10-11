import { en } from './en.js';
import { ceb } from './ceb.js';
import { tl } from './tl.js';

// ceb and tl hold the assent (Phase 04) and crisis (Phase 05) keys (00 Section 10.2), plus the
// guide card source line (not shown yet: /guides and /resources have no language switch).
const DICTIONARIES = { en, ceb, tl };

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/**
 * Get UI text by key. Replaces {name} tokens with values from `vars`.
 * Falls back to English when a key is missing in another language.
 * Throws in development when a key does not exist at all, so typos are caught early.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @param {'en'|'ceb'|'tl'} [lang]
 */
export function t(key, vars = {}, lang = 'en') {
  let value = lookup(DICTIONARIES[lang] ?? {}, key);
  if (typeof value !== 'string') value = lookup(en, key);
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) throw new Error(`Missing copy key: ${key}`);
    return '';
  }
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
