# HingaWeb Implementation Plan — 07 · Support Request and Triage

> Upload order: `00` (v1.3), `01` … `06`, then this file. Phase 06 acceptance must have passed.
> Every file in this phase is given **in full**, except `supabase/config.toml`, where you **append** the block shown.

**What was verified when this plan was written:** `npm run verify` passes (**219 unit and component tests**). `submit-support-request` was started under Deno 2 with its real `npm:` imports and answered correctly. Against the real Phase 01 schema in Postgres 16, a check-in by the student followed by `create_support_request()` as the service role saved the request and its decision in one transaction, with the disclosed copy built by the database. `scripts/ahp.js` reproduces the manuscript's Table 7 example (weights 0.2616 / 0.4531 / 0.1182 / 0.1671, λmax 4.0709, CI 0.0236, CR 0.0262). With a production build in Chromium and a simulated Tier 2 student, `/request`, the failure state, and `/request/sent` had **0 axe WCAG 2.1 A/AA violations** at 1280 px and 390 px. The Playwright specs in `e2e/phase-07` run for the first time on Jared's machine; if one fails, fix the app, change only selectors or waits, and note it in `docs/questions.md`.

---

## 1. Goal

1. **Ask the guidance office** (Fig 16; 2.1.5.1.6): the student sees exactly what will be shared, with the real values, chooses the kind of concern (D-11), may write a note, ticks an acknowledgement naming every shared item (D-10), and sends. Out-of-hours notice (D-12).
2. **Failure state** (Fig 17; 2.1.6.4.5): an explicit "nothing was sent" notice with a retry; the note stays in page memory (D-23).
3. **Sent** (2.1.6.4.7): shown only after the database has saved the request.
4. **`submit-support-request`** Edge Function: triage with Equation 1, guardrails, and gray zone on the server (2.1.6.1.4), saved with the request in one transaction (Tables 9–10; N-06).
5. **`scripts/ahp.js`**: the AHP calculator for the scoring session (2.2.2.2).
6. **`src/lib/time.js`**: Manila time and school days (2.1.7.3, 2.1.3.8), also used by Phase 08.

### 1.1 Prerequisites

Phase 06 acceptance passed. Local functions running (`npx supabase functions serve --env-file supabase/functions/.env`).

### 1.2 Not in this phase

The staff side of requests (Phase 08). Real weights and thresholds: they come from the scoring session; `PROVISIONAL` stays `true` (00 §6.1).

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Request screen | Fig 16 | 2.1.5.1.6, 2.1.7.3; Table 9; D-10, D-11, D-12, D-20 |
| Failure state | Fig 17 | 2.1.6.4.5; D-23 |
| Sent screen | — | 2.1.6.4.7 |
| Prompt outcome | — | Table 19 (`request_sent`); D-13 |
| `submit-support-request` | — | 2.1.6.1.4, 2.2.2.1–2.2.2.3, 2.2.6; Tables 9, 10; N-02, N-06 |
| `scripts/ahp.js` | Table 7 | 2.2.2.2; N-04 |
| `src/lib/time.js` | — | 2.1.7.3, 2.1.3.8 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure shows | Ruling |
|---|---|---|---|
| P07-D1 | D-10: everything in Table 9's disclosed copy must be named | Fig 16 lists three items | "What the guidance office will see" lists the **real values**: name, grade level, section, class adviser, the four latest answers (in words, as tapped; D-09), plus the kind of concern, the note, and that and when they asked |
| P07-D2 | D-20 | Fig 16–17 chip "Voluntary counselor connection"; Fig 17 lead "reviewed privately by authorized senior high school counselors during campus office hours"; Fig 17 checkbox "…so an accredited counselor can reach out to me" | Chip "Voluntary request • {school}"; no counselor or credential claims |
| P07-D3 | D-23 | Fig 17 "Draft safe locally", "Unsent text draft is safe on this device", "241 characters saved", "No notes will be cleared" | "Your note stays on this page until you send it or leave. It is not saved on this device." No character counter |
| P07-D4 | D-18 | Fig 17 "2nd Floor of the Administration Building", "Find the office on campus" | Location and hours are the `SITE` placeholders; no extra link |
| P07-D5 | 00 §10.5 tone | Fig 16 "Your daily entries stay locked in your personal sanctuary." | "Your check-ins stay private to you. Staff cannot browse them." |
| P07-D6 | D-12; office hours and holidays are guidance placeholders | — | The general sentence ("Requests sent outside school hours, on weekends, or during school breaks wait for the next school day.") always shows. "The guidance office is closed right now…" is added when `time.js` knows it is closed: always on weekends and on holidays once filled, and outside hours once `officeOpens`/`officeCloses` are real `HH:MM` values |
| P07-D7 | 2.1.5.1.6: the screen says what reaches staff before sending | A newer check-in could be saved in another tab while this screen is open | The browser sends the id of the check-in it showed. The function refuses (`409 stale_checkin`) if it is not the latest; the screen reloads the answers and asks for the tick again |
| P07-D8 | Table 9: a request with no check-in is For Review | — | Allowed. The screen says "You have no check-in yet, so no answers are shared." and the acknowledgement leaves out the answers |
| P07-D9 | 2.1.6.4.5: never a silent success | A request can reach the server but its answer can be lost | No answer within 20 s counts as a failure. A retry may then create a second request; staff see "Has another open request". Accepted over ever showing an unconfirmed success |
| P07-D10 | D-16 (staff screens) | — | The student's sent screen shows "Ref xxxxxxxx" so they can name the request at the office |
| P07-D11 | 2.2.2.2: "geometric-mean aggregation of both raters" (method not named) | — | `ahp.js` takes the element-wise geometric mean of the raters' judgments. With the row geometric-mean method this gives the same weights as the geometric mean of the raters' weight vectors, so both readings agree |
| P07-D12 | N-04 | Table 7 printed ratios 4.0472, 4.0437, 4.0912, 4.1013 | `ahp.test.js` checks the recomputed 4.0475, 4.0439, 4.0917, 4.1004; λmax, CI, CR and weights match the manuscript exactly |
| P07-D13 | The manuscript does not say how the office contacts the student | — | Sent screen: "Someone from the office will follow up with you at school." No channel, time, or session is promised |

---

## 2. Files in this phase

**New:**
- `supabase/functions/submit-support-request/handler.js`, `index.js`, `handler.test.js`
- `scripts/ahp.js`, `scripts/ahp.example.json`, `scripts/ahp.test.js`
- `src/lib/time.js`, `src/lib/time.test.js`
- `src/copy/en/request.js`
- `src/features/requests/useRequestPreview.js`, `RequestPage.jsx`, `RequestSentPage.jsx`, `request.test.jsx`
- `e2e/phase-07/request.spec.js`

**Changed (replace the whole file):** `src/copy/en/index.js`, `src/routes.jsx`.

**Changed (append):** `supabase/config.toml`.

---

## 3. Screens

### 3.1 Ask the guidance office — `/request`

- Figure / requirement: Fig 16, Fig 17; 2.1.5.1.6. Guard: `RequireStudent tier2`. Layout: `StudentLayout`. Component: `RequestPage` (no props; reads `location.state` = `{ promptCheckinId, promptType }` when opened from the Phase 05 prompt).
- Header: chip "Voluntary request • {school}" (lock icon), h1 "Ask the guidance office for support", lead "Reaching out is always your choice. Here is exactly what is shared before you send anything."
- Card **"What the guidance office will see"** (eye icon), with values from `my_account()` and the latest check-in:
  - "Your name: {full_name}", "Your grade level: Grade {n}", "Your section: {section}", "Your class adviser: {adviser}"
  - "Your four answers from your latest check-in on {date}" and, under it, each of the four Fig 11 statements followed by the answer in words (C4 shown as tapped). Or: "You have no check-in yet, so no answers are shared."
  - "The kind of concern you choose below", "Anything you write in the note below", "That you asked for support, and when you sent it"
  - Loading: skeleton. Error: "We could not load what will be shared, so nothing can be sent yet." + Try again.
