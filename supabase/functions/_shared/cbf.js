// Content-based filtering (manuscript 2.2.2.4, Equation 2). Pure JavaScript: runs in Deno and Vitest.
// NEVER imported by src/. The student is compared only to resources, never to other students.
// Similarity numbers never leave the server (00 must-never 4); only the order does.

/** Resource attribute keys in criterion order: c1 -> school_work ... c4 -> managing (00 Section 2.4). */
export const ATTRIBUTES = Object.freeze(['school_work', 'home_family', 'future', 'managing']);

/** Equation 2: cos(theta) = (A.B) / (|A||B|). Returns 0 when either vector is all zeros. */
export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** The student's vector: the stored c1..c4 of the latest check-in (higher = more urgent; C4 already reversed, D-09). */
export function toStudentVector(checkin) {
  return [checkin.c1, checkin.c2, checkin.c3, checkin.c4];
}

/** A resource's vector from its attributes jsonb (Table 16). */
export function toResourceVector(attributes) {
  return ATTRIBUTES.map((k) => Number(attributes?.[k] ?? 0));
}

/** The attribute a resource is mostly about (highest value; ties go to the earlier attribute). */
export function primaryAttribute(attributes) {
  let best = ATTRIBUTES[0];
  for (const k of ATTRIBUTES) if ((attributes?.[k] ?? 0) > (attributes?.[best] ?? 0)) best = k;
  return best;
}

/**
 * Ranks resources for one check-in, most similar first. Ties: title A-Z, then id.
 * @param {{c1:number,c2:number,c3:number,c4:number}} checkin
 * @param {{id:string,title:string,url:string,attributes:object}[]} resources
 * @returns {{id:string,title:string,url:string,area:string}[]}  no similarity, no vectors
 */
export function rankResources(checkin, resources) {
  const student = toStudentVector(checkin);
  return resources
    .map((r) => ({ r, sim: cosine(student, toResourceVector(r.attributes)) }))
    .sort(
      (x, y) =>
        y.sim - x.sim ||
        x.r.title.localeCompare(y.r.title, 'en') ||
        (x.r.id < y.r.id ? -1 : x.r.id > y.r.id ? 1 : 0),
    )
    .map(({ r }) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      area: primaryAttribute(r.attributes),
    }));
}
