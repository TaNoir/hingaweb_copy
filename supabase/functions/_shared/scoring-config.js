// supabase/functions/_shared/scoring-config.js
// THE ONLY FILE THAT HOLDS SCORING NUMBERS (00 Section 6.1).
// PROVISIONAL VALUES — manuscript 2.2.2.2 and 2.2.2.3 worked examples.
// Replace after the scoring session with the two raters. Then set PROVISIONAL = false.
export const PROVISIONAL = true;

export const SCORING_SOURCE =
  'Manuscript 2.2.2.2 illustrative AHP weights and 2.2.2.3 provisional thresholds';

// Criterion weights, order c1..c4. Must sum to 1 (tolerance 0.0005).
export const WEIGHTS = Object.freeze({ c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 });

// Band thresholds on S (2.2.2.3 worked exhibit):
//   S < P2_MIN            -> P3
//   P2_MIN <= S < P1_MIN  -> P2
//   S >= P1_MIN           -> P1
export const THRESHOLDS = Object.freeze({ P2_MIN: 2.25, P1_MIN: 3.5 });

// Half-width of the gray zone around each threshold. The manuscript gives no value
// ("provisional width, pending the 625-profile enumeration"). 0.10 is a proponent placeholder.
// S is in the gray zone when |S - P2_MIN| < GRAY_ZONE_HALF_WIDTH or |S - P1_MIN| < GRAY_ZONE_HALF_WIDTH.
// Set to 0 to disable.
export const GRAY_ZONE_HALF_WIDTH = 0.1;

// Guardrail floors (2.2.2.3). Both floors stop at P2.
export const GUARDRAILS = Object.freeze({
  anySingleAtMax: Object.freeze({ enabled: true, anchor: 5, floor: 'P2' }), // rule (a)
  twoOrMoreHigh: Object.freeze({ enabled: true, minAnchor: 4, minCount: 2, floor: 'P2' }), // rule (b)
  c4MaxFloorP1: Object.freeze({ enabled: false }), // pending rater decision; stays false until decided
});

// Student-mediated prompt (2.1.5.1.7). "Maximum-severity" is not defined numerically in the
// manuscript; placeholder rule: any of c1..c4 equals 5.
export const MAX_SEV_RULE = Object.freeze({ anyCriterionEquals: 5 });