- Card **"What they will not see"** (eye-off icon): "Your private check-ins on other days, your mood and stress answers, and your check-in notes." · "Your trends and the guides you opened." · "Your check-ins stay private to you. Staff cannot browse them."
- Form card:
  - "What is this mostly about?" (native select, required, placeholder "Choose one"): School work · Friends and classmates · Home and family · Something else about how I'm doing (00 §2.9). Hint "This helps the guidance office know what to expect. It does not decide anything."
  - "Is there anything you want them to know? (optional)", placeholder "You can write a short note here, or leave this blank. Take your time...", hint "The guidance office will read this when they open your request. It is stored as you write it and never analysed." Max 2000 characters.
  - Hours notice (P07-D6).
  - Acknowledgement checkbox: "I understand that my name, grade level, section, class adviser, my four latest check-in answers, the kind of concern, and my note will be shared with the guidance office." (without check-in: the same sentence without the answers).
  - While the concern or the tick is missing: "To send, choose what this is mostly about and tick the box above." "Send request" (primary, arrow) stays **disabled** until both are done. "Cancel" (ghost) → previous page.
- Not-for-emergencies line under the form (Phase 03 `EmergencyNotice`).
- Sending: `functions.invoke('submit-support-request', { body: { checkin_id, concern_type, note } })`, where `checkin_id` is the check-in shown (or `null`), and `note` is exactly as typed (all-blank → `null`).
  - `200 { request_id, created_at }` → if opened from the prompt, insert `prompt_events { outcome: 'request_sent' }` for `promptCheckinId` (background, owner-only); then go to `/request/sent` with `state = { requestId, createdAt }`.
  - `409` → P07-D7 message ("Your latest check-in changed since this page opened. Look at what will be shared again, then tick the box and send."), tick cleared, answers reloaded.
  - `403` → "This account cannot send a support request. If you need help now, use Where to get help."
  - anything else, or no answer in 20 s → **failure state** (3.2).
- States: loading; ready; incomplete (Send disabled); sending (spinner); failure; stale; not allowed; offline (banner).
- Data: reads `checkins (id, created_at, c1, c2, c3, c4)` latest own row (never the note); calls `submit-support-request`; writes `prompt_events` (only `request_sent`, only from the prompt).
- Copy keys: `request.*`.

### 3.2 Failure state (Fig 17) — inside `/request`

- Shown above the cards after a failed send (role `alert`): dark strip "Not sent", pause icon, "We could not send your request. Nothing was sent.", "Your note is still here on this page. You can try sending it again, or visit the guidance office in person.", "Guidance office: {location} • {hours}" (placeholders), button "Try sending again".
- Under the form: "Your note stays on this page until you send it or leave. It is not saved on this device." The main button reads "Try sending again".
- Below the form: "Need help right now?" card with "You do not need to wait for this form." and the hotlines.
- Everything typed stays exactly as it was.

### 3.3 Sent — `/request/sent`

- Requirement: 2.1.6.4.7. Guard: `RequireStudent tier2`. Component: `RequestSentPage`. Opened without `state.requestId` → redirect to `/request`.
- Chip "Request sent"; h1 "Your request was sent"; "The guidance office can now see your request. Someone from the office will follow up with you at school."; if the office was closed at `createdAt`: "The office is closed right now, so your request will be seen from {weekday, date}."; "Ref xxxxxxxx • Sent {time}"; "Your check-ins stay private. Only what was listed on the request screen was shared."; "Back to home", "Go to my check-in"; hotlines card.
- Never shows a priority, band, score, or queue position.

---

## 4. Edge Function: `submit-support-request`

| Called by | JWT | Reads (as the student) | Writes (service client, the only one) | Returns |
|---|---|---|---|---|
| `/request` | required | `auth.getUser()`; latest own `checkins (id, c1..c4)` | `create_support_request()` — inserts `support_requests` and `triage_decisions` in one transaction; the database builds `disclosed` (N-02) | `{ request_id, created_at }` only |

- Input is exactly `{ checkin_id: uuid | null, concern_type, note: string ≤ 2000 | null }`; any other field → `400`.
- `checkin_id` must equal the latest check-in (or `null` when there is none) → else `409 stale_checkin`.
- Decision: `triage()` from `saw.js` with `scoring-config.js`. No check-in → `FR`, score `null`. The rule snapshot `{ fired, weights, thresholds, grayZoneHalfWidth, provisional }` is stored in `triage_decisions.guardrails` (N-06).
- Database errors: `40001` → `409`; `42501` / `P0002` (no consent, not a student) → `403 not_allowed`; anything else → `500 save_failed`. Never a raw message. Never log the body.

## 5. `scripts/ahp.js` (for the scoring session, 2.2.2.2)

```bash
node scripts/ahp.js scripts/ahp.example.json          # Table 7 example
node scripts/ahp.js docs/scoring-session.json         # the raters' real matrices (keep this file off GitHub if your ethics rules require)
```

Prints per rater: weights, the (Aw)/w ratios, λmax, CI, CR (RI 0.90), and accepted / re-elicit (CR < 0.10). Then the combined weights and a `export const WEIGHTS = …` line. It exits with code 1 if any rater's CR is 0.10 or more. It **never edits** `scoring-config.js`: a person pastes the line, and sets `PROVISIONAL = false` only when the thresholds are also decided.

---

## 6. Who can see or do what

| Action | Tier 2 student | Guidance / Administrator | Signed out |
|---|---|---|---|
| Open `/request`, `/request/sent` | yes | sent to own home | `/login` |
| Send a request | own, through the function | `403` (not a student) | `401` |
| Read `support_requests` / `triage_decisions` | **never** | guidance only (Phase 08) | never |
| See own priority or score | **never** | — | — |

---

## 7. Build steps

### Step 1 — Manila time and school days

**`src/lib/time.js`**

