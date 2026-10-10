# HingaWeb Implementation Plan — 06 · My Trends and Suggested Resources

> Upload order: `00` (v1.3), `01` … `05`, then this file. Phase 05 acceptance must have passed.
> Every file in this phase is given **in full**, except `supabase/config.toml`, where you **append** the block shown.

**What was verified when this plan was written:** `npm run verify` passes (**186 unit and component tests**). The `rank-resources` entry point was started under Deno 2 with its real `npm:` imports and answered correctly. Equation 2 reproduces the manuscript micro-example exactly (0.9989 and 0.4281). With a production build in Chromium and a simulated Tier 2 student with ten check-ins, `/trends` (charts, hover tooltip, and the table view) and `/resources` had **0 axe WCAG 2.1 A/AA violations** at 1280 px and 390 px, with no horizontal scroll. The Playwright specs in `e2e/phase-06` use the real local stack and Edge Functions and run for the first time on Jared's machine. If one fails, fix the app until the spec's expected result happens; change only selectors or waits, and note it in `docs/questions.md`.

---

## 1. Goal

1. **My Trends** (Fig 12; 2.1.5.1.4): the student's own answers over time, one small chart per area (Mood, Stress, School work, Home and family, Future, Managing), plus the same data as a table. Descriptive only: no computed value, summary phrase, forecast, or comparison (Fig 12 caption; D-25).
2. **Suggested for you** (Fig 13; 2.1.5.1.5): verified resources ranked on the server by cosine similarity (Equation 2) against the student's latest check-in. Order is the only signal of relevance.
3. The `rank-resources` Edge Function and the shared `cbf.js` module.

### 1.1 Prerequisites

Phase 05 acceptance passed. Local functions running (`npx supabase functions serve --env-file supabase/functions/.env`).

### 1.2 Not in this phase

`/request` (Phase 07; the "Ask the guidance office for support" links point there). The administrator's resource library (Phase 09). No new tables, columns, or migrations.

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Trends view | Fig 12 | 2.1.5.1.4; Table 8; D-08, D-09, D-25 |
| Ranked resources | Fig 13 | 2.1.5.1.5, 2.1.6.1.5, 2.2.2.4 (Equation 2); Table 16, Table 20; D-07, D-20 |
| `rank-resources` | — | 2.1.6.1.5 (server-side, under 2 s for 100 resources), 2.2.6 (reads only what the caller's role can read) |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure shows | Ruling |
|---|---|---|---|
| P06-D1 | 00 §10.3 bans "score" in student copy | Fig 12 lead: "…without scores, judgments, or ratings." and section lead "No scores and no ratings." | Lead: "Only you can see this. A quiet view of what you have noted down." Section lead: "What you answered on each check-in, shown as you answered it. Nothing here is worked out for you." |
| P06-D2 | D-08: mood and stress are tracked | Fig 12 charts only the four areas | Six charts: Mood, Stress, then the four areas. Two columns on desktop, one on mobile |
| P06-D3 | D-25: no computed trend phrases | Fig 12 corner labels ("Heavier recently", "Holding steady", …) and the row of four summary cards | All removed. Nothing replaces them |
| P06-D4 | Fig 12 caption: "descriptive only" | Fig 12 fills the area under each line | Line and points only. A filled area reads as an amount, which the answers are not |
| P06-D5 | D-09: C4 is reverse-coded | Fig 12 "Managing" | The chart and table show **what the student tapped** (6 − stored), on the same answer labels, so "Very much" means "I have been able to manage" exactly as asked |
| P06-D6 | D-20 | Fig 12: "our senior high school counselors are here", "Confidential • Free • Scheduled on your time", calendar icon; Fig 13: "discuss … in a private session" | Rewritten: "You do not have to carry heavy things on your own. If you would like support, you can ask the guidance office. You will see exactly what is shared before anything is sent." / "You can ask the guidance office for support. You will see exactly what is shared before anything is sent." No calendar icon |
| P06-D7 | Fig 12 page note "Reflections stored on HingaWeb are protected and accessible only from your authenticated student profile." | — | Plain version: "Your check-ins can be opened only from your own account." (true by RLS: no staff or admin policy on `checkins`) |
| P06-D8 | D-07 | Fig 13 cards show a summary, read time, and format | Cards show the area chip, title, "Free access", and "Read guide" (the Phase 03 `ResourceCard`) |
| P06-D9 | 2.1.6.1.5: "resource vectors are not transferred to the client" | Phase 03's public `/guides` reads `attributes` to show each chip | The **ranked** path sends no vectors: `rank-resources` returns `{ id, title, url, area }` only, and `ResourceCard` accepts `area`. `/guides` is the unranked Tier 1 list and is unchanged. **Team note:** if the panel reads 2.1.6.1.5 as covering `/guides` too, Phase 09 can add a public view without `attributes` |
| P06-D10 | The manuscript does not say what "Suggested for you" shows before the first check-in | — | An empty state: "Do a check-in first" with "Start a check-in" and "Browse all guides" (`/guides`). No unranked list is labelled "Suggested" |
| P06-D11 | — | Fig 13 topic filter | Kept. It filters by each guide's main area and keeps the ranked order |
| P06-D12 | 2.1.6.3.4 and 00 §9 (accessible, labelled) | Fig 12 has no text alternative | Each chart has a text description (count and date span, no interpretation), a hover/tap tooltip ("12 Oct: Quite a lot"), and "Show my answers as a table" |
| P06-D13 | — | Fig 12 x-axis shows weekly ticks | One point per check-in, placed by its date; first, middle, and last dates are labelled |

---

## 2. Files in this phase

**New:**
- `supabase/functions/_shared/cbf.js`, `cbf.test.js`
- `supabase/functions/rank-resources/handler.js`, `index.js`, `handler.test.js`
- `src/copy/en/trends.js`
- `src/features/trends/chartDates.js`, `useCheckinHistory.js`, `TrendChart.jsx`, `TrendsPage.jsx`, `trends.test.jsx`
- `src/features/resources/ResourcesPage.jsx`, `resources.test.jsx`
- `e2e/phase-06/trends-resources.spec.js`

**Changed (replace the whole file):** `src/copy/en/index.js`, `src/routes.jsx`, `src/features/public/ResourceCard.jsx` (accepts a server-computed `area`).

**Changed (append):** `supabase/config.toml`.

---

## 3. Screens

### 3.1 My Trends — `/trends`

- Figure / requirement: Fig 12; 2.1.5.1.4. Guard: `RequireStudent tier2`. Layout: `StudentLayout`. Component: `TrendsPage` (no props).
- Header: chip "Private to your account • Only you can see this" (lock icon); h1 "Your check-ins over time"; lead (P06-D1); range control (radio group "Time range"): **Last 30 days** (default) · Last 3 months · All time.
- Card "Each area, over time" + section lead (P06-D1), then six `TrendChart`s in this order: Mood (Very low … Very good), Stress, School work, Home and family, Future, Managing (Not at all … Very much). Managing shows tapped values (P06-D5).
- "Show my answers as a table" / "Hide the table" (ghost button, `aria-expanded`). The table (caption "Your answers on each check-in") has Date (e.g. "1 Oct 2026", Manila time) and one column per chart, each cell the answer **in words**; a missing mood or stress shows "—". On mobile each row becomes a stacked card (Phase 02 `Table`).
- "Want to talk to someone?" card (P06-D6) with "Ask the guidance office for support" → `/request`. Page note (P06-D7).
- States:
  - loading: skeleton card + "Loading…" for screen readers (stale rows from another range are never shown);
  - error: Phase 02 `ErrorState` with "Try again";
  - empty in a range: "No check-ins in this time range" / "Choose All time to see every check-in." + button "Show all time";
  - empty overall (All time): "No check-ins yet" / "Your answers will show here after your first check-in." + "Start a check-in" (`/check-in`);
  - offline: banner; charts already on screen stay.
- Data: reads `checkins` columns `created_at, c1, c2, c3, c4, mood, stress` only (**never** `note`), `eq('student_id', own id)`, `gte('created_at', start)` for the two shorter ranges, oldest first, limit 1000. Writes nothing.
- Copy keys: `trends.*`.

### 3.2 `TrendChart` component

- Props: `title` (string; the chart's name), `levels` (`{ value, label }[]`, values 1–5), `points` (`{ at: ISO string, value: 1..5 }[]`, oldest first, already converted to tapped values).
- An SVG (`viewBox 0 0 320 196`, scales to the card width). The y-axis has the five answer labels; light grid lines (`--color-line`); ink line 2 px; ink points (radius 4, 2 px surface ring); x labels at the first, middle, and last points (e.g. "12 Oct").
- One check-in: one point, no line. No legend (single series; the title names it).
- Hover or tap: a dashed guide line and a tooltip "{date}: {answer}" for the nearest point. The tooltip is `aria-hidden` (the table carries the same data).
- Accessibility: `role="img"`, named by the title, described by "{name}: {count} check-ins from {from} to {to}. Every answer is in the table below the charts." (or the one-check-in version). Never a trend word.
- Colours: ink and line tokens only (00 §10.4).

### 3.3 Suggested for you — `/resources`

- Figure / requirement: Fig 13; 2.1.5.1.5. Guard: `RequireStudent tier2`. Layout: `StudentLayout`. Component: `ResourcesPage` (no props).
- Header: chip "Private to your account • Only you can see this"; h1 "Suggested for you"; lead "Chosen by matching your latest check-in to the topics of each guide. You are never compared to other students."
- On open: `supabase.functions.invoke('rank-resources', { body: {} })`.
- Ready: topic filter (radio group "Show guides about": All · School work · Home and family · Future · Managing), then an ordered list of `ResourceCard`s in the order the server sent. No number, percentage, "match", or "best" anywhere.
- Opening a guide ("Read guide", new tab) also inserts `resource_views { student_id, resource_id }` in the background (owner-only, Table 20). A failed insert never blocks the link.
- Closing card "Want to talk about what you are reading?" (P06-D6) → `/request`.
- States: loading (skeleton); error (`ErrorState` + Try again); no check-in yet (P06-D10); no published guides: "No guides have been published yet" / "The guidance office adds guides here after checking them."; filter with no guides: "No suggested guides on this topic" / "Choose All to see every suggested guide."; offline (banner).
- Copy keys: `resources.*`.

---

## 4. Edge Function: `rank-resources`

| Called by | JWT | Reads (as the caller, through RLS) | Writes | Returns |
|---|---|---|---|---|
| `/resources` | required | latest own `checkins (c1, c2, c3, c4)`; `resources (id, title, url, attributes)` where `verified_at` is not null | nothing | `{ basis: 'latest_checkin' \| 'none', resources: { id, title, url, area }[] }` |

- Student vector = stored `[c1, c2, c3, c4]` of the latest check-in (C4 is already reversed in storage, so higher always means "more about this"). Resource vector = `[school_work, home_family, future, managing]`. Mood and stress are never used (00 §2.6).
- Order: cosine similarity, highest first; ties by title A–Z, then id. `area` = the resource's highest attribute (ties go to the earlier area). No similarity value leaves the function.
- No check-in: `{ basis: 'none', resources: [] }` and the resource table is not read.
- Errors: `401 unauthorized`, `405 method_not_allowed`, `500 read_failed`. Never a raw database message.

---

## 5. Who can see or do what

| Action | Tier 2 student | Guidance / Administrator | Signed out |
|---|---|---|---|
| Open `/trends`, `/resources` | own data | sent to own home | `/login` |
| Read check-ins for trends or ranking | own only (RLS) | **never** | never |
| Call `rank-resources` | ranked against own latest check-in | gets `basis: 'none'` (RLS shows no check-ins) | `401` |
| Insert `resource_views` | own (needs Tier 2) | no | no |
| Read `resource_views` | own only | **never** | never |

---

## 6. Build steps

### Step 1 — Equation 2

**`supabase/functions/_shared/cbf.js`**

```js
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
```

**`supabase/functions/_shared/cbf.test.js`** — includes the manuscript micro-example

```js
import { describe, it, expect } from 'vitest';
import {
  cosine,
  primaryAttribute,
  rankResources,
  toResourceVector,
  toStudentVector,
} from './cbf.js';

const res = (id, title, a) => ({
  id,
  title,
  url: `https://example.org/${id}`,
  attributes: { school_work: a[0], home_family: a[1], future: a[2], managing: a[3] },
});

