// Phase 05 · check-in items (00 Section 6.3; 2.1.5.1.3; Fig 11; D-08, D-09).
// Wording is in src/copy/en/checkin.js. This file says which column each item fills, which
// answer scale it uses, and how the tapped answer becomes the stored value.
import { ANSWER_SCALE, MOOD_SCALE, STRESS_SCALE } from './vocabulary.js';

/**
 * 2.1.5.1.3: the items are co-designed with the validator panel before the form is final.
 * Set to 'final' only after co-design. build:pilot fails until then.
 */
export const CHECKIN_ITEMS_STATUS = 'provisional';

/**
 * The six check-in questions, in screen order.
 * - c1..c4 feed Equation 1 and content-based filtering; stored 1-5, higher = more urgent (2.2.2.1).
 * - c4 is worded the opposite way (Fig 11, D-09), so its stored value is 6 minus the tapped answer.
 *   If co-design rewords C4 so that "Very much" means harder, set reverseCoded to false.
 * - mood and stress are for the student's own trends only (D-08). Never scored, never shared.
 */
export const CHECKIN_ITEMS = Object.freeze([
  Object.freeze({
    column: 'c1',
    textKey: 'checkin.items.c1',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c2',
    textKey: 'checkin.items.c2',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c3',
    textKey: 'checkin.items.c3',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c4',
    textKey: 'checkin.items.c4',
    hintKey: 'checkin.items.c4Hint',
    scale: ANSWER_SCALE,
    reverseCoded: true,
  }),
  Object.freeze({
    column: 'mood',
    textKey: 'checkin.items.mood',
    scale: MOOD_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'stress',
    textKey: 'checkin.items.stress',
    scale: STRESS_SCALE,
    reverseCoded: false,
  }),
]);

/** The value written to the database for the answer the student tapped (1-5). */
export function storedValue(item, tapped) {
  return item.reverseCoded ? 6 - tapped : tapped;
}

/** The answer the student tapped, recovered from a stored value. Used by the trends view (D-09). */
export function tappedValue(item, stored) {
  return item.reverseCoded ? 6 - stored : stored;
}

export function itemFor(column) {
  return CHECKIN_ITEMS.find((i) => i.column === column);
}