```js
// Manila time and school days (00 Section 6.2; 2.1.7.3; 2.1.3.8). Pure functions; every one takes
// `site` so tests can pass other hours and holidays. Placeholders in SITE are treated as unknown:
// hours that are not "HH:MM" are ignored, and holiday entries that are not "YYYY-MM-DD" are ignored.
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../config/site.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:00" -> 480. Anything else (including a placeholder) -> null. */
export function parseHHMM(value) {
  const m = HHMM.exec(value ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Holiday dates that are real YYYY-MM-DD values. */
export function holidaySet(site = SITE) {
  return new Set(site.holidays.filter((d) => ISO_DATE.test(d)));
}

/** True once the guidance office has filled in at least one holiday date. */
export function holidaysConfigured(site = SITE) {
  return holidaySet(site).size > 0;
}

function inManila(value) {
  return new TZDate(new Date(value).getTime(), SITE.timeZone);
}

/** The Manila calendar date of a moment, "YYYY-MM-DD". */
export function manilaDate(value) {
  return format(inManila(value), 'yyyy-MM-dd');
}

function addIsoDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday of a "YYYY-MM-DD" date: Monday = 1 ... Sunday = 7. */
function isoWeekday(iso) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function isSchoolDay(iso, site = SITE) {
  return site.schoolDays.includes(isoWeekday(iso)) && !holidaySet(site).has(iso);
}

/** The first school day strictly after `iso`. */
export function nextSchoolDay(iso, site = SITE) {
  let d = addIsoDays(iso, 1);
  for (let i = 0; i < 400 && !isSchoolDay(d, site); i += 1) d = addIsoDays(d, 1);
  return d;
}

/**
 * Is the office open now? 'open' | 'closed' | 'unknown'.
 * Weekends and holidays are 'closed'. On a school day the answer is 'unknown' until the office
 * hours in SITE are real "HH:MM" values.
 */
export function officeStatus(now = new Date(), site = SITE) {
  if (!isSchoolDay(manilaDate(now), site)) return 'closed';
  const opens = parseHHMM(site.officeOpens);
  const closes = parseHHMM(site.officeCloses);
  if (opens == null || closes == null) return 'unknown';
  const m = inManila(now);
  const minutes = m.getHours() * 60 + m.getMinutes();
  return minutes >= opens && minutes < closes ? 'open' : 'closed';
}

/** The school day on which a request sent at `at` is first seen (2.1.7.3). */
export function firstSchoolDayFor(at, site = SITE) {
  const day = manilaDate(at);
  if (!isSchoolDay(day, site)) return nextSchoolDay(day, site);
  const closes = parseHHMM(site.officeCloses);
  if (closes != null) {
    const m = inManila(at);
    if (m.getHours() * 60 + m.getMinutes() >= closes) return nextSchoolDay(day, site);
  }
  return day;
}

/**
 * The last school day by which a first contact is due (2.1.3.8: "no other request may wait more
 * than three school days for a first contact"): the third school day, counting the day the
 * request is first seen as day one.
 */
export function firstContactDueDate(at, site = SITE) {
  let d = firstSchoolDayFor(at, site);
  for (let i = 1; i < 3; i += 1) d = nextSchoolDay(d, site);
  return d;
}

/** True when there is still no first contact and the due school day has ended (Manila date). */
export function isFirstContactLate(createdAt, firstContactAt, now = new Date(), site = SITE) {
  if (firstContactAt) return false;
  return manilaDate(now) > firstContactDueDate(createdAt, site);
}

/** "Monday, 12 October 2026" for a "YYYY-MM-DD" school date. */
export function formatSchoolDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return format(new TZDate(Date.UTC(y, m - 1, d, 12), 'UTC'), 'EEEE, d MMMM yyyy');
}
```

**`src/lib/time.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  firstContactDueDate,
  firstSchoolDayFor,
  formatSchoolDate,
  holidaysConfigured,
  isFirstContactLate,
  isSchoolDay,
  manilaDate,
  nextSchoolDay,
  officeStatus,
  parseHHMM,
} from './time.js';
import { SITE } from '../config/site.js';

// 12 Oct 2026 is a Monday. Manila is UTC+8.
const site = {
  ...SITE,
  officeOpens: '08:00',
  officeCloses: '17:00',
  holidays: ['2026-10-14'],
};
const manila = (date, hhmm) => new Date(`${date}T${hhmm}:00+08:00`);

describe('time.js (2.1.7.3; 2.1.3.8)', () => {
  it('reads HH:MM and ignores placeholders', () => {
    expect(parseHHMM('08:30')).toBe(510);
    expect(parseHHMM('[[GUIDANCE:office_opens_hhmm]]')).toBeNull();
    expect(holidaysConfigured(SITE)).toBe(false);
    expect(holidaysConfigured(site)).toBe(true);
  });

  it('uses the Manila calendar date', () => {
    expect(manilaDate('2026-10-11T17:00:00Z')).toBe('2026-10-12'); // 1 AM Monday in Manila
  });

  it('knows school days, weekends, and holidays', () => {
    expect(isSchoolDay('2026-10-12', site)).toBe(true);
    expect(isSchoolDay('2026-10-17', site)).toBe(false); // Saturday
    expect(isSchoolDay('2026-10-14', site)).toBe(false); // holiday
    expect(nextSchoolDay('2026-10-16', site)).toBe('2026-10-19'); // Friday -> Monday
    expect(nextSchoolDay('2026-10-13', site)).toBe('2026-10-15'); // skips the holiday
  });

  it('says open, closed, or unknown', () => {
    expect(officeStatus(manila('2026-10-12', '09:00'), site)).toBe('open');
    expect(officeStatus(manila('2026-10-12', '18:30'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-17', '09:00'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-12', '09:00'), SITE)).toBe('unknown');
    expect(officeStatus(manila('2026-10-17', '09:00'), SITE)).toBe('closed');
  });

  it('starts the clock on the next school day after hours, weekends, and holidays', () => {
    expect(firstSchoolDayFor(manila('2026-10-12', '10:00'), site)).toBe('2026-10-12');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), site)).toBe('2026-10-13');
    expect(firstSchoolDayFor(manila('2026-10-17', '10:00'), site)).toBe('2026-10-19');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), SITE)).toBe('2026-10-12'); // hours unknown
  });

  it('first contact is due by the third school day', () => {
    expect(firstContactDueDate(manila('2026-10-12', '10:00'), site)).toBe('2026-10-15'); // Mon, Tue, (holiday), Thu
    expect(firstContactDueDate(manila('2026-10-16', '10:00'), site)).toBe('2026-10-20'); // Fri, Mon, Tue
  });

  it('is late only after the due day ends and only with no first contact', () => {
    const at = manila('2026-10-16', '10:00');
    expect(isFirstContactLate(at, null, manila('2026-10-20', '16:00'), site)).toBe(false);
    expect(isFirstContactLate(at, null, manila('2026-10-21', '08:00'), site)).toBe(true);
    expect(
      isFirstContactLate(at, '2026-10-16T05:00:00Z', manila('2026-10-30', '08:00'), site),
    ).toBe(false);
  });

  it('formats a school date', () => {
    expect(formatSchoolDate('2026-10-19')).toBe('Monday, 19 October 2026');
  });
});
```

### Step 2 — `submit-support-request`

**`supabase/functions/submit-support-request/handler.js`**

```js
// submit-support-request (2.1.5.1.6, 2.1.6.1.4, 2.1.6.4.5, 2.1.6.4.7; Equation 1; Tables 9-10).
// 1. Reads the caller's own latest check-in AS THE STUDENT (RLS, owner only).
// 2. Refuses if the browser showed a different check-in than the latest (the student must see
//    exactly what is shared, 2.1.5.1.6).
// 3. Computes the triage decision with saw.js (server-side, 2.1.6.1.4).
// 4. Saves the request and the decision in ONE database transaction through
//    create_support_request() with the service client. This is the only service-client write.
// Returns only { request_id, created_at }: never the score, band, or rule (00 must-never 4).
// Never log the request body: it holds the student's note.
import { bearer, makeHttp, readJson } from '../_shared/http.js';
import { triage } from '../_shared/saw.js';

const CONCERNS = ['academic', 'peer', 'family', 'wellness'];

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, makeServiceClient: () => object,
 *   config: object, allowedOrigin?: string }} deps
 */
export function makeSubmitSupportRequest({
  z,
  makeUserClient,
  makeServiceClient,
  config,
  allowedOrigin = '*',
}) {
  const http = makeHttp(allowedOrigin);
  const Input = z
    .object({
      checkin_id: z.guid().nullable(),
      concern_type: z.enum(CONCERNS),
      note: z.string().max(2000).nullable(),
    })
    .strict();
  const Rating = z.number().int().min(1).max(5);
  const Checkin = z.object({ id: z.guid(), c1: Rating, c2: Rating, c3: Rating, c4: Rating });
  const Saved = z.object({ request_id: z.guid(), created_at: z.string() });

  return async function submit(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    const db = makeUserClient(auth);
    const who = await db.auth.getUser(auth.replace(/^Bearer\s+/, ''));
    const userId = who?.data?.user?.id;
    if (who?.error || !userId) return http.json({ error: 'unauthorized' }, 401);

    // The student's own latest check-in, read through RLS (staff get none).
    const latest = await db
      .from('checkins')
      .select('id, c1, c2, c3, c4')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return http.json({ error: 'save_failed' }, 500);
    let checkin = null;
    if (latest.data) {
      const parsed = Checkin.safeParse(latest.data);
      if (!parsed.success) return http.json({ error: 'save_failed' }, 500);
      checkin = parsed.data;
    }
    if ((checkin?.id ?? null) !== input.data.checkin_id) {
      return http.json({ error: 'stale_checkin' }, 409);
    }

    const decision = triage(checkin, config); // no check-in -> For Review with no score
    const { data, error } = await makeServiceClient().rpc('create_support_request', {
      p_student_id: userId,
      p_checkin_id: checkin?.id ?? null,
      p_note: input.data.note,
      p_concern_type: input.data.concern_type,
      p_score: decision.score,
      p_band: decision.band,
      p_guardrails: decision.guardrails,
    });
    if (error) {
      if (error.code === '40001') return http.json({ error: 'stale_checkin' }, 409);
      if (error.code === '42501' || error.code === 'P0002') {
        return http.json({ error: 'not_allowed' }, 403);
      }
      return http.json({ error: 'save_failed' }, 500);
    }
    const saved = Saved.safeParse(data);
    if (!saved.success) return http.json({ error: 'save_failed' }, 500);
    return http.json(saved.data);
  };
}
```

