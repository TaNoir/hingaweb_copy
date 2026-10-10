import { CRITERIA } from '../../config/vocabulary.js';

/**
 * The area a resource is mostly about: its highest attribute value.
 * Ties go to the earlier area in CRITERIA order (School work, Home and family, Future, Managing).
 * @param {Record<string, number>} attributes  e.g. { school_work: 5, home_family: 1, future: 1, managing: 2 }
 * @returns {{ attribute: string, label: string }}
 */
export function primaryArea(attributes) {
  let best = CRITERIA[0];
  for (const c of CRITERIA) {
    if ((attributes?.[c.attribute] ?? 0) > (attributes?.[best.attribute] ?? 0)) best = c;
  }
  return { attribute: best.attribute, label: best.studentLabel };
}