describe('Equation 2 (2.2.2.4)', () => {
  it('matches the manuscript micro-example to 4 decimals', () => {
    expect(cosine([4, 1], [5, 1]).toFixed(4)).toBe('0.9989');
    expect(cosine([4, 1], [1, 5]).toFixed(4)).toBe('0.4281');
  });

  it('is 0 for an all-zero vector and 1 for parallel vectors', () => {
    expect(cosine([0, 0, 0, 0], [1, 2, 3, 4])).toBe(0);
    expect(cosine([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 12);
  });

  it('maps c1..c4 to school_work, home_family, future, managing', () => {
    expect(toStudentVector({ c1: 5, c2: 4, c3: 3, c4: 2, mood: 1, stress: 1 })).toEqual([
      5, 4, 3, 2,
    ]);
    expect(toResourceVector({ managing: 4, future: 3, home_family: 2, school_work: 1 })).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('names the primary area, ties to the earlier one', () => {
    expect(primaryAttribute({ school_work: 1, home_family: 5, future: 5, managing: 0 })).toBe(
      'home_family',
    );
  });
});

describe('rankResources', () => {
  const library = [
    res('a', 'Talking to family about money worries', [1, 5, 1, 1]),
    res('b', 'Managing exam pressure', [5, 1, 1, 2]),
    res('c', 'Thinking about life after senior high', [1, 1, 5, 1]),
    res('d', 'When everything feels like too much', [1, 1, 1, 5]),
  ];

  it('puts topically congruent guides first (validation in 2.2.2.4)', () => {
    const order = rankResources({ c1: 5, c2: 1, c3: 1, c4: 1 }, library).map((r) => r.id);
    expect(order[0]).toBe('b');
    expect(rankResources({ c1: 1, c2: 5, c3: 1, c4: 1 }, library)[0].id).toBe('a');
    expect(rankResources({ c1: 1, c2: 1, c3: 1, c4: 5 }, library)[0].id).toBe('d');
  });

  it('breaks ties by title, then id', () => {
    const tied = [res('z', 'B title', [1, 1, 1, 1]), res('y', 'A title', [2, 2, 2, 2])];
    expect(rankResources({ c1: 3, c2: 3, c3: 3, c4: 3 }, tied).map((r) => r.id)).toEqual([
      'y',
      'z',
    ]);
  });

  it('returns only id, title, url, area: never a similarity or a vector', () => {
    const out = rankResources({ c1: 5, c2: 1, c3: 1, c4: 1 }, library);
    for (const r of out) expect(Object.keys(r).sort()).toEqual(['area', 'id', 'title', 'url']);
    expect(out.find((r) => r.id === 'b').area).toBe('school_work');
  });

  it('does not change the input', () => {
    const copy = structuredClone(library);
    rankResources({ c1: 1, c2: 1, c3: 5, c4: 1 }, library);
    expect(library).toEqual(copy);
  });
});
```

### Step 2 — `rank-resources`

**`supabase/functions/rank-resources/handler.js`**

```js
// rank-resources (2.1.5.1.5, 2.1.6.1.5; Equation 2). Ranks the published resources against the
// caller's latest check-in. Every read uses the caller's JWT, so RLS decides what is visible
// (2.2.6). Returns the order and each guide's area only: no similarity and no vectors.
import { bearer, makeHttp } from '../_shared/http.js';
import { rankResources } from '../_shared/cbf.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, allowedOrigin?: string }} deps
 */
export function makeRankResources({ z, makeUserClient, allowedOrigin = '*' }) {
  const http = makeHttp(allowedOrigin);
  const Area = z.enum(['school_work', 'home_family', 'future', 'managing']);
  const Output = z
    .object({
      basis: z.enum(['latest_checkin', 'none']),
      resources: z.array(
        z.object({ id: z.guid(), title: z.string(), url: z.string(), area: Area }).strict(),
      ),
    })
    .strict();
  const Rating = z.number().int().min(1).max(5);
  const Checkin = z.object({ c1: Rating, c2: Rating, c3: Rating, c4: Rating });

  return async function rank(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const db = makeUserClient(auth);
    // The caller's own latest check-in (owner-only RLS; staff see none).
    const latest = await db
      .from('checkins')
      .select('c1, c2, c3, c4')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return http.json({ error: 'read_failed' }, 500);
    if (!latest.data) return http.json(Output.parse({ basis: 'none', resources: [] }));
    const checkin = Checkin.safeParse(latest.data);
    if (!checkin.success) return http.json({ error: 'read_failed' }, 500);

    // Published resources only (D-07), even for a caller whose RLS could see drafts.
    const lib = await db
      .from('resources')
      .select('id, title, url, attributes')
      .not('verified_at', 'is', null);
    if (lib.error) return http.json({ error: 'read_failed' }, 500);

    return http.json(
      Output.parse({
        basis: 'latest_checkin',
        resources: rankResources(checkin.data, lib.data ?? []),
      }),
    );
  };
}
```

**`supabase/functions/rank-resources/index.js`**

```js
// Deno entry point for rank-resources (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import { makeUserClient } from '../_shared/clients.js';
import { makeRankResources } from './handler.js';

Deno.serve(
  makeRankResources({ z, makeUserClient, allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*' }),
);
```

**`supabase/functions/rank-resources/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeRankResources } from './handler.js';

const R = (n, title, a) => ({
  id: `bbbbbbb1-0000-4000-8000-00000000000${n}`,
  title,
  url: `https://example.org/${n}`,
  attributes: { school_work: a[0], home_family: a[1], future: a[2], managing: a[3] },
});
const LIB = [
  R(1, 'Managing exam pressure', [5, 1, 1, 2]),
  R(2, 'Talking to family about money worries', [1, 5, 1, 1]),
  R(3, 'When everything feels like too much', [1, 1, 1, 5]),
];

function fake({
  latest = { data: { c1: 1, c2: 5, c3: 1, c4: 1 }, error: null },
  lib = { data: LIB, error: null },
} = {}) {
  const calls = { checkins: [], resources: [] };
  const builder = (table, result) => {
    const q = {
      then: (ok, bad) => Promise.resolve(result).then(ok, bad),
      maybeSingle: async () => result,
    };
    for (const m of ['select', 'order', 'limit', 'not', 'eq']) {
      q[m] = (...a) => (calls[table].push([m, ...a]), q);
    }
    return q;
  };
  const client = { from: (t) => builder(t, t === 'checkins' ? latest : lib) };
  const makeUserClient = vi.fn(() => client);
  return { handler: makeRankResources({ z, makeUserClient }), makeUserClient, calls };
}

const post = (auth = 'Bearer jwt') =>
  new Request('http://local/rank-resources', {
    method: 'POST',
    headers: auth ? { Authorization: auth } : {},
    body: '{}',
  });

describe('rank-resources (2.1.5.1.5; 2.1.6.1.5)', () => {
  it('needs a JWT', async () => {
    const { handler, makeUserClient } = fake();
    expect((await handler(post(null))).status).toBe(401);
    expect(makeUserClient).not.toHaveBeenCalled();
  });

  it('reads the latest check-in and published resources as the caller', async () => {
    const { handler, makeUserClient, calls } = fake();
    await handler(post());
    expect(makeUserClient).toHaveBeenCalledWith('Bearer jwt');
    expect(calls.checkins).toEqual([
      ['select', 'c1, c2, c3, c4'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
    expect(calls.resources).toEqual([
      ['select', 'id, title, url, attributes'],
      ['not', 'verified_at', 'is', null],
    ]);
  });

  it('returns the ranked order with areas, and no similarity or vectors', async () => {
    const { handler } = fake();
    const body = await (await handler(post())).json();
    expect(body.basis).toBe('latest_checkin');
    expect(body.resources.map((r) => r.title)[0]).toBe('Talking to family about money worries');
    expect(body.resources[0]).toEqual({
      id: LIB[1].id,
      title: LIB[1].title,
      url: LIB[1].url,
      area: 'home_family',
    });
    expect(JSON.stringify(body)).not.toMatch(/attributes|similar|score|0\.\d/);
  });

  it('says basis none (and ranks nothing) when there is no check-in yet', async () => {
    const { handler, calls } = fake({ latest: { data: null, error: null } });
    expect(await (await handler(post())).json()).toEqual({ basis: 'none', resources: [] });
    expect(calls.resources).toEqual([]);
  });

  it('fails with no detail when a read fails', async () => {
    const { handler } = fake({ lib: { data: null, error: { message: 'boom' } } });
    const res = await handler(post());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read_failed' });
  });
});
```

Append to `supabase/config.toml` (after the Phase 05 block; change nothing else):

```toml
# ---- Phase 06 ----
[functions.rank-resources]
enabled = true
verify_jwt = true
entrypoint = "./functions/rank-resources/index.js"
```

Restart `npx supabase functions serve --env-file supabase/functions/.env` so it picks up the new function.

### Step 3 — Copy

**`src/copy/en/trends.js`**

```js
// Phase 06 copy: trends (Fig 12) and suggested resources (Fig 13). D-20 and D-25 rewrites.
export const trendsCopy = {
  chip: 'Private to your account • Only you can see this',
  title: 'Your check-ins over time',
  lead: 'Only you can see this. A quiet view of what you have noted down.',
  rangeLabel: 'Time range',
  range: { days30: 'Last 30 days', months3: 'Last 3 months', all: 'All time' },
  sectionTitle: 'Each area, over time',
  sectionLead:
    'What you answered on each check-in, shown as you answered it. Nothing here is worked out for you.',
  names: { mood: 'Mood', stress: 'Stress' },
  chartSummary:
    '{name}: {count} check-ins from {from} to {to}. Every answer is in the table below the charts.',
  chartSummaryOne: '{name}: 1 check-in on {date}. Every answer is in the table below the charts.',
  tooltip: '{date}: {answer}',
  tableShow: 'Show my answers as a table',
  tableHide: 'Hide the table',
  tableCaption: 'Your answers on each check-in',
  tableDate: 'Date',
  noAnswer: '—',
  empty: {
    title: 'No check-ins yet',
    body: 'Your answers will show here after your first check-in.',
    action: 'Start a check-in',
  },
  emptyRange: {
    title: 'No check-ins in this time range',
    body: 'Choose All time to see every check-in.',
    action: 'Show all time',
  },
  talk: {
    title: 'Want to talk to someone?',
    body: 'You do not have to carry heavy things on your own. If you would like support, you can ask the guidance office. You will see exactly what is shared before anything is sent.',
    action: 'Ask the guidance office for support',
  },
  footer: 'Your check-ins can be opened only from your own account.',
};

export const resourcesCopy = {
  chip: 'Private to your account • Only you can see this',
  title: 'Suggested for you',
  lead: 'Chosen by matching your latest check-in to the topics of each guide. You are never compared to other students.',
  filterLabel: 'Show guides about',
  all: 'All',
  noCheckin: {
    title: 'Do a check-in first',
    body: 'Suggestions are matched to your latest check-in. Until then, you can browse every guide.',
    checkin: 'Start a check-in',
    guides: 'Browse all guides',
  },
  emptyLibrary: {
    title: 'No guides have been published yet',
    body: 'The guidance office adds guides here after checking them.',
  },
  emptyFilter: {
    title: 'No suggested guides on this topic',
    body: 'Choose All to see every suggested guide.',
  },
  talk: {
    title: 'Want to talk about what you are reading?',
    body: 'You can ask the guidance office for support. You will see exactly what is shared before anything is sent.',
    action: 'Ask the guidance office for support',
  },
};
```

**`src/copy/en/index.js`**

```js
// Copy sections added by Phases 03 onward. Each phase replaces this file with one more line.
import { publicCopy } from './public.js';
import { assentCopy, waitingCopy } from './assent.js';
import { checkinCopy, crisisCopy } from './checkin.js';
import { trendsCopy, resourcesCopy } from './trends.js';

export const sections = {
  public: publicCopy,
  assent: assentCopy,
  waiting: waitingCopy,
  checkin: checkinCopy,
  crisis: crisisCopy,
  trends: trendsCopy,
  resources: resourcesCopy,
};
```

### Step 4 — Trends

**`src/features/trends/chartDates.js`**

```js
// Short dates for chart axes and tooltips, in Manila time (00 Section 6.2).
import { format, subDays, subMonths } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../../config/site.js';

/** "12 Oct" */
export function shortDate(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM');
}

/** ISO start of a range, or null for all time. */
export function rangeStart(range, now = new Date()) {
  if (range === 'days30') return subDays(now, 30).toISOString();
  if (range === 'months3') return subMonths(now, 3).toISOString();
  return null;
}
```

**`src/features/trends/useCheckinHistory.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { rangeStart } from './chartDates.js';

/** Columns the trends view reads. Never the note (2.1.6.2.7) and never anything derived. */
export const HISTORY_COLUMNS = 'created_at, c1, c2, c3, c4, mood, stress';

/**
 * The signed-in student's own check-ins, oldest first (owner-only RLS, Table 8).
 * @param {string} owner  the student's id
 * @param {'days30'|'months3'|'all'} range
 * @returns {{ status: 'loading'|'error'|'ready', rows: object[], reload: () => void }}
 */
export function useCheckinHistory(owner, range) {
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}|${range}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', rows: [] });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    let q = supabase.from('checkins').select(HISTORY_COLUMNS).eq('student_id', owner);
    const since = rangeStart(range);
    if (since) q = q.gte('created_at', since);
    q.order('created_at', { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        setState({ key, status: error ? 'error' : 'ready', rows: error ? [] : (data ?? []) });
      });
    return () => {
      active = false;
    };
  }, [owner, range, key]);

  // Until the answer for the current range arrives, report loading (never show stale rows).
  if (state.key !== key) return { status: 'loading', rows: [], reload };
  return { status: state.status, rows: state.rows, reload };
}
```

**`src/features/trends/TrendChart.jsx`**

```jsx
// One small chart: one area over time (Fig 12; 2.1.5.1.4; D-08, D-09, D-25).
// Shows only what the student answered, on the answer scale. No trend line, average, forecast,
// or summary phrase. Single series: the title names it, so there is no legend.
// Ink line (2px) and markers (9px) with a surface ring; light grid; hover shows date and answer.
import { useId, useRef, useState } from 'react';
import { t } from '../../copy/index.js';
import { shortDate } from './chartDates.js';

const W = 320;
const H = 196;
const PAD = { left: 76, right: 14, top: 12, bottom: 30 };

/**
 * @param {{ title: string, levels: {value:number,label:string}[],
 *   points: {at: string, value: number}[] }} props  value 1..5 as the student tapped it
 */
export function TrendChart({ title, levels, points }) {
  const titleId = useId();
  const svg = useRef(null);
  const [hover, setHover] = useState(null);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const times = points.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (ms) => (t1 === t0 ? PAD.left + plotW / 2 : PAD.left + ((ms - t0) / (t1 - t0)) * plotW);
  const y = (v) => PAD.top + ((5 - v) / 4) * plotH;
  const xy = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }));
  const label = (v) => levels.find((l) => l.value === v)?.label ?? '';
  const ticks =
    xy.length <= 1
      ? xy
      : xy.length === 2
        ? [xy[0], xy[1]]
        : [xy[0], xy[Math.floor(xy.length / 2)], xy[xy.length - 1]];

  const summary =
    points.length === 1
      ? t('trends.chartSummaryOne', { name: title, date: shortDate(points[0].at) })
      : t('trends.chartSummary', {
          name: title,
          count: points.length,
          from: shortDate(points[0].at),
          to: shortDate(points[points.length - 1].at),
        });

  const onMove = (e) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0 || xy.length === 0) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = xy[0];
    for (const p of xy) if (Math.abs(p.cx - px) < Math.abs(best.cx - px)) best = p;
    setHover(best);
  };

  return (
    <figure className="flex flex-col gap-2 rounded-card border border-line bg-surface-muted p-4">
      <figcaption id={titleId} className="text-[15px] font-semibold text-ink">
        {title}
      </figcaption>
      <div className="relative">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-desc`}
          className="block h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <desc id={`${titleId}-desc`}>{summary}</desc>
          {levels.map((l) => (
            <g key={l.value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(l.value)}
                y2={y(l.value)}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(l.value)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--color-ink-muted)"
              >
                {l.label}
              </text>
            </g>
          ))}
          {ticks.map((p, i) => (
            <text
              key={`tick-${i}`}
              x={p.cx}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink-muted)"
            >
              {shortDate(p.at)}
            </text>
          ))}
          {hover && (
            <line
              x1={hover.cx}
              x2={hover.cx}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--color-ink-muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
          {xy.length > 1 && (
            <polyline
              points={xy.map((p) => `${p.cx},${p.cy}`).join(' ')}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {xy.map((p, i) => (
            <circle
              key={`pt-${i}`}
              data-testid="trend-point"
              cx={p.cx}
              cy={p.cy}
              r={hover === p ? 5.5 : 4}
              fill="var(--color-ink)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          ))}
        </svg>
        {hover && (
          <div
            aria-hidden="true"
            data-testid="trend-tooltip"
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-surface px-2 py-1 text-[13px] text-ink shadow"
            style={{ left: `${Math.min(80, Math.max(20, (hover.cx / W) * 100))}%` }}
          >
            {t('trends.tooltip', { date: shortDate(hover.at), answer: label(hover.value) })}
          </div>
        )}
      </div>
    </figure>
  );
}
```

**`src/features/trends/TrendsPage.jsx`**

```jsx
// Fig 12 · mood and stress over time (2.1.5.1.4; D-08, D-09, D-25; P06-D1..D4).
// Owner-only. Each area is charted separately against its answer scale. Descriptive only:
// no computed value, average, trend phrase, forecast, or comparison (Fig 12 caption).
import { useState } from 'react';
import { useAuth } from '../../lib/auth/useAuth.js';
import { t } from '../../copy/index.js';
import { CRITERIA, MOOD_SCALE, STRESS_SCALE, ANSWER_SCALE } from '../../config/vocabulary.js';
import { itemFor, tappedValue } from '../../config/checkin-items.js';
import { formatDate } from '../../lib/format.js';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  SegmentedControl,
  Skeleton,
  Table,
} from '../../components/ui/index.js';
import { Lock, MessageCircleHeart } from 'lucide-react';
import { TrendChart } from './TrendChart.jsx';
import { useCheckinHistory } from './useCheckinHistory.js';

const RANGES = ['days30', 'months3', 'all'];

/** The six charts in screen order. Values are shown as the student tapped them (D-09). */
const SERIES = [
  { column: 'mood', name: () => t('trends.names.mood'), levels: MOOD_SCALE },
  { column: 'stress', name: () => t('trends.names.stress'), levels: STRESS_SCALE },
  ...CRITERIA.map((c) => ({ column: c.key, name: () => c.studentLabel, levels: ANSWER_SCALE })),
];

function shown(column, stored) {
  if (stored == null) return null;
  return tappedValue(itemFor(column), stored);
}

export function TrendsPage() {
  const { session } = useAuth();
  const [range, setRange] = useState('days30');
  const [table, setTable] = useState(false);
  const history = useCheckinHistory(session.user.id, range);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Chip className="self-start">
            <Lock aria-hidden="true" className="size-4" />
            {t('trends.chip')}
          </Chip>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('trends.title')}
          </h1>
          <p className="max-w-xl text-base text-ink-muted">{t('trends.lead')}</p>
        </div>
        <div className="md:shrink-0">
          <SegmentedControl
            label={t('trends.rangeLabel')}
            options={RANGES.map((r) => ({ value: r, label: t(`trends.range.${r}`) }))}
            value={range}
            onChange={setRange}
          />
        </div>
      </header>

      <Body
        history={history}
        range={range}
        onAllTime={() => setRange('all')}
        table={table}
        onToggleTable={() => setTable((v) => !v)}
      />

      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <MessageCircleHeart aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-[17px] font-semibold text-ink">{t('trends.talk.title')}</h2>
            <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{t('trends.talk.body')}</p>
          </div>
        </div>
        <LinkButton to="/request" variant="outline" className="shrink-0">
          {t('trends.talk.action')}
        </LinkButton>
      </Card>
      <p className="text-center text-[13px] text-ink-muted">{t('trends.footer')}</p>
    </div>
  );
}

function Body({ history, range, onAllTime, table, onToggleTable }) {
  if (history.status === 'loading') {
    return (
      <Card>
        <p className="sr-only">{t('common.loading')}</p>
        <Skeleton lines={6} />
      </Card>
    );
  }
  if (history.status === 'error') return <ErrorState onRetry={history.reload} />;
  if (history.rows.length === 0) {
    return range === 'all' ? (
      <EmptyState
        title={t('trends.empty.title')}
        body={t('trends.empty.body')}
        action={<LinkButton to="/check-in">{t('trends.empty.action')}</LinkButton>}
      />
    ) : (
      <EmptyState
        title={t('trends.emptyRange.title')}
        body={t('trends.emptyRange.body')}
        action={
          <Button variant="outline" onClick={onAllTime}>
            {t('trends.emptyRange.action')}
          </Button>
        }
      />
    );
  }

  const rows = history.rows;
  return (
    <Card className="flex flex-col gap-5">
      <div className="border-b border-line pb-4">
        <h2 className="text-[19px] font-semibold text-ink">{t('trends.sectionTitle')}</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{t('trends.sectionLead')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SERIES.map((s) => (
          <TrendChart
            key={s.column}
            title={s.name()}
            levels={s.levels}
            points={rows
              .filter((r) => r[s.column] != null)
              .map((r) => ({ at: r.created_at, value: shown(s.column, r[s.column]) }))}
          />
        ))}
      </div>
      <Button variant="ghost" className="self-start" onClick={onToggleTable} aria-expanded={table}>
        {table ? t('trends.tableHide') : t('trends.tableShow')}
      </Button>
      {table && (
        <Table
          caption={t('trends.tableCaption')}
          getRowKey={(r) => r.created_at}
          rows={rows}
          columns={[
            {
              key: 'created_at',
              header: t('trends.tableDate'),
              render: (r) => formatDate(r.created_at),
            },
            ...SERIES.map((s) => ({
              key: s.column,
              header: s.name(),
              render: (r) => {
                const v = shown(s.column, r[s.column]);
                return v == null ? t('trends.noAnswer') : s.levels.find((l) => l.value === v).label;
              },
            })),
          ]}
        />
      )}
    </Card>
  );
}
```

### Step 5 — Resources

**`src/features/public/ResourceCard.jsx`** — replaces the Phase 03 file; `/guides` behaves exactly as before

```jsx
// One verified resource: area chip, title, and a link that opens the source in a new tab.
// Phase 06 reuses this card: it passes `area` (computed on the server, so no attribute vector
// reaches the browser, 2.1.6.1.5) and onOpen to record a resource view.
import { ArrowRight } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Card, Chip } from '../../components/ui/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { primaryArea } from './primaryArea.js';

export function ResourceCard({ resource, onOpen }) {
  const area = resource.area
    ? { label: CRITERIA.find((c) => c.attribute === resource.area)?.studentLabel ?? '' }
    : primaryArea(resource.attributes);
  return (
    <Card as="article" className="flex flex-col gap-3">
      <Chip className="self-start">{area.label}</Chip>
      <h3 className="text-[17px] font-semibold text-ink">{resource.title}</h3>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[13px] text-ink-muted">{t('public.guides.freeAccess')}</span>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpen?.(resource)}
          className="inline-flex min-h-11 items-center gap-1 rounded-control font-semibold text-ink"
        >
          {t('public.guides.read')}
          <span className="sr-only">
            {' '}
            {resource.title} {t('public.guides.opensNewTab')}
          </span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </Card>
  );
}
```

**`src/features/resources/ResourcesPage.jsx`**

```jsx
// Fig 13 · ranked resources (2.1.5.1.5, 2.1.6.1.5; Equation 2; D-07, D-20; P06-D5..D7).
// Ranking runs on the server (rank-resources). Relevance is shown by order alone: no number,
// no "match" wording. The student is never compared to other students.
import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  SegmentedControl,
  Skeleton,
} from '../../components/ui/index.js';
import { ResourceCard } from '../public/ResourceCard.jsx';

const FILTERS = [
  { value: 'all', label: () => t('resources.all') },
  ...CRITERIA.map((c) => ({ value: c.attribute, label: () => c.studentLabel })),
];

export function ResourcesPage() {
  const { session } = useAuth();
  const owner = session.user.id;
  const [filter, setFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    attempt: -1,
    status: 'loading',
    basis: null,
    resources: [],
  });

  useEffect(() => {
    let active = true;
    supabase.functions.invoke('rank-resources', { body: {} }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data || !Array.isArray(data.resources)) {
        setState({ attempt, status: 'error', basis: null, resources: [] });
      } else {
        setState({ attempt, status: 'ready', basis: data.basis, resources: data.resources });
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const status = state.attempt === attempt ? state.status : 'loading';

  // Owner-only record that this student opened a guide (Table 20). Fire and forget.
  const onOpen = (resource) => {
    supabase
      .from('resource_views')
      .insert({ student_id: owner, resource_id: resource.id })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) console.error('resource_views insert failed');
      });
  };

  const shown =
    filter === 'all' ? state.resources : state.resources.filter((r) => r.area === filter);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('resources.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('resources.title')}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">{t('resources.lead')}</p>
      </header>

      {status === 'loading' && (
        <div className="flex flex-col gap-3">
          <p className="sr-only">{t('common.loading')}</p>
          <Skeleton lines={5} />
        </div>
      )}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {status === 'ready' && state.basis === 'none' && (
        <EmptyState
          title={t('resources.noCheckin.title')}
          body={t('resources.noCheckin.body')}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/check-in">{t('resources.noCheckin.checkin')}</LinkButton>
              <LinkButton to="/guides" variant="outline">
                {t('resources.noCheckin.guides')}
              </LinkButton>
            </div>
          }
        />
      )}
      {status === 'ready' && state.basis !== 'none' && state.resources.length === 0 && (
        <EmptyState
          title={t('resources.emptyLibrary.title')}
          body={t('resources.emptyLibrary.body')}
        />
      )}
      {status === 'ready' && state.resources.length > 0 && (
        <>
          <SegmentedControl
            label={t('resources.filterLabel')}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label() }))}
            value={filter}
            onChange={setFilter}
          />
          {shown.length === 0 ? (
            <EmptyState
              title={t('resources.emptyFilter.title')}
              body={t('resources.emptyFilter.body')}
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {shown.map((r) => (
                <li key={r.id}>
                  <ResourceCard resource={r} onOpen={onOpen} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <MessageSquare aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-[17px] font-semibold text-ink">{t('resources.talk.title')}</h2>
            <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{t('resources.talk.body')}</p>
          </div>
        </div>
        <LinkButton to="/request" variant="outline" className="shrink-0">
          {t('resources.talk.action')}
        </LinkButton>
      </Card>
    </div>
  );
}
```

### Step 6 — Routes

`/trends` and `/resources` now point at the real screens.

**`src/routes.jsx`**

```jsx
// The route table from 00 Section 7. Later phases replace <PhasePlaceholder> elements with their screens.
import { Navigate, Route, Routes } from 'react-router';
import {
  RequireGuest,
  RequireStaff,
  RequireStaffSession,
  RequireStudent,
} from './lib/auth/guards.jsx';
import { PublicLayout } from './components/layout/PublicLayout.jsx';
import { PublicOrStudentLayout } from './components/layout/PublicOrStudentLayout.jsx';
import { StudentLayout } from './components/layout/StudentLayout.jsx';
import { BareLayout } from './components/layout/BareLayout.jsx';
import { PortalLayout } from './components/layout/PortalLayout.jsx';
import { StaffLayout } from './components/layout/StaffLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage.jsx';
import { EmailConfirmedPage } from './features/auth/EmailConfirmedPage.jsx';
import { StaffLoginPage } from './features/auth/StaffLoginPage.jsx';
import { StaffVerifyPage } from './features/auth/StaffVerifyPage.jsx';
import { StaffSetupPage } from './features/auth/StaffSetupPage.jsx';
import { NotFoundPage } from './features/auth/NotFoundPage.jsx';
import { PhasePlaceholder } from './features/placeholder/PhasePlaceholder.jsx';
import { LandingPage } from './features/public/LandingPage.jsx';
import { GuidesPage } from './features/public/GuidesPage.jsx';
import { HelpPage } from './features/public/HelpPage.jsx';
import { AssentPage } from './features/assent/AssentPage.jsx';
import { WaitingForConsentPage } from './features/assent/WaitingForConsentPage.jsx';
import { CheckInPage } from './features/checkin/CheckInPage.jsx';
import { CrisisPage } from './features/crisis/CrisisPage.jsx';
import { TrendsPage } from './features/trends/TrendsPage.jsx';
import { ResourcesPage } from './features/resources/ResourcesPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Tier 1: public pages; a signed-in student keeps the student header */}
      <Route element={<PublicOrStudentLayout width="wide" />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route element={<PublicOrStudentLayout />}>
        <Route path="guides" element={<GuidesPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      {/* Student account pages */}
      <Route element={<PublicLayout />}>
        <Route element={<RequireGuest />}>
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/confirmed" element={<EmailConfirmedPage />} />
      </Route>

      {/* Signed-in students, any consent state */}
      <Route element={<RequireStudent />}>
        <Route element={<BareLayout />}>
          <Route path="welcome" element={<AssentPage />} />
          <Route path="waiting-for-consent" element={<WaitingForConsentPage />} />
          <Route path="crisis" element={<CrisisPage />} />
        </Route>
      </Route>

      {/* Tier 2 and Tier 3 students */}
      <Route element={<RequireStudent tier2 />}>
        <Route element={<StudentLayout />}>
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="request" element={<PhasePlaceholder phase="07" />} />
          <Route path="request/sent" element={<PhasePlaceholder phase="07" />} />
        </Route>
      </Route>

      {/* Staff portal: sign in, second factor, first-time setup */}
      <Route path="staff" element={<PortalLayout />}>
        <Route index element={<Navigate to="/staff/login" replace />} />
        <Route element={<RequireGuest />}>
          <Route path="login" element={<StaffLoginPage />} />
        </Route>
        <Route element={<RequireStaffSession />}>
          <Route path="verify" element={<StaffVerifyPage />} />
          <Route path="setup" element={<StaffSetupPage />} />
        </Route>
      </Route>

      {/* Guidance (aal2) */}
      <Route element={<RequireStaff role="guidance" />}>
        <Route element={<StaffLayout />}>
          <Route path="staff/queue" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/requests/:id" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/requests/:id/tag" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/crisis" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/referrals" element={<PhasePlaceholder phase="08" />} />
        </Route>
      </Route>

      {/* Administrator (aal2) */}
      <Route element={<RequireStaff role="administrator" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<Navigate to="/admin/accounts" replace />} />
          <Route path="admin/accounts" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/consent" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/reference" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources/new" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources/:id" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/audit" element={<PhasePlaceholder phase="09" />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

### Step 7 — Tests

**`src/features/trends/trends.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { ANSWER_SCALE } from '../../config/vocabulary.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { TrendsPage } = await import('./TrendsPage.jsx');
const { TrendChart } = await import('./TrendChart.jsx');
const { rangeStart } = await import('./chartDates.js');

const UID = '11111111-1111-1111-1111-111111111111';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const ROWS = [
  { created_at: '2026-10-01T01:00:00Z', c1: 2, c2: 3, c3: 4, c4: 1, mood: 2, stress: 4 },
  { created_at: '2026-10-05T01:00:00Z', c1: 4, c2: 3, c3: 2, c4: 5, mood: 4, stress: 2 },
];

let queries;
function setup(results) {
  queries = [];
  const c = createMockSupabase();
  c.from.mockImplementation(() => {
    const q = queryResult(results.length > 1 ? results.shift() : results[0]);
    queries.push(q);
    return q;
  });
  mock.client = c;
}
const renderPage = () =>
  renderWithAuth(<Route path="/trends" element={<TrendsPage />} />, {
    path: '/trends',
    auth: auth(),
  });

beforeEach(() => setup([{ data: ROWS, error: null }]));

describe('TrendsPage (Fig 12; 2.1.5.1.4)', () => {
  it('reads only the student’s own answers, never the note, last 30 days by default', async () => {
    renderPage();
    await screen.findByText('Each area, over time');
    const calls = queries[0].calls;
    expect(calls[0]).toEqual(['select', 'created_at, c1, c2, c3, c4, mood, stress']);
    expect(calls[1]).toEqual(['eq', 'student_id', UID]);
    expect(calls[2][0]).toBe('gte');
    expect(calls.slice(3)).toEqual([
      ['order', 'created_at', { ascending: true }],
      ['limit', 1000],
    ]);
    expect(JSON.stringify(calls)).not.toContain('note');
  });

  it('draws six separate charts: Mood, Stress, and the four areas', async () => {
    renderPage();
    const figures = await screen.findAllByRole('figure');
    expect(
      figures.map((f) => within(f).getByText(/./, { selector: 'figcaption' }).textContent),
    ).toEqual(['Mood', 'Stress', 'School work', 'Home and family', 'Future', 'Managing']);
    expect(screen.getAllByTestId('trend-point')).toHaveLength(12);
  });

  it('has no computed summary phrases (D-25)', async () => {
    const { container } = renderPage();
    await screen.findByText('Each area, over time');
    const text = container.textContent.replace(screen.getByTestId('location').textContent, '');
    expect(text).not.toMatch(
      /heavier|lighter|steady|same as|average|trend|improv|worse|better|score|risk/i,
    );
  });

  it('the table shows Managing as tapped (D-09): stored 1 is "Very much"', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Show my answers as a table' }));
    const table = screen.getByRole('table', { name: 'Your answers on each check-in' });
    const firstRow = within(table).getAllByRole('row')[1];
    const cells = within(firstRow)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells).toEqual([
      '1 Oct 2026',
      'Low',
      'Quite a lot',
      'A little',
      'Somewhat',
      'Quite a lot',
      'Very much',
    ]);
  });

  it('changing the range reloads; All time has no date filter', async () => {
    setup([{ data: ROWS, error: null }]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Each area, over time');
    await user.click(screen.getByRole('radio', { name: 'All time' }));
    await screen.findByText('Each area, over time');
    const last = queries[queries.length - 1].calls;
    expect(last.some((c) => c[0] === 'gte')).toBe(false);
  });

  it('empty in a range offers All time; empty overall offers a check-in', async () => {
    setup([{ data: [], error: null }]);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('No check-ins in this time range')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all time' }));
    expect(await screen.findByText('No check-ins yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
  });

  it('shows the error state with Try again', async () => {
    setup([
      { data: null, error: { message: 'x' } },
      { data: ROWS, error: null },
    ]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Each area, over time')).toBeInTheDocument();
  });

  it('links to the support request, with no scheduling promise (D-20)', async () => {
    renderPage();
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
    expect(document.body.textContent).not.toMatch(/scheduled|session/i);
  });
});

describe('TrendChart', () => {
  const points = [
    { at: '2026-10-01T01:00:00Z', value: 1 },
    { at: '2026-10-08T01:00:00Z', value: 5 },
  ];

  it('labels the y axis with the answer scale and describes itself for screen readers', () => {
    render(<TrendChart title="School work" levels={ANSWER_SCALE} points={points} />);
    for (const l of ANSWER_SCALE) expect(screen.getByText(l.label)).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'School work' });
    expect(img).toHaveAccessibleDescription(
      'School work: 2 check-ins from 1 Oct to 8 Oct. Every answer is in the table below the charts.',
    );
  });

  it('a single check-in is one marker and no line', () => {
    const { container } = render(
      <TrendChart title="Mood" levels={ANSWER_SCALE} points={[points[0]]} />,
    );
    expect(container.querySelector('polyline')).toBeNull();
    expect(screen.getAllByTestId('trend-point')).toHaveLength(1);
  });

  it('hover shows the date and the answer in words', () => {
    render(<TrendChart title="Future" levels={ANSWER_SCALE} points={points} />);
    const svg = screen.getByRole('img', { name: 'Future' });
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 196 });
    fireEvent.pointerMove(svg, { clientX: 310, clientY: 50 });
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('8 Oct: Very much');
    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId('trend-tooltip')).toBeNull();
  });
});