**`supabase/functions/submit-support-request/index.js`**

```js
// Deno entry point for submit-support-request (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import * as config from '../_shared/scoring-config.js';
import { makeServiceClient, makeUserClient } from '../_shared/clients.js';
import { makeSubmitSupportRequest } from './handler.js';

Deno.serve(
  makeSubmitSupportRequest({
    z,
    makeUserClient,
    makeServiceClient,
    config,
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);
```

**`supabase/functions/submit-support-request/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeSubmitSupportRequest } from './handler.js';

const UID = '11111111-1111-4111-8111-111111111111';
const CID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function setup({
  user = { data: { user: { id: UID } }, error: null },
  latest = { data: { id: CID, c1: 5, c2: 5, c3: 1, c4: 1 }, error: null },
  rpc = { data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null },
} = {}) {
  const calls = [];
  const q = {
    select: (...a) => (calls.push(['select', ...a]), q),
    order: (...a) => (calls.push(['order', ...a]), q),
    limit: (...a) => (calls.push(['limit', ...a]), q),
    maybeSingle: async () => latest,
  };
  const userClient = {
    auth: { getUser: vi.fn(async () => user) },
    from: (t) => (calls.push(['from', t]), q),
  };
  const service = { rpc: vi.fn(async () => rpc) };
  const makeUserClient = vi.fn(() => userClient);
  const makeServiceClient = vi.fn(() => service);
  const handler = makeSubmitSupportRequest({ z, makeUserClient, makeServiceClient, config });
  return { handler, calls, service, makeServiceClient, userClient };
}

const post = (body, auth = 'Bearer student-jwt') =>
  new Request('http://local/submit-support-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const BODY = { checkin_id: CID, concern_type: 'academic', note: 'my own words' };

describe('submit-support-request (2.1.5.1.6; 2.1.6.1.4)', () => {
  it('needs a JWT and an exact body', async () => {
    const { handler, makeServiceClient } = setup();
    expect((await handler(post(BODY, null))).status).toBe(401);
    expect((await handler(post({ ...BODY, band: 'P1' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, concern_type: 'future' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, note: 'x'.repeat(2001) }))).status).toBe(400);
    expect(makeServiceClient).not.toHaveBeenCalled();
  });

  it('reads the latest check-in as the student', async () => {
    const { handler, calls, userClient } = setup();
    await handler(post(BODY));
    expect(userClient.auth.getUser).toHaveBeenCalledWith('student-jwt');
    expect(calls).toEqual([
      ['from', 'checkins'],
      ['select', 'id, c1, c2, c3, c4'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
  });

  it('refuses when the student was shown a different check-in than the latest', async () => {
    const { handler, service } = setup();
    const res = await handler(post({ ...BODY, checkin_id: null }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'stale_checkin' });
    expect(service.rpc).not.toHaveBeenCalled();
  });

  it('saves the SAW decision server-side and returns only the reference', async () => {
    const { handler, service } = setup();
    const res = await handler(post(BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ request_id: RID, created_at: '2026-10-12T01:00:00Z' });
    const [name, args] = service.rpc.mock.calls[0];
    expect(name).toBe('create_support_request');
    expect(args).toMatchObject({
      p_student_id: UID,
      p_checkin_id: CID,
      p_note: 'my own words',
      p_concern_type: 'academic',
      p_score: 3.8588, // manuscript worked example (5, 5, 1, 1)
      p_band: 'P1',
    });
    expect(args.p_guardrails).toEqual({
      fired: ['anySingleAtMax', 'twoOrMoreHigh'],
      weights: { ...config.WEIGHTS },
      thresholds: { ...config.THRESHOLDS },
      grayZoneHalfWidth: config.GRAY_ZONE_HALF_WIDTH,
      provisional: config.PROVISIONAL,
    });
  });

  it('with no check-in, sends For Review with no score', async () => {
    const { handler, service } = setup({ latest: { data: null, error: null } });
    const res = await handler(post({ ...BODY, checkin_id: null, note: null }));
    expect(res.status).toBe(200);
    expect(service.rpc.mock.calls[0][1]).toMatchObject({
      p_checkin_id: null,
      p_score: null,
      p_band: 'FR',
      p_note: null,
    });
  });

  it.each([
    ['40001', 409, 'stale_checkin'],
    ['42501', 403, 'not_allowed'],
    ['P0002', 403, 'not_allowed'],
    ['XX000', 500, 'save_failed'],
  ])('maps database error %s to %i %s, never a raw message', async (code, status, error) => {
    const { handler } = setup({ rpc: { data: null, error: { code, message: 'secret detail' } } });
    const res = await handler(post(BODY));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });
});
```

Append to `supabase/config.toml` (change nothing else), then restart `npx supabase functions serve --env-file supabase/functions/.env`:

```toml
# ---- Phase 07 ----
[functions.submit-support-request]
enabled = true
verify_jwt = true
entrypoint = "./functions/submit-support-request/index.js"
```

### Step 3 — AHP calculator

**`scripts/ahp.js`**

```js
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
```

**`scripts/ahp.example.json`** — Table 7 placeholder judgments, not real ratings

```json
{
  "note": "Manuscript Table 7: illustrative placeholder judgments, NOT real ratings. Replace with each rater's matrix after the scoring session.",
  "raters": [
    {
      "name": "Table 7 illustrative rater",
      "matrix": [
        ["1", "1/2", "2", "2"],
        ["2", "1", "3", "3"],
        ["1/2", "1/3", "1", "1/2"],
        ["1/2", "1/3", "2", "1"]
      ]
    }
  ]
}
```

