import { en } from './en.js';

const DICTIONARIES = { en };

/**
 * Register another language dictionary (Phase 04 registers 'ceb' and 'tl').
 * @param {string} lang
 * @param {object} dict
 */
export function registerLanguage(lang, dict) {
  DICTIONARIES[lang] = dict;
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/**
 * Get UI text by key. Replaces {name} tokens with values from `vars`.
 * Falls back to English when a key is missing in another language.
 * Throws in development when a key does not exist at all, so typos are caught early.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @param {string} [lang]
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