describe('rangeStart', () => {
  it('is 30 days, 3 months, or nothing', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(rangeStart('days30', now)).toBe('2026-09-10T00:00:00.000Z');
    expect(rangeStart('months3', now)).toBe('2026-07-10T00:00:00.000Z');
    expect(rangeStart('all', now)).toBeNull();
  });
});
```

**`src/features/resources/resources.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ResourcesPage } = await import('./ResourcesPage.jsx');

const UID = '11111111-1111-1111-1111-111111111111';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const RANKED = [
  {
    id: 'r2',
    title: 'Talking to family about money worries',
    url: 'https://example.org/2',
    area: 'home_family',
  },
  { id: 'r1', title: 'Managing exam pressure', url: 'https://example.org/1', area: 'school_work' },
  {
    id: 'r3',
    title: 'When everything feels like too much',
    url: 'https://example.org/3',
    area: 'managing',
  },
];

function setup(...results) {
  const c = createMockSupabase();
  for (const r of results) c.functions.invoke.mockResolvedValueOnce(r);
  c.from.mockImplementation(() => queryResult({ data: null, error: null }));
  mock.client = c;
  return c;
}
const renderPage = () =>
  renderWithAuth(<Route path="/resources" element={<ResourcesPage />} />, {
    path: '/resources',
    auth: auth(),
  });