**`scripts/ahp.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyse, combine, parseEntry, toMatrix, weightsFrom, weightsLine } from './ahp.js';
import { WEIGHTS } from '../supabase/functions/_shared/scoring-config.js';

const example = JSON.parse(readFileSync('scripts/ahp.example.json', 'utf8'));

describe('scripts/ahp.js (2.2.2.2; N-04)', () => {
  it('reproduces the Table 7 worked example', () => {
    const { raters, combined } = analyse(example);
    const r = raters[0];
    expect(r.weights).toEqual([0.2616, 0.4531, 0.1182, 0.1671]);
    expect(r.lambdaMax).toBe(4.0709);
    expect(r.ci).toBe(0.0236);
    expect(r.cr).toBe(0.0262);
    expect(r.acceptable).toBe(true);
    // N-04: the recomputed ratios (the manuscript prints 4.0472, 4.0437, 4.0912, 4.1013)
    expect(r.ratios).toEqual([4.0475, 4.0439, 4.0917, 4.1004]);
    expect(combined).toEqual(r.weights);
  });

  it('matches the provisional weights in scoring-config.js', () => {
    expect(analyse(example).combined).toEqual([WEIGHTS.c1, WEIGHTS.c2, WEIGHTS.c3, WEIGHTS.c4]);
  });

  it('gives CR 0.0265 with RI 0.89', () => {
    expect(analyse(example, 0.89).raters[0].cr).toBe(0.0265);
  });

  it('combining two raters equals the geometric mean of their judgments', () => {
    const a = toMatrix(example.raters[0].matrix);
    const b = toMatrix([
      [1, 1, 3, 2],
      [1, 1, 2, 2],
      ['1/3', '1/2', 1, 1],
      ['1/2', '1/2', 1, 1],
    ]);
    const c = combine([a, b]);
    expect(c[0][1]).toBeCloseTo(Math.sqrt(0.5 * 1), 12);
    expect(c[1][0] * c[0][1]).toBeCloseTo(1, 12);
    const w = weightsFrom(c);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
  });

  it('rejects a matrix that is not reciprocal or not 4x4', () => {
    expect(() =>
      toMatrix([
        [1, 2],
        [0.5, 1],
      ]),
    ).toThrow(/4 rows/);
    expect(() =>
      toMatrix([
        [1, 2, 1, 1],
        [2, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ]),
    ).toThrow(/reciprocals/);
    expect(() => parseEntry('two')).toThrow();
  });

  it('flags a rater whose CR is 0.10 or more', () => {
    const bad = analyse({
      raters: [
        {
          name: 'inconsistent',
          matrix: [
            [1, 9, '1/9', 9],
            ['1/9', 1, 9, '1/9'],
            [9, '1/9', 1, 9],
            ['1/9', 9, '1/9', 1],
          ],
        },
      ],
    });
    expect(bad.raters[0].acceptable).toBe(false);
  });

  it('prints a WEIGHTS line in the scoring-config.js shape', () => {
    expect(weightsLine([0.2616, 0.4531, 0.1182, 0.1671])).toBe(
      'export const WEIGHTS = Object.freeze({ c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 });',
    );
  });
});
```

### Step 4 — Copy

**`src/copy/en/request.js`**

```js
// Phase 07 copy: ask the guidance office (Fig 16), failure state (Fig 17), and sent (2.1.6.4.7).
// D-10, D-11, D-12, D-20, D-23 rewrites.
export const requestCopy = {
  chip: 'Voluntary request • {school}',
  title: 'Ask the guidance office for support',
  lead: 'Reaching out is always your choice. Here is exactly what is shared before you send anything.',
  will: {
    title: 'What the guidance office will see',
    name: 'Your name',
    grade: 'Your grade level',
    gradeValue: 'Grade {grade}',
    section: 'Your section',
    adviser: 'Your class adviser',
    answers: 'Your four answers from your latest check-in on {date}',
    noAnswers: 'You have no check-in yet, so no answers are shared.',
    concern: 'The kind of concern you choose below',
    note: 'Anything you write in the note below',
    when: 'That you asked for support, and when you sent it',
  },
  wont: {
    title: 'What they will not see',
    checkins:
      'Your private check-ins on other days, your mood and stress answers, and your check-in notes.',
    trends: 'Your trends and the guides you opened.',
    footer: 'Your check-ins stay private to you. Staff cannot browse them.',
  },
  concern: {
    label: 'What is this mostly about?',
    placeholder: 'Choose one',
    hint: 'This helps the guidance office know what to expect. It does not decide anything.',
    required: 'Choose what this is mostly about.',
  },
  note: {
    label: 'Is there anything you want them to know? (optional)',
    placeholder: 'You can write a short note here, or leave this blank. Take your time...',
    hint: 'The guidance office will read this when they open your request. It is stored as you write it and never analysed.',
  },
  hours: {
    general:
      'Requests sent outside school hours, on weekends, or during school breaks wait for the next school day.',
    closedNow: 'The guidance office is closed right now. Your request will be seen from {date}.',
  },
  ack: {
    withAnswers:
      'I understand that my name, grade level, section, class adviser, my four latest check-in answers, the kind of concern, and my note will be shared with the guidance office.',
    withoutAnswers:
      'I understand that my name, grade level, section, class adviser, the kind of concern, and my note will be shared with the guidance office.',
  },
  toSend: 'To send, choose what this is mostly about and tick the box above.',
  send: 'Send request',
  cancel: 'Cancel',
  loadError: 'We could not load what will be shared, so nothing can be sent yet.',
  stale:
    'Your latest check-in changed since this page opened. Look at what will be shared again, then tick the box and send.',
  notAllowed:
    'This account cannot send a support request. If you need help now, use Where to get help.',
  failure: {
    strip: 'Not sent',
    title: 'We could not send your request. Nothing was sent.',
    body: 'Your note is still here on this page. You can try sending it again, or visit the guidance office in person.',
    where: 'Guidance office: {location} • {hours}',
    retry: 'Try sending again',
    kept: 'Your note stays on this page until you send it or leave. It is not saved on this device.',
  },
  urgent: {
    title: 'Need help right now?',
    body: 'You do not need to wait for this form.',
  },
  sent: {
    chip: 'Request sent',
    title: 'Your request was sent',
    body: 'The guidance office can now see your request. Someone from the office will follow up with you at school.',
    reference: '{ref} • Sent {time}',
    closedNow: 'The office is closed right now, so your request will be seen from {date}.',
    privacy: 'Your check-ins stay private. Only what was listed on the request screen was shared.',
    home: 'Back to home',
    checkin: 'Go to my check-in',
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
import { requestCopy } from './request.js';

export const sections = {
  public: publicCopy,
  assent: assentCopy,
  waiting: waitingCopy,
  checkin: checkinCopy,
  crisis: crisisCopy,
  trends: trendsCopy,
  resources: resourcesCopy,
  request: requestCopy,
};
```

### Step 5 — Screens

**`src/features/requests/useRequestPreview.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * The student's own latest check-in, shown on the request screen so the student sees exactly
 * which answers will be shared (2.1.5.1.6; D-10). Owner-only RLS. Never reads the note.
 * @returns {{ status: 'loading'|'error'|'ready', checkin: object|null, reload: () => void }}
 */
export function useRequestPreview(owner) {
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', checkin: null });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('checkins')
      .select('id, created_at, c1, c2, c3, c4')
      .eq('student_id', owner)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setState({
          key,
          status: error ? 'error' : 'ready',
          checkin: error ? null : (data ?? null),
        });
      });
    return () => {
      active = false;
    };
  }, [owner, key]);

  if (state.key !== key) return { status: 'loading', checkin: null, reload };
  return { status: state.status, checkin: state.checkin, reload };
}
```

**`src/features/requests/RequestPage.jsx`**

