// 2.2.2.2 · AHP weight derivation for the scoring session (Phase 07).
// Reads each rater's 4x4 pairwise comparison matrix (Saaty 1-9 scale, reciprocal), and prints:
//   - per rater: weights by the row geometric-mean method, lambda max, CI, and CR
//   - the combined weights (geometric mean of both raters' judgments)
//   - a WEIGHTS line to paste into supabase/functions/_shared/scoring-config.js
// It never edits scoring-config.js. A person pastes the result after the session, then sets
// PROVISIONAL = false only when the thresholds are also decided (00 Section 6.1).
//
// Usage: node scripts/ahp.js scripts/ahp.example.json
// Input:  { "raters": [ { "name": "Rater A", "matrix": [["1","1/2","2","2"], ...] }, ... ] }
//         Rows and columns are in criterion order C1, C2, C3, C4. Entries may be numbers or "a/b".
import { readFileSync } from 'node:fs';

export const CRITERIA = ['c1', 'c2', 'c3', 'c4'];
/** Saaty's random index for n = 4 (2.2.2.2). */
export const RANDOM_INDEX = 0.9;
export const CR_LIMIT = 0.1;

/** "1/3" -> 0.3333..., "2" -> 2, 2 -> 2. */
export function parseEntry(value) {
  if (typeof value === 'number') return value;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?\s*$/.exec(String(value));
  if (!m) throw new Error(`Not a number or fraction: ${value}`);
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

/** Checks the matrix is 4x4, positive, has 1 on the diagonal, and is reciprocal. */
export function toMatrix(raw) {
  if (
    !Array.isArray(raw) ||
    raw.length !== 4 ||
    raw.some((r) => !Array.isArray(r) || r.length !== 4)
  ) {
    throw new Error('The matrix must be 4 rows of 4 entries (C1..C4).');
  }
  const a = raw.map((row) => row.map(parseEntry));
  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(a[i][i] - 1) > 1e-9) throw new Error(`Diagonal entry ${i + 1} must be 1.`);
    for (let j = 0; j < 4; j += 1) {
      if (!(a[i][j] > 0)) throw new Error('Every entry must be positive.');
      if (Math.abs(a[i][j] * a[j][i] - 1) > 1e-3) {
        throw new Error(`Entries (${i + 1},${j + 1}) and (${j + 1},${i + 1}) must be reciprocals.`);
      }
    }
  }
  return a;
}

/** Row geometric means g_i = (prod_j a_ij)^(1/n). */
export function rowGeometricMeans(a) {
  return a.map((row) => row.reduce((p, x) => p * x, 1) ** (1 / row.length));
}

/** Normalised weights w_i = g_i / sum(g). */
export function weightsFrom(a) {
  const g = rowGeometricMeans(a);
  const sum = g.reduce((s, x) => s + x, 0);
  return g.map((x) => x / sum);
}

/** (A w)_i / w_i for each row, their mean (lambda max), CI, and CR. */
export function consistency(a, w, ri = RANDOM_INDEX) {
  const n = a.length;
  const ratios = a.map((row, i) => row.reduce((s, x, j) => s + x * w[j], 0) / w[i]);
  const lambdaMax = ratios.reduce((s, x) => s + x, 0) / n;
  const ci = (lambdaMax - n) / (n - 1);
  return { ratios, lambdaMax, ci, cr: ci / ri };
}

/** Element-wise geometric mean of several raters' matrices (stays reciprocal). */
export function combine(matrices) {
  const k = matrices.length;
  return matrices[0].map((row, i) =>
    row.map((_, j) => matrices.reduce((p, m) => p * m[i][j], 1) ** (1 / k)),
  );
}

const r4 = (x) => Math.round(x * 10000) / 10000;

/** Everything the session needs, rounded to 4 decimals like the manuscript. */
export function analyse(input, ri = RANDOM_INDEX) {
  if (!input || !Array.isArray(input.raters) || input.raters.length === 0) {
    throw new Error('Input needs "raters": [ { "name", "matrix" } ].');
  }
  const raters = input.raters.map((r) => {
    const a = toMatrix(r.matrix);
    const w = weightsFrom(a);
    const c = consistency(a, w, ri);
    return {
      name: r.name ?? 'Rater',
      weights: w.map(r4),
      ratios: c.ratios.map(r4),
      lambdaMax: r4(c.lambdaMax),
      ci: r4(c.ci),
      cr: r4(c.cr),
      acceptable: c.cr < CR_LIMIT,
    };
  });
  const combined = weightsFrom(combine(input.raters.map((r) => toMatrix(r.matrix)))).map(r4);
  return { raters, combined };
}

/** The line to paste into scoring-config.js. */
export function weightsLine(weights) {
  const parts = CRITERIA.map((c, i) => `${c}: ${weights[i].toFixed(4)}`).join(', ');
  return `export const WEIGHTS = Object.freeze({ ${parts} });`;
}

if (process.argv[1] && process.argv[1].endsWith('ahp.js')) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/ahp.js <judgments.json>');
    process.exit(2);
  }
  const result = analyse(JSON.parse(readFileSync(file, 'utf8')));
  for (const r of result.raters) {
    console.log(`\n${r.name}`);
    console.log(`  weights  C1..C4: ${r.weights.join(', ')}`);
    console.log(`  ratios   (Aw)/w: ${r.ratios.join(', ')}`);
    console.log(`  lambda max ${r.lambdaMax}  CI ${r.ci}  CR ${r.cr} (RI ${RANDOM_INDEX})`);
    console.log(
      `  ${r.acceptable ? 'CR below 0.10: accepted' : 'CR is 0.10 or more: re-elicit this rater'}`,
    );
  }
  console.log(`\nCombined weights (geometric mean of all raters): ${result.combined.join(', ')}`);
  const sum = r4(result.combined.reduce((s, x) => s + x, 0));
  console.log(`Sum after rounding: ${sum} (scoring-config.js accepts 1 +/- 0.0005)`);
  console.log('\nPaste into supabase/functions/_shared/scoring-config.js:');
  console.log(weightsLine(result.combined));
  if (result.raters.some((r) => !r.acceptable)) process.exit(1);
}
