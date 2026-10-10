// Simple Additive Weighting (manuscript 2.2.2.1–2.2.2.3). Pure JavaScript, no imports besides the
// config argument, so it runs in Deno (Edge Functions) and in Vitest. NEVER imported by src/.
// Output is a triage priority for a support request, or a prompt type for a private check-in.
// It never labels a student and never produces an office tag.

const RANK = { P3: 1, P2: 2, P1: 3 };
const CRITERIA = ['c1', 'c2', 'c3', 'c4'];

/** Round to 4 decimals (numeric(7,4) in triage_decisions). */
export function round4(x) {
  return Math.round(x * 10000) / 10000;
}

/** Throws if the config could not have come from the scoring session. */
export function validateConfig(cfg) {
  const sum = CRITERIA.reduce((s, k) => s + cfg.WEIGHTS[k], 0);
  if (Math.abs(sum - 1) > 0.0005) throw new Error(`Weights must sum to 1 (got ${sum})`);
  if (!(cfg.THRESHOLDS.P2_MIN < cfg.THRESHOLDS.P1_MIN))
    throw new Error('P2_MIN must be below P1_MIN');
  if (cfg.GRAY_ZONE_HALF_WIDTH < 0) throw new Error('GRAY_ZONE_HALF_WIDTH must be >= 0');
}

/** Equation 1: S = sum of w_j * r_j over c1..c4. Ratings are the stored 1-5 values (higher = more urgent). */
export function scoreS(r, weights) {
  return round4(CRITERIA.reduce((s, k) => s + weights[k] * r[k], 0));
}

/** Plain band from the thresholds, before guardrails and gray zone. */
export function bandFor(S, thresholds) {
  if (S >= thresholds.P1_MIN) return 'P1';
  if (S >= thresholds.P2_MIN) return 'P2';
  return 'P3';
}

/** True when S is within the gray zone of either threshold (strictly less than the half-width). */
export function inGrayZone(S, thresholds, halfWidth) {
  if (!halfWidth) return false;
  return Math.abs(S - thresholds.P2_MIN) < halfWidth || Math.abs(S - thresholds.P1_MIN) < halfWidth;
}

/** Names of the guardrail floors that apply to these ratings (2.2.2.3). */
export function firedGuardrails(r, guardrails) {
  const values = CRITERIA.map((k) => r[k]);
  const fired = [];
  const a = guardrails.anySingleAtMax;
  if (a.enabled && values.some((v) => v >= a.anchor)) fired.push('anySingleAtMax');
  const b = guardrails.twoOrMoreHigh;
  if (b.enabled && values.filter((v) => v >= b.minAnchor).length >= b.minCount)
    fired.push('twoOrMoreHigh');
  const c = guardrails.c4MaxFloorP1;
  if (c.enabled && r.c4 >= 5) fired.push('c4MaxFloorP1');
  return fired;
}

function floorFor(name, guardrails) {
  return name === 'c4MaxFloorP1' ? 'P1' : guardrails[name].floor;
}

/** The rule set saved with every decision (N-06), so it stays reproducible by hand. */
export function ruleSnapshot(cfg, fired) {
  return {
    fired,
    weights: { ...cfg.WEIGHTS },
    thresholds: { ...cfg.THRESHOLDS },
    grayZoneHalfWidth: cfg.GRAY_ZONE_HALF_WIDTH,
    provisional: cfg.PROVISIONAL,
  };
}

/**
 * Triage for a support request (Table 10).
 * @param {{c1:number,c2:number,c3:number,c4:number}|null} r  stored ratings from the latest check-in, or null
 * @returns {{ score: number|null, band: 'P1'|'P2'|'P3'|'FR', guardrails: object }}
 */
export function triage(r, cfg) {
  validateConfig(cfg);
  if (!r) return { score: null, band: 'FR', guardrails: ruleSnapshot(cfg, []) }; // no check-in yet (Table 9 note)
  const score = scoreS(r, cfg.WEIGHTS);
  const fired = firedGuardrails(r, cfg.GUARDRAILS);
  if (inGrayZone(score, cfg.THRESHOLDS, cfg.GRAY_ZONE_HALF_WIDTH)) {
    return { score, band: 'FR', guardrails: ruleSnapshot(cfg, fired) }; // never auto-labelled
  }
  let band = bandFor(score, cfg.THRESHOLDS);
  for (const name of fired) {
    const floor = floorFor(name, cfg.GUARDRAILS);
    if (RANK[floor] > RANK[band]) band = floor;
  }
  return { score, band, guardrails: ruleSnapshot(cfg, fired) };
}

/**
 * Student-mediated prompt for a private check-in (2.1.5.1.7; N-01).
 * Returns only the prompt type. The score is never returned, shown, or stored.
 * @returns {'max_sev'|'gray_zone'|null}
 */
export function checkinPrompt(r, cfg) {
  validateConfig(cfg);
  if (CRITERIA.some((k) => r[k] === cfg.MAX_SEV_RULE.anyCriterionEquals)) return 'max_sev';
  if (inGrayZone(scoreS(r, cfg.WEIGHTS), cfg.THRESHOLDS, cfg.GRAY_ZONE_HALF_WIDTH))
    return 'gray_zone';
  return null;
}