```jsx
// Fig 16 + Fig 17 · ask the guidance office (2.1.5.1.6, 2.1.6.4.5, 2.1.6.4.7, 2.1.7.3;
// D-10, D-11, D-12, D-13, D-20, D-23; P07-D1..D8).
// The student sees exactly what will be shared, with the real values, before anything is sent.
// Sending goes through submit-support-request, which computes the triage decision on the server.
// The note lives only in this page's memory and survives a failed send.
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  CircleCheck,
  EyeOff,
  Eye,
  Lock,
  PauseCircle,
  RotateCw,
  ArrowRight,
  Info,
} from 'lucide-react';
import { t } from '../../copy/index.js';
import { SITE } from '../../config/site.js';
import { ANSWER_SCALE, CONCERN_TYPES, labelFor } from '../../config/vocabulary.js';
import { CHECKIN_ITEMS, tappedValue } from '../../config/checkin-items.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { formatDate } from '../../lib/format.js';
import { firstSchoolDayFor, formatSchoolDate, officeStatus } from '../../lib/time.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { HotlineList } from '../public/HotlineList.jsx';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';
import { useRequestPreview } from './useRequestPreview.js';

const CRITERION_ITEMS = CHECKIN_ITEMS.slice(0, 4); // c1..c4: the only answers that are shared
export const SEND_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: null, error: { timeout: true } }), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function RequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, account } = useAuth();
  const owner = session.user.id;
  const preview = useRequestPreview(owner);
  const [concern, setConcern] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | sending | failed | stale | notAllowed
  const prompt = location.state?.promptCheckinId ? location.state : null;

  const now = new Date();
  const closedNow = officeStatus(now) === 'closed';
  const ready = preview.status === 'ready';
  const checkin = preview.checkin;
  const canSend = ready && concern !== '' && ack && phase !== 'sending' && phase !== 'notAllowed';

  const onSend = async () => {
    if (!canSend && phase !== 'failed') return;
    setPhase('sending');
    const body = {
      checkin_id: checkin?.id ?? null,
      concern_type: concern,
      note: note.trim() === '' ? null : note,
    };
    const { data, error } = await withTimeout(
      supabase.functions.invoke('submit-support-request', { body }),
      SEND_TIMEOUT_MS,
    );
    if (!error && data?.request_id) {
      if (prompt) {
        // The prompt led to a request (Table 19). Owner-only; never shown to staff.
        supabase
          .from('prompt_events')
          .insert({
            student_id: owner,
            checkin_id: prompt.promptCheckinId,
            type: prompt.promptType,
            outcome: 'request_sent',
          })
          .then(({ error: e }) => {
            if (e && import.meta.env.DEV) console.error('prompt_events insert failed');
          });
      }
      navigate('/request/sent', {
        replace: true,
        state: { requestId: data.request_id, createdAt: data.created_at },
      });
      return;
    }
    const status = error?.context?.status;
    if (status === 409) {
      setAck(false);
      preview.reload();
      setPhase('stale');
    } else if (status === 403) {
      setPhase('notAllowed');
    } else {
      setPhase('failed');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip tone="strong" className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('request.chip', { school: SITE.schoolName })}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('request.title')}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">{t('request.lead')}</p>
      </header>

      {phase === 'failed' && <FailureNotice onRetry={onSend} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card aria-labelledby="will-see" className="flex flex-col gap-3">
          <h2 id="will-see" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <Eye aria-hidden="true" className="size-5" />
            {t('request.will.title')}
          </h2>
          {preview.status === 'loading' && <Skeleton lines={6} />}
          {preview.status === 'error' && (
            <ErrorState body={t('request.loadError')} onRetry={preview.reload} />
          )}
          {ready && <WillSee account={account} checkin={checkin} />}
        </Card>
        <Card aria-labelledby="wont-see" className="flex flex-col gap-3 bg-surface-muted">
          <h2 id="wont-see" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <EyeOff aria-hidden="true" className="size-5" />
            {t('request.wont.title')}
          </h2>
          <ul className="flex flex-col gap-2 text-[15px] text-ink">
            <li className="flex gap-2">
              <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
              {t('request.wont.checkins')}
            </li>
            <li className="flex gap-2">
              <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
              {t('request.wont.trends')}
            </li>
          </ul>
          <p className="rounded-control bg-surface p-3 text-[14px] text-ink-muted">
            {t('request.wont.footer')}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-5">
        <Field id="concern" label={t('request.concern.label')} hint={t('request.concern.hint')}>
          <Select
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder={t('request.concern.placeholder')}
            options={CONCERN_TYPES}
            required
          />
        </Field>
        <Field id="request-note" label={t('request.note.label')} hint={t('request.note.hint')}>
          <Textarea
            value={note}
            placeholder={t('request.note.placeholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1 rounded-control bg-blush p-3 text-[14px] text-ink">
          <p className="flex gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('request.hours.general')}
              {closedNow && (
                <>
                  {' '}
                  {t('request.hours.closedNow', {
                    date: formatSchoolDate(firstSchoolDayFor(now)),
                  })}
                </>
              )}
            </span>
          </p>
        </div>

        {phase === 'stale' && <FormMessage>{t('request.stale')}</FormMessage>}
        {phase === 'notAllowed' && <FormMessage>{t('request.notAllowed')}</FormMessage>}

        <div className="rounded-control bg-surface-muted px-3">
          <Checkbox
            id="ack"
            label={checkin ? t('request.ack.withAnswers') : t('request.ack.withoutAnswers')}
            checked={ack}
            onChange={setAck}
            disabled={!ready}
          />
        </div>
        {!(concern && ack) && <p className="text-[14px] text-ink-muted">{t('request.toSend')}</p>}
        {phase === 'failed' && (
          <p className="text-[13px] text-ink-muted">{t('request.failure.kept')}</p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('request.cancel')}
          </Button>
          <Button
            size="lg"
            onClick={onSend}
            disabled={!canSend}
            loading={phase === 'sending'}
            iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
          >
            {phase === 'failed' ? t('request.failure.retry') : t('request.send')}
          </Button>
        </div>
      </Card>

      {phase === 'failed' && (
        <Card as="aside" aria-labelledby="urgent" className="flex flex-col gap-3 bg-surface-muted">
          <h2 id="urgent" className="text-[17px] font-semibold text-ink">
            {t('request.urgent.title')}
          </h2>
          <p className="text-[14px] text-ink-muted">{t('request.urgent.body')}</p>
          <HotlineList />
        </Card>
      )}
      <EmergencyNotice />
    </div>
  );
}

function WillSee({ account, checkin }) {
  const rows = [
    [t('request.will.name'), account.full_name],
    [t('request.will.grade'), t('request.will.gradeValue', { grade: account.grade_level })],
    [t('request.will.section'), account.section],
    [t('request.will.adviser'), account.class_adviser],
  ];
  return (
    <div className="flex flex-col gap-3 text-[15px] text-ink">
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-2">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
              {label}:
            </dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="flex items-center gap-2 text-ink-muted">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
          {checkin
            ? t('request.will.answers', { date: formatDate(checkin.created_at) })
            : t('request.will.noAnswers')}
        </p>
        {checkin && (
          <ul className="mt-2 flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-[14px]">
            {CRITERION_ITEMS.map((item) => (
              <li key={item.column}>
                {t(item.textKey)}{' '}
                <strong>{labelFor(ANSWER_SCALE, tappedValue(item, checkin[item.column]))}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="flex flex-col gap-2 text-ink-muted">
        {['request.will.concern', 'request.will.note', 'request.will.when'].map((k) => (
          <li key={k} className="flex items-center gap-2">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
            {t(k)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FailureNotice({ onRetry }) {
  return (
    <section role="alert" className="overflow-hidden rounded-card border-2 border-ink bg-surface">
      <p className="bg-action px-4 py-2 text-[13px] font-semibold uppercase tracking-wide text-action-ink">
        {t('request.failure.strip')}
      </p>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <PauseCircle aria-hidden="true" className="size-6 shrink-0 text-ink" />
        <div className="flex-1">
          <p className="font-semibold text-ink">{t('request.failure.title')}</p>
          <p className="mt-1 text-[15px] text-ink">{t('request.failure.body')}</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            {t('request.failure.where', {
              location: SITE.officeLocation,
              hours: SITE.officeHoursText,
            })}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRetry}
          iconLeft={<RotateCw aria-hidden="true" className="size-4" />}
        >
          {t('request.failure.retry')}
        </Button>
      </div>
    </section>
  );
}
```