describe('ResourcesPage (Fig 13; 2.1.5.1.5)', () => {
  it('asks the server to rank and shows guides in that order, with no number', async () => {
    const c = setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Suggested for you' }),
    ).toBeInTheDocument();
    const list = await screen.findByRole('list');
    expect(
      within(list)
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(RANKED.map((r) => r.title));
    expect(c.functions.invoke).toHaveBeenCalledWith('rank-resources', { body: {} });
    expect(list.textContent).not.toMatch(/\d+%|0\.\d|match|score|similar/i);
    expect(
      screen.getByText(
        'Chosen by matching your latest check-in to the topics of each guide. You are never compared to other students.',
      ),
    ).toBeInTheDocument();
  });

  it('filters by area and keeps the ranked order', async () => {
    setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('list');
    await user.click(screen.getByRole('radio', { name: 'School work' }));
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(['Managing exam pressure']);
    await user.click(screen.getByRole('radio', { name: 'Future' }));
    expect(screen.getByText('No suggested guides on this topic')).toBeInTheDocument();
  });

  it('records an owner-only view when a guide is opened', async () => {
    const c = setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    const user = userEvent.setup();
    renderPage();
    const link = (await screen.findAllByRole('link', { name: /Read/ }))[0];
    link.addEventListener('click', (e) => e.preventDefault());
    await user.click(link);
    expect(c.from).toHaveBeenCalledWith('resource_views');
    const q = c.from.mock.results.find(
      (r, i) => c.from.mock.calls[i][0] === 'resource_views',
    ).value;
    expect(q.calls).toEqual([['insert', { student_id: UID, resource_id: 'r2' }]]);
  });

  it('with no check-in yet, points to a check-in and the unranked guides', async () => {
    setup({ data: { basis: 'none', resources: [] }, error: null });
    renderPage();
    expect(await screen.findByText('Do a check-in first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
    expect(screen.getByRole('link', { name: 'Browse all guides' })).toHaveAttribute(
      'href',
      '/guides',
    );
  });

  it('empty library and error states', async () => {
    setup(
      { data: null, error: { message: 'down' } },
      { data: { basis: 'latest_checkin', resources: [] }, error: null },
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No guides have been published yet')).toBeInTheDocument();
  });

  it('the closing card asks for support without promising a session (D-20)', async () => {
    setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    renderPage();
    await screen.findByRole('list');
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
    expect(document.body.textContent).not.toMatch(
      /private session|scheduled|counselors are available/i,
    );
  });
});
```

**`e2e/phase-06/trends-resources.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND `npx supabase functions serve`. Adds one check-in for student.full,
// so it runs once (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('Phase 06 · trends and ranked resources (Figs 12, 13)', () => {
  test('a home-and-family check-in puts the family guide first, fast, with no numbers', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    const picks = ['Not at all', 'Very much', 'Not at all', 'Very much', 'Okay', 'Somewhat'];
    const groups = page.getByRole('radiogroup');
    for (let i = 0; i < picks.length; i += 1) {
      await groups.nth(i).getByRole('radio', { name: picks[i], exact: true }).click();
    }
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();

    const started = Date.now();
    const ranked = page.waitForResponse((r) => r.url().includes('/functions/v1/rank-resources'));
    await page.getByRole('link', { name: 'See suggested guides' }).click();
    const body = await (await ranked).json();
    expect(Date.now() - started).toBeLessThan(2000); // 2.1.6.1.5
    expect(JSON.stringify(body)).not.toMatch(/attributes|similar|score/);
    const titles = page.getByRole('list').getByRole('heading');
    await expect(titles.first()).toHaveText('Talking to family about money worries');
    await expect(page.getByText('Sleep and routine')).toHaveCount(0); // unpublished
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('opening a guide records a private view', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await page.goto('/resources');
    const viewed = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/resource_views') && r.request().method() === 'POST',
    );
    const popup = page.waitForEvent('popup');
    await page.getByRole('link', { name: /Talking to family about money worries/ }).click();
    await (await popup).close();
    expect((await viewed).status()).toBe(201);
  });

  test('trends show six charts, Managing as tapped, and an accessible table', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await page.goto('/trends');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your check-ins over time' }),
    ).toBeVisible();
    for (const name of ['Mood', 'Stress', 'School work', 'Home and family', 'Future', 'Managing']) {
      await expect(page.getByRole('img', { name })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Show my answers as a table' }).click();
    const table = page.getByRole('table', { name: 'Your answers on each check-in' });
    await expect(table).toBeVisible();
    // The check-in above tapped "Very much" for Managing (stored 1): the table shows what was tapped.
    await expect(table.getByRole('row').last()).toContainText('Very much');
    await expect(page.getByText(/Heavier|Holding steady|lighter|same as last/i)).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

Run:

```bash
npm run verify
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-06
```

### Step 8 — Hosted project (after local acceptance)

`npx supabase functions deploy rank-resources`. No new secrets.

---

## 7. Must never (this phase)

1. Never compute, show, or return a similarity value, rank number, percentage, "match", "best for you", or "top pick". Order is the only signal (Fig 13 caption).
2. Never send resource attribute vectors to the browser on the ranked path, and never compute cosine similarity in `src/`.
3. Never compare a student with other students, and never use other students' data, views, or popularity in ranking.
4. Never use mood, stress, or the note in ranking.
5. Never add a computed phrase, average, trend line, forecast, arrow, "better/worse", or colour change to the trends view (D-25).
6. Never read `note` for the trends view, and never show the note there.
7. Never show Managing as its stored value; show what the student tapped (D-09).
8. Never use a red, amber, or green tone, or a colour per area, in the charts. Ink and line tokens only.
9. Never show a draft (unpublished) resource to a student.
10. Never show `resource_views` to staff in any form.
11. Never promise a session, a schedule, or a counselor in the support cards (D-20).

---

## 8. Acceptance checklist

Record `phase-06: acceptance passed (checks 1–11)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 186 tests pass; lint, copy, colours OK; build OK (chunk-size warning expected until Phase 10) |
| 2 | End to end | `db reset`, enrol TOTP, functions serving, `npm run test:e2e -- e2e/phase-06` | 3 pass on desktop; 3 skipped on mobile |
| 3 | Empty trends | right after `db reset`, log in as `student.full@example.test`, open `/trends` | "No check-ins in this time range"; press "Show all time" → "No check-ins yet" with "Start a check-in" |
| 4 | Charts match answers | make 3 check-ins; in the last one tap Managing "Very much" and Mood "Good" | six charts with 3 points each; the last Managing point is on "Very much", the last Mood point on "Good"; hovering a point shows "{date}: {answer}"; the table's last row says the same in words |
| 5 | No interpretation | read the whole `/trends` page | no words like heavier, lighter, steady, same as, average, better, worse, score; no colours other than pink, white, grey, and ink |
| 6 | Ranking by hand | after a check-in with only item 2 "Very much" (others "Not at all", item 4 "Very much"), open `/resources` | first guide is "Talking to family about money worries". By hand: student vector (1,5,1,1) against (0,5,1,1) gives 27 / (√28 × √27) ≈ 0.982, the highest of the four |
| 7 | Nothing numeric reaches the browser | DevTools → Network → `rank-resources` response | only `basis` and `resources` with `id, title, url, area`; no `attributes`, no decimals |
| 8 | Drafts hidden | `/resources` | "Sleep and routine" (unpublished in the seed) does not appear |
| 9 | 2-second budget (2.1.6.1.5) | run the SQL below in Studio → SQL editor, then reload `/resources` with DevTools open | the `rank-resources` request finishes in under 2000 ms. Then `npx supabase db reset` |
| 10 | Resource view recorded | open any guide from `/resources` | Studio → `resource_views` has a row for that student and resource |
| 11 | Mobile and keyboard | 390 px; Tab through `/trends` and `/resources`; arrow keys in the range and topic controls | no horizontal scroll; charts fit the card; every control reachable with a visible focus ring; the table shows as stacked cards |

SQL for check 9 (local only; adds 100 published test guides):

```sql
insert into public.resources (title, url, attributes, verified_by)
select 'Load test ' || g,
       'https://example.org/load/' || g,
       jsonb_build_object('school_work', g % 6, 'home_family', (g * 2) % 6,
                          'future', (g * 3) % 6, 'managing', (g * 5) % 5 + 1),
       '55555555-5555-4555-8555-555555555555'
from generate_series(1, 100) g;
```