**`src/features/requests/RequestSentPage.jsx`**

```jsx
// 2.1.6.4.7 · shown only after the database has saved the request (the server answered with its
// id). Opened any other way, it sends the student back to /request.
import { Navigate, useLocation } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { formatDateTime, shortRef } from '../../lib/format.js';
import { firstSchoolDayFor, formatSchoolDate, officeStatus } from '../../lib/time.js';
import { Card, Chip, LinkButton } from '../../components/ui/index.js';
import { HotlineList } from '../public/HotlineList.jsx';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';

export function RequestSentPage() {
  const location = useLocation();
  const sent = location.state;
  if (!sent?.requestId) return <Navigate to="/request" replace />;
  const closed = officeStatus(new Date(sent.createdAt)) === 'closed';
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <Chip className="self-start">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t('request.sent.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink">{t('request.sent.title')}</h1>
        <p role="status" className="text-base text-ink">
          {t('request.sent.body')}
        </p>
        {closed && (
          <p className="text-[15px] text-ink">
            {t('request.sent.closedNow', {
              date: formatSchoolDate(firstSchoolDayFor(sent.createdAt)),
            })}
          </p>
        )}
        <p className="text-[14px] text-ink-muted">
          {t('request.sent.reference', {
            ref: shortRef(sent.requestId),
            time: formatDateTime(sent.createdAt),
          })}
        </p>
        <p className="text-[14px] text-ink-muted">{t('request.sent.privacy')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/">{t('request.sent.home')}</LinkButton>
          <LinkButton to="/check-in" variant="outline">
            {t('request.sent.checkin')}
          </LinkButton>
        </div>
      </Card>
      <Card as="aside" aria-labelledby="urgent-sent" className="flex flex-col gap-3">
        <h2 id="urgent-sent" className="text-[17px] font-semibold text-ink">
          {t('request.urgent.title')}
        </h2>
        <HotlineList />
        <EmergencyNotice />
      </Card>
    </div>
  );
}
```

### Step 6 — Routes

`/request` and `/request/sent` now point at the real screens.

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
import { RequestPage } from './features/requests/RequestPage.jsx';
import { RequestSentPage } from './features/requests/RequestSentPage.jsx';

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
          <Route path="request" element={<RequestPage />} />
          <Route path="request/sent" element={<RequestSentPage />} />
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

**`src/features/requests/request.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, within } from '@testing-library/react';
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
const { RequestPage, SEND_TIMEOUT_MS } = await import('./RequestPage.jsx');
const { RequestSentPage } = await import('./RequestSentPage.jsx');

const UID = '11111111-1111-1111-1111-111111111111';
const CID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CHECKIN = { id: CID, created_at: '2026-10-09T01:00:00Z', c1: 2, c2: 1, c3: 3, c4: 1 };
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });

let queries;
function setup({
  checkin = CHECKIN,
  invoke = [{ data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null }],
} = {}) {
  queries = { checkins: [], prompt_events: [] };
  const c = createMockSupabase();
  c.from.mockImplementation((table) => {
    const q = queryResult(
      table === 'checkins' ? { data: checkin, error: null } : { data: null, error: null },
    );
    queries[table].push(q);
    return q;
  });
  for (const r of invoke) c.functions.invoke.mockResolvedValueOnce(r);
  mock.client = c;
  return c;
}

function renderPage(state) {
  return renderWithAuth(
    [
      <Route key="r" path="/request" element={<RequestPage />} />,
      <Route key="s" path="/request/sent" element={<RequestSentPage />} />,
    ],
    { path: '/request', auth: auth(), state },
  );
}

async function fill(user, { concern = 'School work', note = '' } = {}) {
  await user.selectOptions(screen.getByLabelText('What is this mostly about?'), concern);
  if (note) await user.type(screen.getByLabelText(/Is there anything you want them to know/), note);
  await user.click(screen.getByRole('checkbox'));
}

beforeEach(() => vi.useRealTimers());

describe('RequestPage (Fig 16; 2.1.5.1.6; D-10, D-11)', () => {
  it('shows the real values that will be shared, including the four latest answers as tapped', async () => {
    setup();
    renderPage();
    const will = (
      await screen.findByRole('heading', { name: 'What the guidance office will see' })
    ).closest('section');
    expect(within(will).getByText('Ana Reyes')).toBeInTheDocument();
    expect(within(will).getByText('Grade 12')).toBeInTheDocument();
    expect(within(will).getByText('HUMSS-A')).toBeInTheDocument();
    expect(within(will).getByText('Mr. Ramon Cruz')).toBeInTheDocument();
    expect(
      within(will).getByText('Your four answers from your latest check-in on 9 Oct 2026'),
    ).toBeInTheDocument();
    const answers = within(will)
      .getAllByRole('listitem')
      .slice(0, 4)
      .map((li) => li.textContent);
    expect(answers).toEqual([
      'School work and academic pressure has been affecting me. A little',
      'Things at home, family, or money have been affecting me. Not at all',
      'Worries about graduating, college, or my future have been affecting me. Somewhat',
      'I have been able to manage what I am carrying. Very much',
    ]);
    expect(queries.checkins[0].calls[0]).toEqual(['select', 'id, created_at, c1, c2, c3, c4']);
    expect(
      screen.getByText(
        /I understand that my name, grade level, section, class adviser, my four latest check-in answers/,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/priority|score|P1|P2|P3|scheduled|counselor/i);
  });

  it('says no answers are shared when there is no check-in', async () => {
    setup({ checkin: null });
    renderPage();
    expect(
      await screen.findByText('You have no check-in yet, so no answers are shared.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/the kind of concern, and my note will be shared/)).toBeInTheDocument();
  });

  it('cannot send until a concern is chosen and the box is ticked', async () => {
    setup();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    const send = screen.getByRole('button', { name: 'Send request' });
    expect(send).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText('What is this mostly about?'),
      "Something else about how I'm doing",
    );
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(send).toBeEnabled();
  });

  it('sends the shown check-in id, concern, and note exactly as typed; success only after the server answers', async () => {
    const c = setup();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user, { note: '  please talk to me  ' });
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByRole('heading', { name: 'Your request was sent' }),
    ).toBeInTheDocument();
    expect(c.functions.invoke).toHaveBeenCalledWith('submit-support-request', {
      body: { checkin_id: CID, concern_type: 'academic', note: '  please talk to me  ' },
    });
    expect(screen.getByText(/^Ref 7c9e6679 • Sent/)).toBeInTheDocument();
    expect(queries.prompt_events).toHaveLength(0);
  });

  it('records request_sent for the prompt that led here (Table 19)', async () => {
    setup();
    const user = userEvent.setup();
    renderPage({ promptCheckinId: CID, promptType: 'max_sev' });
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await screen.findByRole('heading', { name: 'Your request was sent' });
    expect(queries.prompt_events[0].calls).toEqual([
      ['insert', { student_id: UID, checkin_id: CID, type: 'max_sev', outcome: 'request_sent' }],
    ]);
  });

  it('on failure says nothing was sent, keeps the note, and retries (Fig 17; 2.1.6.4.5)', async () => {
    const c = setup({
      invoke: [
        { data: null, error: { context: { status: 500 } } },
        { data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null },
      ],
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user, { note: 'keep me' });
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByText('We could not send your request. Nothing was sent.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Is there anything you want them to know/)).toHaveValue('keep me');
    expect(screen.queryByText('Your request was sent')).not.toBeInTheDocument();
    expect(screen.getByText('Need help right now?')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Try sending again' })[0]);
    expect(
      await screen.findByRole('heading', { name: 'Your request was sent' }),
    ).toBeInTheDocument();
    expect(c.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it('a stale check-in reloads what will be shared and asks for the tick again', async () => {
    setup({ invoke: [{ data: null, error: { context: { status: 409 } } }] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByText(/Your latest check-in changed since this page opened/),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(queries.checkins).toHaveLength(2);
  });

  it('a send that never answers becomes a failure, not a success', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = setup({ invoke: [] });
    c.functions.invoke.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS + 10);
    });
    expect(
      screen.getByText('We could not send your request. Nothing was sent.'),
    ).toBeInTheDocument();
  });
});

describe('RequestSentPage', () => {
  afterEach(() => vi.useRealTimers());
  it('opened directly, goes back to /request', () => {
    setup();
    renderWithAuth(
      [
        <Route key="s" path="/request/sent" element={<RequestSentPage />} />,
        <Route key="r" path="/request" element={<p>request form</p>} />,
      ],
      { path: '/request/sent', auth: auth() },
    );
    expect(screen.getByText('request form')).toBeInTheDocument();
  });
});
```

**`e2e/phase-07/request.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND `npx supabase functions serve`. Run right after `npx supabase db reset`
// (the first test expects student.full to have no check-in yet). Adds rows, so it runs once.
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('Phase 07 · support request (Figs 16, 17)', () => {
  test('with no check-in yet, the screen says no answers are shared and the request still sends', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/request');
    await expect(
      page.getByText('You have no check-in yet, so no answers are shared.'),
    ).toBeVisible();
    await expect(page.getByText('Ana Reyes')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByLabel('What is this mostly about?').selectOption('academic');
    await page.getByRole('checkbox').check();
    const sent = page.waitForResponse((r) =>
      r.url().includes('/functions/v1/submit-support-request'),
    );
    await page.getByRole('button', { name: 'Send request' }).click();
    const body = await (await sent).json();
    expect(Object.keys(body).sort()).toEqual(['created_at', 'request_id']); // no score, no band
    await expect(page).toHaveURL(/\/request\/sent$/);
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
    await expect(page.getByText(/^Ref [0-9a-f]{8} • Sent/)).toBeVisible();
  });

  test('from the prompt: the answers shown are the latest check-in, and request_sent is recorded', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    const picks = ['Very much', 'Very much', 'Not at all', 'Not at all', 'Low', 'Quite a lot'];
    const groups = page.getByRole('radiogroup');
    for (let i = 0; i < picks.length; i += 1) {
      await groups.nth(i).getByRole('radio', { name: picks[i], exact: true }).click();
    }
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Continue to send a request' }).click();
    await expect(page).toHaveURL(/\/request$/);
    await expect(
      page.getByText('School work and academic pressure has been affecting me. Very much'),
    ).toBeVisible();
    // Item 4 was answered "Not at all" and is shown exactly as tapped (D-09).
    await expect(
      page.getByText('I have been able to manage what I am carrying. Not at all'),
    ).toBeVisible();
    await page.getByLabel('What is this mostly about?').selectOption('family');
    await page
      .getByLabel(/Is there anything you want them to know/)
      .fill('E2E note, please ignore.');
    await page.getByRole('checkbox').check();
    const recorded = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/prompt_events') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
    expect((await recorded).status()).toBe(201);
  });

  test('a failed send keeps the note and says nothing was sent (Fig 17)', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await page.goto('/request');
    await expect(page.getByText('Ana Reyes')).toBeVisible();
    await page.route('**/functions/v1/submit-support-request', (r) =>
      r.request().method() === 'OPTIONS' ? r.continue() : r.abort('failed'),
    );
    await page.getByLabel('What is this mostly about?').selectOption('peer');
    await page.getByLabel(/Is there anything you want them to know/).fill('keep this text');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('We could not send your request. Nothing was sent.')).toBeVisible();
    await expect(page.getByLabel(/Is there anything you want them to know/)).toHaveValue(
      'keep this text',
    );
    await page.unroute('**/functions/v1/submit-support-request');
    await page.getByRole('button', { name: 'Try sending again' }).first().click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
  });
});
```

Run:

```bash
npm run verify
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-07
```

### Step 8 — Hosted project (after local acceptance)

`npx supabase functions deploy submit-support-request`. It uses the `ALLOWED_ORIGIN` secret from Phase 05; no new secrets.

---

## 8. Must never (this phase)

1. Never send a request before the student has seen the real values and ticked the acknowledgement (2.1.5.1.6).
2. Never send a score, band, or rule from the browser, and never compute triage in `src/`. The function's input schema rejects any extra field.
3. Never return, show, or hint at the score, band, priority, or queue position to the student.
4. Never show "Your request was sent" before the function returns a `request_id` (2.1.6.4.7).
5. Never store the note (or any field) in browser storage; never trim, count, scan, or log it. Blank becomes `null`; nothing else is done.
6. Never share check-ins from other days, mood, stress, or the check-in note.
7. Never let the student choose or see an office tag or priority.
8. Never promise a session, a counselor, a time, or a channel (D-20).
9. Never log the request body in the Edge Function.
10. Never write `prompt_events.request_sent` before the request is saved, and never send anything from the prompt by itself.
11. Never let `ahp.js` write to `scoring-config.js`; never set `PROVISIONAL = false` until both weights and thresholds come from the scoring session.

---

## 9. Acceptance checklist

Record `phase-07: acceptance passed (checks 1–12)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 219 tests pass; lint, copy, colours OK; build OK |
| 2 | End to end | `db reset`, enrol TOTP, functions serving, `npm run test:e2e -- e2e/phase-07` | 3 pass on desktop; 3 skipped on mobile |
| 3 | AHP example | `node scripts/ahp.js scripts/ahp.example.json` | weights 0.2616, 0.4531, 0.1182, 0.1671; λmax 4.0709; CI 0.0236; CR 0.0262 "accepted"; the printed `WEIGHTS` line equals the one in `scoring-config.js` |
| 4 | What was saved | after the E2E run, Studio → `support_requests` and `triage_decisions` | the no-check-in request: `disclosed` has c1–c4 `null`, band `FR`, score `null`. The prompt request: `disclosed` c1–c4 = the stored values (C4 reversed), `guardrails` holds `fired`, `weights`, `thresholds`, `grayZoneHalfWidth`, `provisional: true` |
| 5 | Score by hand | for the prompt request, compute 0.2616·c1 + 0.4531·c2 + 0.1182·c3 + 0.1671·c4 from `disclosed` | equals `triage_decisions.score` to 4 decimals; band follows Table 5 thresholds and the fired floors |
| 6 | Nothing computed reaches the student | DevTools → Network → `submit-support-request` response | only `request_id` and `created_at` |
| 7 | 2-second budget (2.1.6.1.4) | DevTools → Network timing for `submit-support-request` | under 2000 ms |
| 8 | Failure keeps the note | fill the form, DevTools → **Offline**, Send | "We could not send your request. Nothing was sent."; the note and choices unchanged; back **online**, "Try sending again" → sent screen |
| 9 | Stale check-in | open `/request` in tab A; in tab B save a new check-in; in tab A tick and Send | the P07-D7 message; the four answers now show tab B's check-in; the box is unticked |
| 10 | Hours notice | read the form | the general sentence always shows; on a Saturday or Sunday the "closed right now… seen from Monday, …" sentence also shows |
| 11 | Sent page guard | open `/request/sent` directly | redirected to `/request` |
| 12 | Mobile and keyboard | 390 px; Tab through `/request` | no horizontal scroll; select, note, checkbox, and buttons reachable in order with a visible focus ring |

**Handoff to Phase 08:** `src/lib/time.js` (`isFirstContactLate`, `holidaysConfigured`, `manilaDate`) is used by the queue.
