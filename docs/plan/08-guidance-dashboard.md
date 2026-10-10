# HingaWeb Implementation Plan — 08 · Guidance Dashboard

> Upload order: `00` (v1.3), `01` … `07`, then this file. Phase 07 acceptance must have passed.
> Every file in this phase is given **in full**.

**What was verified when this plan was written:** `npm run verify` passes (**253 unit and component tests**). Against the real Phase 01 schema in Postgres 16, acting as `guidance.one` at aal2: the queue view returned the request with no note; `open_support_request()` returned it and wrote `view_request`; status and follow-up updates returned the changed row and wrote `state_change` and `follow_up`; an office tag insert returned its id and wrote `tag`; the request's first contact appeared in the queue; selecting the `note` column directly was refused. A student crisis event then appeared in `crisis_channel`, and view, acknowledge, and resolve each worked and showed who did them. With a production build in Chromium and a simulated guidance session at aal2, the queue, request detail, office tag, crisis channel, and partner directory had **0 axe WCAG 2.1 A/AA violations** at 1280 px and 390 px. The Playwright specs in `e2e/phase-08` (including a student and a staff browser side by side for the live crisis alert) run for the first time on Jared's machine; fix the app if one fails, change only selectors or waits, and note it in `docs/questions.md`.

---

## 1. Goal

1. **Support requests queue** (Fig 21; 2.1.3.3, 2.1.3.7, 2.1.5.2.1, 2.1.5.2.2): only the allowed list details, P1 → P2 → P3 oldest first, For Review in its own queue (D-14), crisis held outside the queue.
2. **Request detail** (Fig 23): opening is audited first, then the note shows; the stored computation; status (D-29); follow-up date (2.1.5.2.7); links to the office tag and the directory.
3. **Assign office tag** (Fig 25; 2.1.3.4): three options, none selected; staff-only.
4. **Crisis channel** (Fig 24; 2.1.3.8, 2.1.6.1.6): live alert on every guidance screen, acknowledge and resolve (D-05).
5. **Partner directory** (Fig 26, directory only; D-02, D-03).

### 1.1 Prerequisites

Phase 07 acceptance passed. `node scripts/dev-enrol-totp.js` has been run (staff sign-in needs TOTP).

### 1.2 Not in this phase

Admin screens (Phase 09). Referral notes and crisis resolution notes: not built (D-02, D-05). The text-message alert is Phase 05's `notify-crisis`.

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Queue | Fig 21 | 2.1.3.1, 2.1.3.3, 2.1.3.7, 2.1.3.8, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.7; D-14, D-16, D-17 |
| Request detail | Fig 23 | 2.1.3.2, 2.1.3.6, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.6, 2.1.5.2.7; Table 10; D-15, D-29; N-06 |
| Office tag | Fig 25 | 2.1.3.4, 2.1.5.2.5; Table 13; D-06, D-33 |
| Crisis channel and alert | Fig 24 | 2.1.3.8, 2.1.5.2.3, 2.1.6.1.6; Table 11; D-05, D-24 |
| Partner directory | Fig 26 | 2.1.3.9, 2.1.5.2.4; D-02, D-03 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure or other source shows | Ruling |
|---|---|---|---|
| P08-D1 | 00 §10.3 applies staff word rules to `staff.*` and `admin.*` | `staff.*` is already owned by Phase 02's `en.js`; a new section with that name would replace it | Dashboard copy lives under `guidance.*`, and `scripts/check-copy.js` treats `guidance.*` as staff copy (diagnostic words are still banned there). The two allowlisted sentences 2 and 3 are added as 00 §10.3 says |
| P08-D2 | D-14 / 2.1.3.7: list shows name and section, adviser, time, kind of concern, open-request marker; FR in its own queue; overdue marked | Fig 21 shows "Grade and strand", no adviser, concern, or markers, and mixes FR rows in | Columns: Priority · Student (name, "Grade {n} · {section}") · Class adviser · Submitted · Concern · Status · Notes (markers) · Action. Two tabs: "Priority queue ({n})" and "For Review ({n})". Status filter defaults to **Open** (pending, reviewed, referred) |
| P08-D3 | 2.1.3.8: "no other request may wait more than three school days for a first contact" | No figure shows it | Marker "No first contact in 3 school days": no status change or referral yet, and the third school day (counting the day the request is first seen) has ended. Until the guidance office fills `SITE.holidays`, every weekday counts; the queue says so |
| P08-D4 | 2.1.7.3: For Review is seen "the same school day if the request arrives early enough" | "early enough" has no time | Only the three-school-day ceiling is marked. **Team note:** give the office's cut-off time if a same-day marker is wanted |
| P08-D5 | 2.1.3.8 "immediately" applies to crisis events; Phase 01 puts only `crisis_events` on Realtime | — | The queue reloads every 60 s, when the window regains focus, and on "Refresh", and shows "Updated {time}". Crisis events arrive live (P08-D14) |
| P08-D6 | — | Fig 21 "Review" button; Fig 21 priority chips "P 1" | Button "Open"; badges P1 (ink), P2 (blush-strong), P3 (blush), For Review (outlined), never traffic-light colours (00 §10.4) |
| P08-D7 | 00 §5.3: SAW is never computed in the browser | Fig 23 "Weighted value" column and its weights 0.34 / 0.28 / 0.21 / 0.17 (D-15) | Columns: Criterion · Student's answer · Rating used (1–5) · Weight, then the **stored** S and band. Weights and thresholds come from the stored rule set (N-06). A line explains how to check S by hand |
| P08-D8 | D-09: C4 is reverse-coded | Fig 23 "Manageability and coping: Somewhat" | "Student's answer" shows the answer to the question as asked; "Rating used" shows the stored value; a note explains 6 minus the answer |
| P08-D9 | D-02, D-29, 2.1.5.2.7 | Fig 23 buttons "Mark reviewed", "Add referral note"; no follow-up control | A four-state status control (each change audited by the database; Referred = `referral`), a follow-up date card, "Assign office tag", and "Open partner directory". No referral note |
| P08-D10 | D-16 | Fig 23 "Student Support Request ID: SR-2024-089" | "Ref 7c9e6679" |
| P08-D11 | D-16, D-17 | Fig 24 "Student ID: 2024-SHS-0418", "Accountancy, Business and Management (ABM-A)" | Name, "Grade {n} · {section}", class adviser, Ref only |
| P08-D12 | D-05: no resolution columns | Fig 24 "Action logged: Protocol activated", "Resolution documentation" | Acknowledge, then Mark resolved; who and when come from the audit trail. A line says resolution notes belong in the office's crisis protocol record |
| P08-D13 | D-24 | Fig 24 "routed immediately upon student confirmation" | "Raised the moment the student selected this item. Nothing was inferred from anything else they wrote." |
| P08-D14 | 2.1.6.1.6: "by dashboard notification" | Fig 21 banner only on the queue | Every guidance screen subscribes to new crisis events: a dark-bordered alert "A new crisis event was raised." with "Open crisis channel" appears at once on any guidance screen, and the Crisis nav item shows the active count |
| P08-D15 | Table 17 `view_crisis` = "Opened crisis event" | Fig 24 shows identities on the channel page with no open step | Opening the channel logs one `view_crisis` for each event shown, once per visit; the page footer says so |
| P08-D16 | — | Fig 24 "Elapsed: 8 mins" | Raised time only; no running timer |
| P08-D17 | D-06; Table 13 rows cannot change | Fig 25 "Note, optional" | No note. Saving adds a new tag row; the newest is shown with who set it and when |
| P08-D18 | D-02, D-03 | Fig 26 note form, "Previous notes", and "[Second referral partner to be confirmed] · Pending Review" | Directory only: RMC guidance office, IPBM, external professionals, hotlines (manuscript 1.4), plus "Referral notes are not kept in HingaWeb (team decision)…" |
| P08-D19 | 2.1.3.6: every access is recorded | Returning from the tag page re-opens the request | That second opening is recorded as another `view_request`. Correct, not a bug |
| P08-D20 | 00 §10.4 allows the office's colours only in `OfficeTag*.jsx` and `office-tag.css` | — | The tag a staff member chose is shown with a small dot in its colour (staff screens only). Nothing else uses those colours |

---

## 2. Files in this phase

**New:**
- `src/copy/en/guidance.js`
- `src/features/guidance/`: `GuidanceLayout.jsx`, `crisisFeed.js`, `guidanceHelpers.js`, `useSupportQueue.js`, `BandBadge.jsx`, `QueuePage.jsx`, `RequestDetailPage.jsx`, `ComputationTable.jsx`, `OfficeTagBadge.jsx`, `OfficeTagPage.jsx`, `office-tag.css`, `CrisisChannelPage.jsx`, `ReferralsPage.jsx`
- Tests: `src/features/guidance/testClient.js`, `guidanceHelpers.test.js`, `queue.test.jsx`, `detail.test.jsx`, `OfficeTagPage.test.jsx`, `crisis-channel.test.jsx`, `referrals.test.jsx`; `e2e/phase-08/guidance.spec.js`

**Changed (replace the whole file):** `src/copy/en/index.js`, `src/copy/allowlist.js`, `src/routes.jsx` (guidance routes use `GuidanceLayout`), `scripts/check-copy.js`, `scripts/checks.test.js`.

---

## 3. Screens

Every screen: guard `RequireStaff role="guidance"` (aal2), layout `GuidanceLayout` → Phase 02 `StaffLayout` (15-minute idle sign-out, Fig 22) with the live crisis count on the "Crisis" nav item and the new-crisis alert (P08-D14). All times are Manila (`formatDateTime`).

### 3.1 Support requests — `/staff/queue`

- Figure: Fig 21. Component: `QueuePage` (no props).
- h1 "Support requests"; lead "Submitted by students who chose to ask for support. Routine check-ins are not shown here and cannot be opened."
- Crisis banner (only when active events > 0; dark border): phone icon, "1 crisis event needs attention" / "{n} crisis events need attention", "Outside the priority queue", button "Open crisis channel" → `/staff/crisis`.
- Tabs (radio group "Queues"): "Priority queue ({n})" · "For Review ({n})". "Updated {time}" and "Refresh".
- Filters: Priority (All · P1 · P2 · P3; priority tab only) and Status (Open · Pending · Reviewed · Referred · Resolved · All; default Open).
- Table (caption "Support requests, in the order they should be seen"), columns as P08-D2. Notes column markers, in this order: "Has another open request", "Follow-up overdue" (`is_overdue` from the view), "No first contact in 3 school days" (P08-D3; open requests only). Action: "Open" (accessible name "Open the request from {name}") → `/staff/requests/:id`. On mobile each row becomes a card.
- Order: P1, P2, P3; oldest first within each. For Review tab: oldest first. Never by office tag.
- Under the table: priority tab — allowlisted sentence 2 ("Priorities are computed from the student's submitted request. …"); For Review tab — "For Review requests have no P1, P2, or P3. A counselor decides how soon to see each one, within three school days, oldest first." Then (until holidays are filled) the P08-D3 note, and "Opening a request records your access in the audit trail."
- States: loading (skeleton), error (Try again), empty ("No requests here" / "No requests are waiting for review" + "Nothing matches these filters."), a failed reload keeps the rows already shown, offline banner.
- Data: reads `support_queue` (`id, created_at, status, concern_type, follow_up_at, full_name, grade_level, section, class_adviser, band, has_other_open_request, first_contact_at, is_overdue`); counts `crisis_channel` where `resolved_at is null`. Writes nothing.

### 3.2 Request detail — `/staff/requests/:id`

- Figure: Fig 23. Component: `RequestDetailPage`.
- On open: `rpc('open_support_request', { p_request_id })` **once per visit** (guarded against React running the effect twice). It writes `view_request` first, then returns the request. The note is never fetched any other way.
- "Back to queue". Header card: "{name} • Grade {n} · {section}" + band badge; "Submitted {time} • Ref {8}"; status control (Pending · Reviewed · Referred · Resolved) with "Choosing Referred is recorded in the audit trail as a referral. Referral notes are not kept in HingaWeb; keep them in the office's counseling log."
  - Change → `update({ status }).eq('id').select('id, status').single()`; only when the row comes back with the new status: "Status saved."; otherwise "The status was not saved. Try again." and the old value stays.
- Audit notice: "Your access to this request was recorded at {time}. Audit entries cannot be edited or deleted by any account, including the administrator."
- "What the student sent": "Kind of concern: {label}", the note exactly as written (line breaks kept) or "The student did not write a note.", "Stored as the student wrote it. Never scanned or analysed."
- "Shared with this request": class adviser; "This student has another open request." when true.
- "What is not available here": "This student's routine check-ins, mood and stress answers, check-in notes, and anything written in them. These are not readable by any staff account." / "Only what a student submits as a support request appears here."
- "How this priority was computed" (open by default): `ComputationTable` (P08-D7, P08-D8), then: the C4 note; "Thresholds: P2 from {p2}, P1 from {p1}. A score within {gray} of either threshold goes to For Review."; for FR with a score, "The score is within {gray} of a threshold, so the request went to For Review for a counselor to decide."; one line per fired floor; "These weights and thresholds are provisional until the scoring session." while `provisional`; "Retained for audit. Not shown to the student. To check by hand: S is the sum of each weight times its rating." No check-in: "The student had no check-in when they sent this request, so it went to For Review with no score."
- Follow-up card: "Follow up by" (date, min today), hint "If this date passes with no status change, the request is marked overdue.", "Set follow-up date" (saves the end of that Manila day, `YYYY-MM-DDT23:59:59+08:00`), "Clear" when set; "Follow-up date saved." / "Follow-up date cleared." / "The follow-up date was not saved. Try again."
- Office tag card: the newest tag (`OfficeTagBadge`) with "Assigned by {name} on {time}", or "No office tag yet."; links "Assign office tag" → `/staff/requests/:id/tag` and "Open partner directory" → `/staff/referrals?request=:id`. After saving a tag the page shows "Office tag saved."
- States: loading, not found ("This request does not exist."), error (Try again).
- Writes: `support_requests.status`, `support_requests.follow_up_at` (both audited by the Phase 01 trigger).

### 3.3 Assign office tag — `/staff/requests/:id/tag`

- Figure: Fig 25. Component: `OfficeTagPage`.
- "Back to support request"; h1 "Assign office tag"; lead "This is the guidance office's own tag. HingaWeb never computes, suggests, or changes it."; chip "Office tag"; "{name} • Grade {n} · {section}" (from `support_queue`, no note, no extra audit row).
- "Current tag: {label}, assigned by {name} on {time}." or "No office tag has been assigned yet."
- Radio group "Office status tag": the three `OFFICE_TAGS`, **none selected**, never defaulted from the last tag. "Saving adds a new tag. Earlier tags stay in the record."
- "Save tag" disabled until one is chosen → insert `office_tags { request_id, tag }` with `.select('id').single()` → back to the request with "Office tag saved." Failure: "The tag was not saved. Try again." "Cancel" → back.
- Footer: "The system does not read this tag and does not use it to order the queue."
- This page never reads the band, score, ratings, or note.

### 3.4 Crisis channel — `/staff/crisis`

- Figure: Fig 24. Component: `CrisisChannelPage`.
- Chip "Crisis channel • Outside the priority queue"; h1 "Crisis channel"; lead = allowlisted sentence 3.
- "Active crisis events": one card per unresolved event, new (unacknowledged) first, then the longest waiting. Card: chip "New" / "Acknowledged", "Raised {time} • Ref {8}", name, "Grade {n} · {section}", "Class adviser: {name}", "Item selected" + the item label + the D-24 line, "Protocol step" + `protocol_ref` (or "No protocol step is set for this item."), "Acknowledged by {name} at {time}" when acknowledged; buttons "Acknowledge" (→ `acknowledge_crisis_event`) or "Mark resolved" (→ `resolve_crisis_event`), and "Open referral directory"; "Acknowledge before resolving. HingaWeb does not keep resolution notes; record them in the office's crisis protocol record." Failure: "That was not saved. Try again." Empty: "No active crisis events."
- "Hotlines and protocol contacts": every hotline and the guidance office from `directory.js`.
- "Resolved in the last 7 days": table Student · Raised · Acknowledged ("{time} by {name}") · Resolved. Empty: "No events were resolved in the last 7 days."
- Footer: "Opening this channel records your access to each event shown in the audit trail." (P08-D15)
- Reloads when a new crisis event arrives (shared feed).
- Data: reads `crisis_channel` (active; resolved since 7 days ago); calls `log_crisis_view`, `acknowledge_crisis_event`, `resolve_crisis_event`.

### 3.5 Partner directory — `/staff/referrals`

- Figure: Fig 26 (directory panel only). Component: `ReferralsPage`. Static; makes no request.
- Optional "Back to support request" when opened with `?request=<uuid>`.
- h1 "Partner directory"; "Referral partners and hotlines. To mark a request as referred, open it and set its status to Referred."; "Referral notes are not kept in HingaWeb (team decision). Keep them in the office's counseling log."
- Cards: RMC guidance office (person • role, location, hours, contact), IPBM ("Institutional partner"), external professional, 24-hour hotlines + the not-for-emergencies notice. All values are the `directory.js` placeholders.

### 3.6 Live crisis feed — `GuidanceLayout` + `crisisFeed.js` (no screen)

- One Realtime channel `guidance-crisis-events`: `postgres_changes` INSERT on `public.crisis_events` (RLS lets only guidance at aal2 receive rows). On each event: show the alert (role `alert`, `aria-live="assertive"`) with "Open crisis channel" and "Dismiss", bump a version the crisis page listens to, and refresh the active count.
- The count also refreshes every 60 s and on window focus. The channel is removed when the layout unmounts (sign-out, timeout).

---

## 4. Who can see or do what

| Action | Guidance at aal2 | Administrator | Student | Guidance at aal1 |
|---|---|---|---|---|
| Open any `/staff/*` dashboard screen | yes | sent to own home | sent to own home | sent to `/staff/verify` |
| Read `support_queue`, `crisis_channel`, `triage_decisions`, `office_tags` | yes | no (RLS) | no | no |
| Read a request's note | only via `open_support_request()` (audited) | no | no | no |
| Change status / follow-up | yes (audited by trigger) | no | no | no |
| Insert an office tag | yes (audited by trigger) | no | no | no |
| Acknowledge / resolve crisis | yes (audited) | no | no | no |
| Read check-ins, mood, stress, prompt events, resource views, consent, `students` | **never** | — | own only | never |

---

## 5. Build steps

### Step 1 — Copy and the copy check

**`src/copy/en/guidance.js`**

```js
// Phase 08 copy: guidance dashboard (Figs 21, 23, 24, 25, 26). Staff-facing: checked with the
// staff word list (00 Section 10.3; P08-D1). Office tag names are NOT here; they come from
// OFFICE_TAGS in src/config/vocabulary.js (00 Section 10.4).
export const guidanceCopy = {
  gradeSection: 'Grade {grade} · {section}',
  queue: {
    title: 'Support requests',
    lead: 'Submitted by students who chose to ask for support. Routine check-ins are not shown here and cannot be opened.',
    crisisOne: '1 crisis event needs attention',
    crisisMany: '{count} crisis events need attention',
    crisisOutside: 'Outside the priority queue',
    crisisOpen: 'Open crisis channel',
    tabsLabel: 'Queues',
    tabPriority: 'Priority queue ({count})',
    tabReview: 'For Review ({count})',
    bandLabel: 'Priority',
    statusLabel: 'Status',
    all: 'All',
    open: 'Open',
    refresh: 'Refresh',
    updated: 'Updated {time}',
    caption: 'Support requests, in the order they should be seen',
    columns: {
      priority: 'Priority',
      student: 'Student',
      adviser: 'Class adviser',
      submitted: 'Submitted',
      concern: 'Concern',
      status: 'Status',
      notes: 'Notes',
      action: 'Action',
    },
    openRequest: 'Open',
    openRequestLabel: 'Open the request from {name}',
    markers: {
      otherOpen: 'Has another open request',
      followUpOverdue: 'Follow-up overdue',
      firstContactLate: 'No first contact in 3 school days',
    },
    empty: 'No requests here',
    emptyBody: 'Nothing matches these filters.',
    emptyReview: 'No requests are waiting for review',
    reviewNote:
      'For Review requests have no P1, P2, or P3. A counselor decides how soon to see each one, within three school days, oldest first.',
    priorityNote:
      "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning.",
    holidaysMissing:
      'School holidays are not set yet, so the 3-school-day marker counts every weekday as a school day.',
    auditFooter: 'Opening a request records your access in the audit trail.',
  },
  detail: {
    back: 'Back to queue',
    submitted: 'Submitted {time} • {ref}',
    statusLabel: 'Status',
    statusSaved: 'Status saved.',
    statusError: 'The status was not saved. Try again.',
    referralHint:
      "Choosing Referred is recorded in the audit trail as a referral. Referral notes are not kept in HingaWeb; keep them in the office's counseling log.",
    auditNotice:
      'Your access to this request was recorded at {time}. Audit entries cannot be edited or deleted by any account, including the administrator.',
    sentTitle: 'What the student sent',
    concern: 'Kind of concern',
    note: 'Note',
    noNote: 'The student did not write a note.',
    noteFooter: 'Stored as the student wrote it. Never scanned or analysed.',
    sharedTitle: 'Shared with this request',
    adviser: 'Class adviser',
    otherOpen: 'This student has another open request.',
    notAvailableTitle: 'What is not available here',
    notAvailableBody:
      "This student's routine check-ins, mood and stress answers, check-in notes, and anything written in them. These are not readable by any staff account.",
    notAvailableFooter: 'Only what a student submits as a support request appears here.',
    computedTitle: 'How this priority was computed',
    computed: {
      caption: 'Ratings and weights used for this request',
      criterion: 'Criterion',
      answer: "Student's answer",
      rating: 'Rating used (1–5)',
      weight: 'Weight',
      c4Note:
        'C4 was asked as "I have been able to manage what I am carrying", so the rating used is 6 minus the answer: a higher rating means harder to manage.',
      score: 'Score S (stored)',
      band: 'Priority',
      thresholds:
        'Thresholds: P2 from {p2}, P1 from {p1}. A score within {gray} of either threshold goes to For Review.',
      fired: {
        anySingleAtMax: 'Floor applied: a criterion at 5 sets at least P2.',
        twoOrMoreHigh: 'Floor applied: two or more criteria at 4 or 5 set at least P2.',
        c4MaxFloorP1: 'Floor applied: C4 at 5 sets at least P1.',
      },
      grayZone:
        'The score is within {gray} of a threshold, so the request went to For Review for a counselor to decide.',
      noCheckin:
        'The student had no check-in when they sent this request, so it went to For Review with no score.',
      provisional: 'These weights and thresholds are provisional until the scoring session.',
      retained:
        'Retained for audit. Not shown to the student. To check by hand: S is the sum of each weight times its rating.',
    },
    followUpTitle: 'Follow-up date',
    followUpLabel: 'Follow up by',
    followUpHint: 'If this date passes with no status change, the request is marked overdue.',
    followUpSave: 'Set follow-up date',
    followUpClear: 'Clear',
    followUpSaved: 'Follow-up date saved.',
    followUpCleared: 'Follow-up date cleared.',
    followUpError: 'The follow-up date was not saved. Try again.',
    followUpCurrent: 'Current: {date}',
    officeTagTitle: 'Office tag',
    officeTagNone: 'No office tag yet.',
    officeTagBy: 'Assigned by {name} on {time}',
    officeTagSaved: 'Office tag saved.',
    assignTag: 'Assign office tag',
    directory: 'Open partner directory',
    notFound: 'This request does not exist.',
  },
  tag: {
    back: 'Back to support request',
    title: 'Assign office tag',
    lead: "This is the guidance office's own tag. HingaWeb never computes, suggests, or changes it.",
    chip: 'Office tag',
    legend: 'Office status tag',
    current: 'Current tag: {tag}, assigned by {name} on {time}.',
    none: 'No office tag has been assigned yet.',
    history: 'Saving adds a new tag. Earlier tags stay in the record.',
    save: 'Save tag',
    cancel: 'Cancel',
    saveError: 'The tag was not saved. Try again.',
    footer: 'The system does not read this tag and does not use it to order the queue.',
  },
  crisis: {
    chip: 'Crisis channel • Outside the priority queue',
    title: 'Crisis channel',
    lead: 'Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests.',
    activeTitle: 'Active crisis events',
    none: 'No active crisis events.',
    statusNew: 'New',
    statusAcknowledged: 'Acknowledged',
    statusResolved: 'Resolved',
    raised: 'Raised {time}',
    adviser: 'Class adviser: {name}',
    itemTitle: 'Item selected',
    itemNote:
      'Raised the moment the student selected this item. Nothing was inferred from anything else they wrote.',
    protocolTitle: 'Protocol step',
    noProtocol: 'No protocol step is set for this item.',
    acknowledge: 'Acknowledge',
    acknowledged: 'Acknowledged by {name} at {time}',
    resolve: 'Mark resolved',
    resolved: 'Resolved by {name} at {time}',
    resolveHint:
      "Acknowledge before resolving. HingaWeb does not keep resolution notes; record them in the office's crisis protocol record.",
    actionError: 'That was not saved. Try again.',
    directory: 'Open referral directory',
    contactsTitle: 'Hotlines and protocol contacts',
    resolvedTitle: 'Resolved in the last 7 days',
    resolvedNone: 'No events were resolved in the last 7 days.',
    resolvedCaption: 'Crisis events resolved in the last 7 days',
    columns: {
      student: 'Student',
      raised: 'Raised',
      acknowledged: 'Acknowledged',
      resolved: 'Resolved',
    },
    by: '{time} by {name}',
    auditFooter: 'Opening this channel records your access to each event shown in the audit trail.',
    newAlert: 'A new crisis event was raised.',
    newAlertOpen: 'Open crisis channel',
    dismiss: 'Dismiss',
  },
  referrals: {
    title: 'Partner directory',
    lead: 'Referral partners and hotlines. To mark a request as referred, open it and set its status to Referred.',
    noNotes:
      "Referral notes are not kept in HingaWeb (team decision). Keep them in the office's counseling log.",
    back: 'Back to support request',
    office: 'RMC guidance office',
    partner: 'Institutional partner',
    external: 'External professional',
    hotlines: '24-hour hotlines',
    contact: 'Contact: {value}',
    email: 'Email: {value}',
    hours: 'Hours: {value}',
    location: 'Location: {value}',
    inCharge: '{name} • {role}',
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
import { guidanceCopy } from './guidance.js';

export const sections = {
  public: publicCopy,
  assent: assentCopy,
  waiting: waitingCopy,
  checkin: checkinCopy,
  crisis: crisisCopy,
  trends: trendsCopy,
  resources: resourcesCopy,
  request: requestCopy,
  guidance: guidanceCopy,
};
```

**`src/copy/allowlist.js`** — adds allowlisted sentences 2 and 3 (00 §10.3)

```js
// 00 Section 10.3. Exact sentences exempt from scripts/check-copy.js.
// Add a sentence ONLY in the phase that the plan names for it.
export const ALLOWLIST = [
  // Phase 03 · Fig 7 hero (allowlisted sentence 1)
  'It is not a diagnosis and it is not a replacement for talking to someone.',
  // Phase 08 · Fig 21 (allowlisted sentence 2)
  "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning.",
  // Phase 08 · Fig 24 (allowlisted sentence 3)
  'Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests.',
];
```

**`scripts/check-copy.js`** — treats `guidance.*` as staff copy (P08-D1)

```js
// 00 Section 10.3. Fails if UI copy contains diagnostic, clinical, or scoring words.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, flatten } from './lib.js';

export const STUDENT_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\banxious\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\bclinical\b/i,
  /\bclinicians?\b/i,
  /\btherapy\b/i,
  /\btreatments?\b/i,
  /\bscreening\b/i,
  /\bassessments?\b/i,
  /\brisks?\b/i,
  /\bseverity\b/i,
  /\bscor(e|es|ed|ing)\b/i,
  /\bpriorit(y|ies)\b/i,
  /\btriage\b/i,
  /\bP[123]\b/,
  /\bFor Review\b/i,
  /\blabels?\b/i,
  /\bflag\w*/i,
];
export const STAFF_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\brisk scores?\b/i,
  /\brisk levels?\b/i,
  /\bat-risk\b/i,
  /\bscreening\b/i,
  /\bseverity\b/i,
];

/** Returns a list of { key, value, pattern } violations. */
export function findViolations(copy, allowlist) {
  const out = [];
  for (const [key, value] of flatten(copy)) {
    if (allowlist.includes(value)) continue;
    // guidance.* (Phase 08) holds the guidance dashboard copy; it is staff-facing (P08-D1).
    const staff = ['staff.', 'admin.', 'guidance.', 'nav.staff.', 'nav.admin.'].some((p) =>
      key.startsWith(p),
    );
    for (const re of staff ? STAFF_BANNED : STUDENT_BANNED) {
      if (re.test(value)) out.push({ key, value, pattern: String(re) });
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('check-copy.js')) {
  const enPath = join(ROOT, 'src/copy/en.js');
  const allowPath = join(ROOT, 'src/copy/allowlist.js');
  if (!existsSync(enPath)) {
    console.log('check:copy: src/copy/en.js not created yet (Phase 02) — nothing to check');
  } else {
    const { en } = await import(pathToFileURL(enPath).href);
    const allowlist = existsSync(allowPath)
      ? (await import(pathToFileURL(allowPath).href)).ALLOWLIST
      : [];
    const v = findViolations(en, allowlist);
    if (v.length) {
      for (const x of v) console.error(`check:copy: ${x.key} matches ${x.pattern}: "${x.value}"`);
      process.exit(1);
    }
    console.log('check:copy: OK');
  }
}
```

**`scripts/checks.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { findViolations } from './check-copy.js';
import { scanFile } from './check-colour-words.js';
import { PLACEHOLDER } from './check-placeholders.js';

describe('check-copy', () => {
  it('flags diagnostic and scoring words in student copy', () => {
    const v = findViolations({ checkin: { a: 'Your score is ready', b: 'Signs of anxiety' } }, []);
    expect(v.map((x) => x.key)).toEqual(['checkin.a', 'checkin.b']);
  });
  it('lets staff copy use priority words', () => {
    expect(findViolations({ staff: { queue: { a: 'P1 requests first' } } }, [])).toEqual([]);
  });
  it('treats guidance.* (Phase 08 dashboard) as staff copy, but still bans diagnostic words there', () => {
    expect(findViolations({ guidance: { queue: { a: 'P1 first; For Review; score S' } } }, [])).toEqual([]);
    expect(findViolations({ guidance: { a: 'possible depression' } }, [])).toHaveLength(1);
    expect(findViolations({ guidancex: { a: 'P1 first' } }, [])).toHaveLength(1);
  });
  it('honours the exact-sentence allowlist', () => {
    const s = 'It is not a diagnosis and it is not a replacement for talking to someone.';
    expect(findViolations({ landing: { a: s } }, [s])).toEqual([]);
  });
});

describe('check-colour-words', () => {
  it('flags a colour word in ordinary code', () => {
    expect(scanFile('src/features/x.jsx', "const tone = 'red';")).toHaveLength(1);
  });
  it('ignores words that only contain colour letters', () => {
    expect(scanFile('src/x.js', 'referred required reduce greenery')).toEqual([]);
  });
  it('allows colour words only between office-tag markers', () => {
    const text = "a: 'red'\n// office-tags:start\nb: 'Red'\n// office-tags:end\nc: 'green'";
    expect(scanFile('src/copy/en.js', text).map((x) => x.line)).toEqual([1, 5]);
  });
  it('allows the office_tags migration', () => {
    expect(
      scanFile('supabase/migrations/20261010000200_office_tags.sql', "('green','yellow','red')"),
    ).toEqual([]);
  });
});

describe('check-placeholders', () => {
  it('matches the three owners only', () => {
    const s = '[[GUIDANCE:hotline_1]] [[TEAM:CEB:assent.title]] [[SCHOOL:it]] [[OTHER:x]]';
    expect([...s.matchAll(PLACEHOLDER)].map((m) => m[1])).toEqual(['GUIDANCE', 'TEAM', 'SCHOOL']);
  });
});
```

### Step 2 — Shared guidance pieces

**`src/features/guidance/guidanceHelpers.js`**

```js
// Guidance helpers (Phase 08). Queue order (2.1.5.2.2): P1, then P2, then P3; within a priority, the request that has waited
// longest comes first. For Review requests sit in their own queue, oldest first.
// Office tags are never read here (2.1.5.2.5).
import { OPEN_STATES } from '../../config/vocabulary.js';
import { isFirstContactLate } from '../../lib/time.js';

const RANK = { P1: 0, P2: 1, P3: 2 };

function oldestFirst(a, b) {
  return new Date(a.created_at) - new Date(b.created_at) || (a.id < b.id ? -1 : 1);
}

/** Splits rows into { priority, review }, each in display order. */
export function splitQueue(rows) {
  const priority = rows
    .filter((r) => r.band in RANK)
    .sort((a, b) => RANK[a.band] - RANK[b.band] || oldestFirst(a, b));
  const review = rows.filter((r) => !(r.band in RANK)).sort(oldestFirst);
  return { priority, review };
}

/** status filter: 'open' (pending, reviewed, referred), 'all', or one status value. */
export function matchesStatus(row, filter) {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATES.includes(row.status);
  return row.status === filter;
}

/** The markers shown in the Notes column, in this order. */
export function markersFor(row, now = new Date()) {
  const out = [];
  if (row.has_other_open_request) out.push('otherOpen');
  if (row.is_overdue) out.push('followUpOverdue');
  if (
    OPEN_STATES.includes(row.status) &&
    isFirstContactLate(row.created_at, row.first_contact_at, now)
  ) {
    out.push('firstContactLate');
  }
  return out;
}

/** Crisis channel order: unacknowledged first, then the longest waiting. */
export function orderActive(rows) {
  return [...rows].sort(
    (a, b) =>
      Number(Boolean(a.acknowledged_at)) - Number(Boolean(b.acknowledged_at)) ||
      new Date(a.created_at) - new Date(b.created_at),
  );
}

/** A follow-up date means "by the end of that Manila day" (2.1.5.2.7). */
export function followUpTimestamp(isoDate) {
  return `${isoDate}T23:59:59+08:00`;
}
```

**`src/features/guidance/crisisFeed.js`**

```js
// Live crisis events for the guidance role (2.1.3.8, 2.1.6.1.6 staff half; Table 11).
// One Realtime subscription for every guidance screen: a new crisis_events row reaches the
// browser at once (RLS lets only guidance at aal2 receive it). The count is refreshed on each
// event, every 60 seconds, and when the window regains focus, in case Realtime drops.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export const POLL_MS = 60000;
export const CrisisFeedContext = createContext({
  activeCount: 0,
  version: 0,
  alert: false,
  dismissAlert: () => {},
});

export function useCrisisFeed() {
  return useContext(CrisisFeedContext);
}

/** Runs the subscription. Used once, by GuidanceLayout. */
export function useCrisisFeedSource() {
  const [activeCount, setActiveCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [alert, setAlert] = useState(false);

  const refresh = useCallback(() => {
    supabase
      .from('crisis_channel')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') setActiveCount(count);
      });
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('guidance-crisis-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crisis_events' }, () => {
        setAlert(true);
        setVersion((v) => v + 1);
        refresh();
      })
      .subscribe();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const dismissAlert = useCallback(() => setAlert(false), []);
  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    refresh();
  }, [refresh]);
  return { activeCount, version, alert, dismissAlert, refresh: bump };
}
```

**`src/features/guidance/GuidanceLayout.jsx`**

```jsx
// Every guidance screen: the Phase 02 staff header with the live crisis count, and an alert that
// appears on ANY guidance screen the moment a crisis event is raised (2.1.3.8; 2.1.6.1.6).
import { Link } from 'react-router';
import { Siren } from 'lucide-react';
import { t } from '../../copy/index.js';
import { StaffLayout } from '../../components/layout/StaffLayout.jsx';
import { buttonClasses } from '../../components/ui/index.js';
import { CrisisFeedContext, useCrisisFeedSource } from './crisisFeed.js';

export function GuidanceLayout() {
  const feed = useCrisisFeedSource();
  return (
    <CrisisFeedContext.Provider value={feed}>
      <div role="alert" aria-live="assertive">
        {feed.alert && (
          <div className="flex flex-col gap-3 border-b-2 border-ink bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Siren aria-hidden="true" className="size-5" />
              {t('guidance.crisis.newAlert')}
            </p>
            <div className="flex gap-2">
              <Link
                to="/staff/crisis"
                onClick={feed.dismissAlert}
                className={buttonClasses('primary', 'md')}
              >
                {t('guidance.crisis.newAlertOpen')}
              </Link>
              <button
                type="button"
                onClick={feed.dismissAlert}
                className={buttonClasses('ghost', 'md')}
              >
                {t('guidance.crisis.dismiss')}
              </button>
            </div>
          </div>
        )}
      </div>
      <StaffLayout crisisCount={feed.activeCount} />
    </CrisisFeedContext.Provider>
  );
}
```

**`src/features/guidance/BandBadge.jsx`**

```jsx
// P1 / P2 / P3 / For Review badge (2.1.5.2.2; 00 Section 10.4): blush, blush-strong, and ink only.
// Never a traffic-light colour, never shown to a student.
import { BANDS, labelFor } from '../../config/vocabulary.js';
import { cx } from '../../components/ui/cx.js';

const STYLE = {
  P1: 'bg-action text-action-ink',
  P2: 'bg-blush-strong text-ink',
  P3: 'bg-blush text-ink',
  FR: 'border border-ink bg-surface text-ink',
};

export function BandBadge({ band }) {
  return (
    <span
      className={cx(
        'inline-flex min-w-9 items-center justify-center rounded-control px-2 py-1 text-[13px] font-semibold',
        STYLE[band] ?? STYLE.FR,
      )}
    >
      {labelFor(BANDS, band ?? 'FR')}
    </span>
  );
}
```

**`src/features/guidance/office-tag.css`** — the only stylesheet allowed to name the office colours

```
/* Phase 08 · the office's own tag colours (Table 13; 2.1.3.4). The ONLY stylesheet allowed to name
   these colours (00 Section 10.4). Used only by OfficeTag*.jsx, only for a tag a staff member chose. */
.office-tag-dot {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--color-ink);
}
.office-tag-dot[data-tag='green'] {
  background: #2e7d32;
}
.office-tag-dot[data-tag='yellow'] {
  background: #f9a825;
}
.office-tag-dot[data-tag='red'] {
  background: #c62828;
}
```

**`src/features/guidance/OfficeTagBadge.jsx`**

```jsx
// Shows an office tag a staff member assigned (Table 13). Never computed or suggested by HingaWeb.
import { OFFICE_TAGS, labelFor } from '../../config/vocabulary.js';
import './office-tag.css';

export function OfficeTagBadge({ tag }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[14px] font-semibold text-ink">
      <span aria-hidden="true" className="office-tag-dot" data-tag={tag} />
      {labelFor(OFFICE_TAGS, tag)}
    </span>
  );
}
```

### Step 3 — Queue

**`src/features/guidance/useSupportQueue.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/** Columns of the support_queue view (Phase 01). There is no note column (2.1.3.7). */
export const QUEUE_COLUMNS =
  'id, created_at, status, concern_type, follow_up_at, full_name, grade_level, section, class_adviser, band, has_other_open_request, first_contact_at, is_overdue';
export const QUEUE_POLL_MS = 60000;

/**
 * The guidance queue. support_requests is not on Realtime (Phase 01), so the list reloads every
 * 60 seconds, when the window regains focus, and on "Refresh". Rows already shown stay on screen
 * while a reload runs or fails.
 */
export function useSupportQueue() {
  const [state, setState] = useState({ status: 'loading', rows: [], loadedAt: null });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('support_queue')
      .select(QUEUE_COLUMNS)
      .then(({ data, error }) => {
        if (!active) return;
        setState((s) =>
          error
            ? { ...s, status: s.loadedAt ? 'stale' : 'error' }
            : { status: 'ready', rows: data ?? [], loadedAt: new Date() },
        );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    const timer = setInterval(reload, QUEUE_POLL_MS);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return { ...state, reload };
}
```

**`src/features/guidance/QueuePage.jsx`**

```jsx
// Fig 21 · support request queue (2.1.3.3, 2.1.3.7, 2.1.3.8, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.7;
// D-14, D-16, D-17; P08-D2..D6). Before opening, the list shows only: name and section, class
// adviser, time submitted, kind of concern, and whether there is another open request, plus the
// priority label, status, and the overdue markers. The note is never listed.
import { useState } from 'react';
import { Link } from 'react-router';
import { Phone, RotateCw, ChevronRight, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { BANDS, CONCERN_TYPES, WORKFLOW_STATES, labelFor } from '../../config/vocabulary.js';
import { formatDateTime } from '../../lib/format.js';
import { holidaysConfigured } from '../../lib/time.js';
import {
  Button,
  EmptyState,
  ErrorState,
  SegmentedControl,
  Skeleton,
  Table,
  buttonClasses,
} from '../../components/ui/index.js';
import { BandBadge } from './BandBadge.jsx';
import { useCrisisFeed } from './crisisFeed.js';
import { markersFor, matchesStatus, splitQueue } from './guidanceHelpers.js';
import { useSupportQueue } from './useSupportQueue.js';

const STATUS_FILTERS = [
  { value: 'open', label: () => t('guidance.queue.open') },
  ...WORKFLOW_STATES.map((s) => ({ value: s.value, label: () => s.label })),
  { value: 'all', label: () => t('guidance.queue.all') },
];
const BAND_FILTERS = [
  { value: 'all', label: () => t('guidance.queue.all') },
  ...BANDS.filter((b) => b.value !== 'FR').map((b) => ({ value: b.value, label: () => b.label })),
];

export function QueuePage() {
  const queue = useSupportQueue();
  const { activeCount } = useCrisisFeed();
  const [tab, setTab] = useState('priority');
  const [band, setBand] = useState('all');
  const [status, setStatus] = useState('open');

  const filtered = queue.rows.filter((r) => matchesStatus(r, status));
  const { priority, review } = splitQueue(filtered);
  const rows =
    tab === 'priority' ? priority.filter((r) => band === 'all' || r.band === band) : review;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('guidance.queue.title')}
        </h1>
        <p className="max-w-3xl text-base text-ink-muted">{t('guidance.queue.lead')}</p>
      </header>

      {activeCount > 0 && (
        <section className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-2 text-ink">
            <Phone aria-hidden="true" className="size-5" />
            <span className="font-semibold">
              {activeCount === 1
                ? t('guidance.queue.crisisOne')
                : t('guidance.queue.crisisMany', { count: activeCount })}
            </span>
            <span className="text-[14px] text-ink-muted">{t('guidance.queue.crisisOutside')}</span>
          </p>
          <Link to="/staff/crisis" className={buttonClasses('primary', 'md')}>
            {t('guidance.queue.crisisOpen')}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          label={t('guidance.queue.tabsLabel')}
          options={[
            {
              value: 'priority',
              label: t('guidance.queue.tabPriority', { count: priority.length }),
            },
            { value: 'review', label: t('guidance.queue.tabReview', { count: review.length }) },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex items-center gap-3">
          {queue.loadedAt && (
            <span className="text-[13px] text-ink-muted">
              {t('guidance.queue.updated', { time: formatDateTime(queue.loadedAt) })}
            </span>
          )}
          <Button
            variant="outline"
            onClick={queue.reload}
            iconLeft={<RotateCw aria-hidden="true" className="size-4" />}
          >
            {t('guidance.queue.refresh')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-6">
        {tab === 'priority' && (
          <FilterRow label={t('guidance.queue.bandLabel')}>
            <SegmentedControl
              label={t('guidance.queue.bandLabel')}
              options={BAND_FILTERS.map((f) => ({ value: f.value, label: f.label() }))}
              value={band}
              onChange={setBand}
            />
          </FilterRow>
        )}
        <FilterRow label={t('guidance.queue.statusLabel')}>
          <SegmentedControl
            label={t('guidance.queue.statusLabel')}
            options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label() }))}
            value={status}
            onChange={setStatus}
          />
        </FilterRow>
      </div>

      {queue.status === 'loading' && (
        <div>
          <p className="sr-only">{t('common.loading')}</p>
          <Skeleton lines={6} />
        </div>
      )}
      {queue.status === 'error' && <ErrorState onRetry={queue.reload} />}
      {(queue.status === 'ready' || queue.status === 'stale') &&
        (rows.length === 0 ? (
          <EmptyState
            title={tab === 'review' ? t('guidance.queue.emptyReview') : t('guidance.queue.empty')}
            body={t('guidance.queue.emptyBody')}
          />
        ) : (
          // Keep words whole in this dense table (the app-wide overflow-wrap: anywhere splits them).
          <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
            <QueueTable rows={rows} />
          </div>
        ))}

      <p className="text-[13px] text-ink-muted">
        {tab === 'review' ? t('guidance.queue.reviewNote') : t('guidance.queue.priorityNote')}
      </p>
      {!holidaysConfigured() && (
        <p className="text-[13px] text-ink-muted">{t('guidance.queue.holidaysMissing')}</p>
      )}
      <p className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Lock aria-hidden="true" className="size-4" />
        {t('guidance.queue.auditFooter')}
      </p>
    </div>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted"
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function QueueTable({ rows }) {
  const now = new Date();
  return (
    <Table
      caption={t('guidance.queue.caption')}
      getRowKey={(r) => r.id}
      rows={rows}
      columns={[
        {
          key: 'band',
          header: t('guidance.queue.columns.priority'),
          render: (r) => <BandBadge band={r.band} />,
        },
        {
          key: 'student',
          header: t('guidance.queue.columns.student'),
          render: (r) => (
            <span className="flex flex-col text-right md:text-left">
              <span className="font-semibold text-ink">{r.full_name}</span>
              <span className="text-ink-muted">
                {t('guidance.gradeSection', { grade: r.grade_level, section: r.section })}
              </span>
            </span>
          ),
        },
        {
          key: 'adviser',
          header: t('guidance.queue.columns.adviser'),
          render: (r) => r.class_adviser,
        },
        {
          key: 'submitted',
          header: t('guidance.queue.columns.submitted'),
          render: (r) => formatDateTime(r.created_at),
        },
        {
          key: 'concern',
          header: t('guidance.queue.columns.concern'),
          render: (r) => labelFor(CONCERN_TYPES, r.concern_type),
        },
        {
          key: 'status',
          header: t('guidance.queue.columns.status'),
          render: (r) => labelFor(WORKFLOW_STATES, r.status),
        },
        {
          key: 'notes',
          header: t('guidance.queue.columns.notes'),
          render: (r) => (
            <span className="flex flex-col gap-1 text-right md:text-left">
              {markersFor(r, now).map((m) => (
                <span key={m} className="font-semibold text-ink">
                  {t(`guidance.queue.markers.${m}`)}
                </span>
              ))}
            </span>
          ),
        },
        {
          key: 'action',
          header: t('guidance.queue.columns.action'),
          render: (r) => (
            <Link
              to={`/staff/requests/${r.id}`}
              aria-label={t('guidance.queue.openRequestLabel', { name: r.full_name })}
              className={buttonClasses('outline', 'md', 'whitespace-nowrap')}
            >
              {t('guidance.queue.openRequest')}
            </Link>
          ),
        },
      ]}
    />
  );
}
```

### Step 4 — Request detail

**`src/features/guidance/ComputationTable.jsx`**

```jsx
// Fig 23 "How this priority was computed" (2.1.5.2.2; Table 10; N-06; P08-D7).
// Reads the stored score, band, and rule set (triage_decisions.guardrails) and the ratings in the
// disclosed copy. It recomputes nothing: SAW never runs in the browser (00 Section 5.3).
import { t } from '../../copy/index.js';
import { ANSWER_SCALE, CRITERIA, labelFor } from '../../config/vocabulary.js';
import { itemFor, tappedValue } from '../../config/checkin-items.js';
import { BandBadge } from './BandBadge.jsx';

export function ComputationTable({ disclosed, triage }) {
  const rule = triage?.guardrails ?? {};
  const noCheckin = disclosed?.c1 == null;
  if (noCheckin) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[15px] text-ink">{t('guidance.detail.computed.noCheckin')}</p>
        <p className="flex items-center gap-2 text-[14px] text-ink">
          {t('guidance.detail.computed.band')}: <BandBadge band={triage?.band ?? 'FR'} />
        </p>
        <p className="text-[13px] text-ink-muted">{t('guidance.detail.computed.retained')}</p>
      </div>
    );
  }
  const gray = rule.grayZoneHalfWidth;
  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-x-auto rounded-card border border-line"
        tabIndex={0}
        role="region"
        aria-label={t('guidance.detail.computed.caption')}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
          <caption className="sr-only">{t('guidance.detail.computed.caption')}</caption>
          <thead className="bg-canvas text-[13px] text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-2">
                {t('guidance.detail.computed.criterion')}
              </th>
              <th scope="col" className="px-4 py-2">
                {t('guidance.detail.computed.answer')}
              </th>
              <th scope="col" className="px-4 py-2 text-right">
                {t('guidance.detail.computed.rating')}
              </th>
              <th scope="col" className="px-4 py-2 text-right">
                {t('guidance.detail.computed.weight')}
              </th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c.key} className="border-t border-line">
                <th scope="row" className="px-4 py-2 font-normal text-ink">
                  {c.key.toUpperCase()} · {c.staffLabel}
                </th>
                <td className="px-4 py-2 text-ink">
                  {labelFor(ANSWER_SCALE, tappedValue(itemFor(c.key), disclosed[c.key]))}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-ink">{disclosed[c.key]}</td>
                <td className="px-4 py-2 text-right text-ink">{rule.weights?.[c.key] ?? ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas">
              <th scope="row" colSpan={3} className="px-4 py-2 text-right font-semibold text-ink">
                {t('guidance.detail.computed.score')}
              </th>
              <td className="px-4 py-2 text-right font-semibold text-ink">{triage?.score ?? ''}</td>
            </tr>
            <tr className="border-t border-line bg-canvas">
              <th scope="row" colSpan={3} className="px-4 py-2 text-right font-semibold text-ink">
                {t('guidance.detail.computed.band')}
              </th>
              <td className="px-4 py-2 text-right">
                <BandBadge band={triage?.band} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <ul className="flex flex-col gap-1 text-[13px] text-ink-muted">
        <li>{t('guidance.detail.computed.c4Note')}</li>
        {rule.thresholds && (
          <li>
            {t('guidance.detail.computed.thresholds', {
              p2: rule.thresholds.P2_MIN,
              p1: rule.thresholds.P1_MIN,
              gray,
            })}
          </li>
        )}
        {triage?.band === 'FR' && (
          <li className="font-semibold text-ink">
            {t('guidance.detail.computed.grayZone', { gray })}
          </li>
        )}
        {(rule.fired ?? []).map((f) => (
          <li key={f} className="text-ink">
            {t(`guidance.detail.computed.fired.${f}`)}
          </li>
        ))}
        {rule.provisional && <li>{t('guidance.detail.computed.provisional')}</li>}
        <li>{t('guidance.detail.computed.retained')}</li>
      </ul>
    </div>
  );
}
```

**`src/features/guidance/RequestDetailPage.jsx`**

```jsx
// Fig 23 · one support request (2.1.3.6, 2.1.3.7, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.4, 2.1.5.2.5,
// 2.1.5.2.7; D-02, D-15, D-16, D-17, D-29; P08-D7..D10).
// Opening calls open_support_request(), which writes the audit row BEFORE returning the note.
// Status and follow-up changes are audited by the database (Phase 01 trigger).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ChevronLeft, Lock, Quote, Tag, BookUser } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CONCERN_TYPES, WORKFLOW_STATES, labelFor } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDate, formatDateTime, shortRef } from '../../lib/format.js';
import { manilaDate } from '../../lib/time.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  TextInput,
  buttonClasses,
} from '../../components/ui/index.js';
import { BandBadge } from './BandBadge.jsx';
import { ComputationTable } from './ComputationTable.jsx';
import { OfficeTagBadge } from './OfficeTagBadge.jsx';
import { followUpTimestamp } from './guidanceHelpers.js';

export function RequestDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', request: null });
  const opened = useRef(null);

  useEffect(() => {
    // One audited open per visit, even when React runs effects twice in development.
    if (opened.current === id) return;
    opened.current = id;
    supabase.rpc('open_support_request', { p_request_id: id }).then(({ data, error }) => {
      if (error) setState({ status: error.code === 'P0002' ? 'notFound' : 'error', request: null });
      else setState({ status: 'ready', request: data });
    });
  }, [id]);

  const retry = () => {
    opened.current = null;
    setState({ status: 'loading', request: null });
    supabase.rpc('open_support_request', { p_request_id: id }).then(({ data, error }) => {
      opened.current = id;
      if (error) setState({ status: error.code === 'P0002' ? 'notFound' : 'error', request: null });
      else setState({ status: 'ready', request: data });
    });
  };

  const back = (
    <Link
      to="/staff/queue"
      className="inline-flex min-h-11 items-center gap-1 text-[15px] text-ink"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t('guidance.detail.back')}
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="sr-only">{t('common.loading')}</p>
        <Skeleton lines={8} />
      </div>
    );
  }
  if (state.status === 'notFound') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={t('guidance.detail.notFound')} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  const r = state.request;
  const d = r.disclosed;
  const update = (patch) => setState((s) => ({ ...s, request: { ...s.request, ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      {back}
      <Card className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex flex-wrap items-center gap-3 text-[24px] font-semibold leading-8 text-ink md:text-[28px]">
            <span>
              {d.full_name} •{' '}
              {t('guidance.gradeSection', { grade: d.grade_level, section: d.section })}
            </span>
            <BandBadge band={r.triage?.band ?? 'FR'} />
          </h1>
          <p className="text-[15px] text-ink-muted">
            {t('guidance.detail.submitted', {
              time: formatDateTime(r.created_at),
              ref: shortRef(r.id),
            })}
          </p>
        </div>
        <StatusControl request={r} onSaved={(status) => update({ status })} />
      </Card>

      <p className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 text-[15px] text-ink">
        <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t('guidance.detail.auditNotice', { time: formatDateTime(r.viewed_at) })}
      </p>
      {location.state?.message === 'tagSaved' && (
        <p role="status" className="font-semibold text-ink">
          {t('guidance.detail.officeTagSaved')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-ink">{t('guidance.detail.sentTitle')}</h2>
          <p className="text-[14px] text-ink-muted">
            {t('guidance.detail.concern')}:{' '}
            <span className="font-semibold text-ink">
              {labelFor(CONCERN_TYPES, r.concern_type)}
            </span>
          </p>
          <h3 className="text-[14px] font-semibold text-ink-muted">{t('guidance.detail.note')}</h3>
          {r.note ? (
            <blockquote className="flex gap-2 whitespace-pre-wrap rounded-card bg-canvas p-4 text-[15px] text-ink">
              <Quote aria-hidden="true" className="size-4 shrink-0" />
              <span>{r.note}</span>
            </blockquote>
          ) : (
            <p className="text-[15px] text-ink-muted">{t('guidance.detail.noNote')}</p>
          )}
          <p className="border-t border-line pt-3 text-[13px] text-ink-muted">
            {t('guidance.detail.noteFooter')}
          </p>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2">
            <h2 className="text-[17px] font-semibold text-ink">
              {t('guidance.detail.sharedTitle')}
            </h2>
            <p className="text-[15px] text-ink">
              {t('guidance.detail.adviser')}:{' '}
              <span className="font-semibold">{d.class_adviser}</span>
            </p>
            {r.has_other_open_request && (
              <p className="font-semibold text-ink">{t('guidance.detail.otherOpen')}</p>
            )}
          </Card>
          <Card className="flex flex-col gap-2 bg-surface-muted">
            <h2 className="text-[17px] font-semibold text-ink">
              {t('guidance.detail.notAvailableTitle')}
            </h2>
            <p className="text-[15px] text-ink">{t('guidance.detail.notAvailableBody')}</p>
            <p className="text-[13px] text-ink-muted">{t('guidance.detail.notAvailableFooter')}</p>
          </Card>
        </div>
      </div>

      <Card>
        <details open className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[17px] font-semibold text-ink">
            {t('guidance.detail.computedTitle')}
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-3">
            <ComputationTable disclosed={d} triage={r.triage} />
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FollowUp request={r} onSaved={(follow_up_at) => update({ follow_up_at })} />
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-ink">
            {t('guidance.detail.officeTagTitle')}
          </h2>
          {r.office_tag ? (
            <div className="flex flex-col gap-1">
              <OfficeTagBadge tag={r.office_tag.tag} />
              <p className="text-[13px] text-ink-muted">
                {t('guidance.detail.officeTagBy', {
                  name: r.office_tag.assigned_by,
                  time: formatDateTime(r.office_tag.assigned_at),
                })}
              </p>
            </div>
          ) : (
            <p className="text-[15px] text-ink-muted">{t('guidance.detail.officeTagNone')}</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={`/staff/requests/${r.id}/tag`} className={buttonClasses('outline', 'md')}>
              <Tag aria-hidden="true" className="size-4" />
              {t('guidance.detail.assignTag')}
            </Link>
            <Link
              to={`/staff/referrals?request=${r.id}`}
              className={buttonClasses('outline', 'md')}
            >
              <BookUser aria-hidden="true" className="size-4" />
              {t('guidance.detail.directory')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusControl({ request, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const onChange = async (status) => {
    if (status === request.status || saving) return;
    setSaving(true);
    setMessage('');
    // .select().single() confirms the row really changed (00 must-never 16).
    const { data, error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', request.id)
      .select('id, status')
      .single();
    setSaving(false);
    if (error || data?.status !== status) {
      setMessage(t('guidance.detail.statusError'));
      return;
    }
    onSaved(status);
    setMessage(t('guidance.detail.statusSaved'));
  };
  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span aria-hidden="true" className="text-[14px] text-ink-muted">
          {t('guidance.detail.statusLabel')}
        </span>
        <SegmentedControl
          label={t('guidance.detail.statusLabel')}
          options={WORKFLOW_STATES}
          value={request.status}
          onChange={onChange}
        />
      </div>
      <p role="status" className="text-[14px] font-semibold text-ink">
        {message}
      </p>
      <p className="max-w-md text-[13px] text-ink-muted lg:text-right">
        {t('guidance.detail.referralHint')}
      </p>
    </div>
  );
}

function FollowUp({ request, onSaved }) {
  const current = request.follow_up_at ? manilaDate(request.follow_up_at) : '';
  const [date, setDate] = useState(current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const save = async (value) => {
    setSaving(true);
    setMessage('');
    const { data, error } = await supabase
      .from('support_requests')
      .update({ follow_up_at: value })
      .eq('id', request.id)
      .select('id, follow_up_at')
      .single();
    setSaving(false);
    if (error || !data) {
      setMessage(t('guidance.detail.followUpError'));
      return;
    }
    onSaved(data.follow_up_at);
    setMessage(value ? t('guidance.detail.followUpSaved') : t('guidance.detail.followUpCleared'));
    if (!value) setDate('');
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold text-ink">{t('guidance.detail.followUpTitle')}</h2>
      {current && (
        <p className="text-[14px] text-ink">
          {t('guidance.detail.followUpCurrent', { date: formatDate(request.follow_up_at) })}
        </p>
      )}
      <Field
        id="follow-up"
        label={t('guidance.detail.followUpLabel')}
        hint={t('guidance.detail.followUpHint')}
      >
        <TextInput
          type="date"
          value={date}
          min={manilaDate(new Date())}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => save(followUpTimestamp(date))}
          disabled={!date || saving}
          loading={saving}
        >
          {t('guidance.detail.followUpSave')}
        </Button>
        {current && (
          <Button variant="ghost" onClick={() => save(null)} disabled={saving}>
            {t('guidance.detail.followUpClear')}
          </Button>
        )}
      </div>
      <p role="status" className="text-[14px] font-semibold text-ink">
        {message}
      </p>
    </Card>
  );
}
```

### Step 5 — Office tag

**`src/features/guidance/OfficeTagPage.jsx`**

```jsx
// Fig 25 · assign office tag (2.1.3.4, 2.1.5.2.5; Table 13; D-06, D-33).
// The three tags are offered with NONE selected. Nothing on this page reads the band, the score,
// or the ratings, so nothing can hint at a tag. Each save adds a row; earlier tags stay.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { OFFICE_TAGS } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime } from '../../lib/format.js';
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import './office-tag.css';

export function OfficeTagPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, status: 'loading', request: null, latest: null });
  const [choice, setChoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const key = `${id}|${attempt}`;

  useEffect(() => {
    let active = true;
    // Header facts come from the queue view (no note, no audit row); the latest tag from office_tags.
    Promise.all([
      supabase
        .from('support_queue')
        .select('id, full_name, grade_level, section')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('office_tags')
        .select('tag, assigned_at, staff_accounts(display_name)')
        .eq('request_id', id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([req, tag]) => {
      if (!active) return;
      if (req.error || tag.error) setState({ key, status: 'error', request: null, latest: null });
      else if (!req.data) setState({ key, status: 'notFound', request: null, latest: null });
      else setState({ key, status: 'ready', request: req.data, latest: tag.data });
    });
    return () => {
      active = false;
    };
  }, [id, key]);

  const status = state.key === key ? state.status : 'loading';
  const backTo = `/staff/requests/${id}`;

  const onSave = async () => {
    setSaving(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('office_tags')
      .insert({ request_id: id, tag: choice })
      .select('id')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(t('guidance.tag.saveError'));
      return;
    }
    navigate(backTo, { replace: true, state: { message: 'tagSaved' } });
  };

  const back = (
    <Link to={backTo} className="inline-flex min-h-11 items-center gap-1 text-[15px] text-ink">
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t('guidance.tag.back')}
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {back}
      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {status === 'notFound' && <EmptyState title={t('guidance.detail.notFound')} />}
      {status === 'ready' && (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold leading-8 text-ink">
                {t('guidance.tag.title')}
              </h1>
              <p className="mt-1 text-[15px] text-ink-muted">{t('guidance.tag.lead')}</p>
              <p className="mt-2 text-[15px] font-semibold text-ink">
                {state.request.full_name} •{' '}
                {t('guidance.gradeSection', {
                  grade: state.request.grade_level,
                  section: state.request.section,
                })}
              </p>
            </div>
            <Chip className="self-start uppercase">{t('guidance.tag.chip')}</Chip>
          </div>
          <p className="text-[14px] text-ink">
            {state.latest
              ? t('guidance.tag.current', {
                  tag:
                    OFFICE_TAGS.find((x) => x.value === state.latest.tag)?.label ??
                    state.latest.tag,
                  name: state.latest.staff_accounts?.display_name ?? '',
                  time: formatDateTime(state.latest.assigned_at),
                })
              : t('guidance.tag.none')}
          </p>
          <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
            <legend className="mb-2 text-[15px] font-semibold text-ink">
              {t('guidance.tag.legend')}
            </legend>
            {OFFICE_TAGS.map((o) => (
              <label
                key={o.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line px-4"
              >
                <input
                  type="radio"
                  name="office-tag"
                  value={o.value}
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                  className="size-5 accent-[var(--color-action)]"
                />
                <span aria-hidden="true" className="office-tag-dot" data-tag={o.value} />
                <span className="text-[15px] text-ink">{o.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-[13px] text-ink-muted">{t('guidance.tag.history')}</p>
          <FormMessage>{error}</FormMessage>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onSave} disabled={!choice} loading={saving}>
              {t('guidance.tag.save')}
            </Button>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              {t('guidance.tag.cancel')}
            </Button>
          </div>
          <p className="flex items-center gap-2 border-t border-line pt-4 text-[13px] text-ink-muted">
            <Lock aria-hidden="true" className="size-4" />
            {t('guidance.tag.footer')}
          </p>
        </Card>
      )}
    </div>
  );
}
```

### Step 6 — Crisis channel and directory

**`src/features/guidance/CrisisChannelPage.jsx`**

```jsx
// Fig 24 · crisis channel (2.1.3.8, 2.1.5.2.3, 2.1.6.1.6; Table 11; D-05, D-16, D-17, D-24;
// P08-D11..D14). Crisis events are not a band and never enter the priority queue.
// Acknowledged / resolved state is derived from audit rows (D-05). Every event shown is logged
// once per visit with log_crisis_view().
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ShieldAlert, CircleCheck, BookUser, Lock, Phone } from 'lucide-react';
import { subDays } from 'date-fns';
import { t } from '../../copy/index.js';
import { HOTLINES, GUIDANCE_OFFICE } from '../../content/directory.js';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime, shortRef } from '../../lib/format.js';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  buttonClasses,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { useCrisisFeed } from './crisisFeed.js';
import { orderActive } from './guidanceHelpers.js';

const CRISIS_COLUMNS =
  'id, created_at, full_name, grade_level, section, class_adviser, protocol_ref, item_label, acknowledged_at, acknowledged_by, resolved_at, resolved_by';

export function CrisisChannelPage() {
  const feed = useCrisisFeed();
  const [state, setState] = useState({ status: 'loading', active: [], resolved: [] });
  const [attempt, setAttempt] = useState(0);
  const logged = useRef(new Set());

  const load = useCallback(async () => {
    const since = subDays(new Date(), 7).toISOString();
    const [active, resolved] = await Promise.all([
      supabase
        .from('crisis_channel')
        .select(CRISIS_COLUMNS)
        .is('resolved_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('crisis_channel')
        .select(CRISIS_COLUMNS)
        .gte('resolved_at', since)
        .order('resolved_at', { ascending: false }),
    ]);
    if (active.error || resolved.error) {
      setState((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'error' }));
      return;
    }
    const rows = [...(active.data ?? []), ...(resolved.data ?? [])];
    // Record the view of each event shown, once per visit (Table 17 view_crisis).
    for (const row of rows) {
      if (!logged.current.has(row.id)) {
        logged.current.add(row.id);
        supabase.rpc('log_crisis_view', { p_event_id: row.id }).then(({ error }) => {
          if (error && import.meta.env.DEV) console.error('log_crisis_view failed');
        });
      }
    }
    setState({
      status: 'ready',
      active: orderActive(active.data ?? []),
      resolved: resolved.data ?? [],
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after the fetch resolves
    load();
  }, [load, attempt, feed.version]);

  const afterAction = () => {
    feed.refresh?.();
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip className="self-start">
          <ShieldAlert aria-hidden="true" className="size-4" />
          {t('guidance.crisis.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('guidance.crisis.title')}
        </h1>
        <p className="max-w-3xl text-base text-ink-muted">{t('guidance.crisis.lead')}</p>
      </header>

      <section aria-labelledby="active-crisis" className="flex flex-col gap-3">
        <h2
          id="active-crisis"
          className="text-[13px] font-semibold uppercase tracking-wide text-ink"
        >
          {t('guidance.crisis.activeTitle')}
        </h2>
        {state.status === 'loading' && <Skeleton lines={5} />}
        {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
        {state.status === 'ready' && state.active.length === 0 && (
          <EmptyState title={t('guidance.crisis.none')} />
        )}
        {state.status === 'ready' &&
          state.active.map((e) => <CrisisEventCard key={e.id} event={e} onChanged={afterAction} />)}
      </section>

      <Card
        as="section"
        aria-labelledby="crisis-contacts"
        className="flex flex-col gap-3 bg-surface-muted"
      >
        <h2 id="crisis-contacts" className="text-[17px] font-semibold text-ink">
          {t('guidance.crisis.contactsTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {HOTLINES.map((h) => (
            <li key={h.id} className="rounded-card border border-line bg-surface p-4">
              <p className="font-semibold text-ink">{h.name}</p>
              <p className="text-[14px] text-ink-muted">{h.note}</p>
              <a
                href={`tel:${h.dial}`}
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-ink underline"
              >
                <Phone aria-hidden="true" className="size-4" />
                {h.number}
              </a>
            </li>
          ))}
          <li className="rounded-card border border-line bg-surface p-4">
            <p className="font-semibold text-ink">{t('guidance.referrals.office')}</p>
            <p className="text-[14px] text-ink-muted">
              {t('guidance.referrals.inCharge', {
                name: GUIDANCE_OFFICE.personInCharge,
                role: GUIDANCE_OFFICE.roleTitle,
              })}
            </p>
            <a
              href={`tel:${GUIDANCE_OFFICE.dial}`}
              className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-ink underline"
            >
              <Phone aria-hidden="true" className="size-4" />
              {GUIDANCE_OFFICE.phone}
            </a>
          </li>
        </ul>
      </Card>

      <section aria-labelledby="resolved-crisis" className="flex flex-col gap-3">
        <h2
          id="resolved-crisis"
          className="text-[13px] font-semibold uppercase tracking-wide text-ink"
        >
          {t('guidance.crisis.resolvedTitle')}
        </h2>
        {state.status === 'ready' &&
          (state.resolved.length === 0 ? (
            <p className="text-[15px] text-ink-muted">{t('guidance.crisis.resolvedNone')}</p>
          ) : (
            <div className="[&_td]:[overflow-wrap:break-word]">
              <Table
                caption={t('guidance.crisis.resolvedCaption')}
                getRowKey={(r) => r.id}
                rows={state.resolved}
                columns={[
                  {
                    key: 'student',
                    header: t('guidance.crisis.columns.student'),
                    render: (r) =>
                      `${r.full_name} • ${t('guidance.gradeSection', { grade: r.grade_level, section: r.section })}`,
                  },
                  {
                    key: 'raised',
                    header: t('guidance.crisis.columns.raised'),
                    render: (r) => formatDateTime(r.created_at),
                  },
                  {
                    key: 'ack',
                    header: t('guidance.crisis.columns.acknowledged'),
                    render: (r) =>
                      t('guidance.crisis.by', {
                        time: formatDateTime(r.acknowledged_at),
                        name: r.acknowledged_by,
                      }),
                  },
                  {
                    key: 'res',
                    header: t('guidance.crisis.columns.resolved'),
                    render: (r) =>
                      t('guidance.crisis.by', {
                        time: formatDateTime(r.resolved_at),
                        name: r.resolved_by,
                      }),
                  },
                ]}
              />
            </div>
          ))}
      </section>

      <p className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Lock aria-hidden="true" className="size-4" />
        {t('guidance.crisis.auditFooter')}
      </p>
    </div>
  );
}

function CrisisEventCard({ event, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (fn) => {
    setBusy(true);
    setError('');
    const { error: e } = await supabase.rpc(fn, { p_event_id: event.id });
    setBusy(false);
    if (e) {
      setError(t('guidance.crisis.actionError'));
      return;
    }
    onChanged();
  };
  const acknowledged = Boolean(event.acknowledged_at);
  return (
    <Card
      as="article"
      aria-labelledby={`crisis-${event.id}`}
      className="flex flex-col gap-4 border-2 border-ink"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={acknowledged ? 'strong' : 'ink'}>
          {acknowledged ? t('guidance.crisis.statusAcknowledged') : t('guidance.crisis.statusNew')}
        </Chip>
        <span className="text-[14px] text-ink-muted">
          {t('guidance.crisis.raised', { time: formatDateTime(event.created_at) })} •{' '}
          {shortRef(event.id)}
        </span>
      </div>
      <div>
        <h3 id={`crisis-${event.id}`} className="text-[20px] font-semibold text-ink">
          {event.full_name}
        </h3>
        <p className="text-[15px] text-ink">
          {t('guidance.gradeSection', { grade: event.grade_level, section: event.section })}
        </p>
        <p className="text-[14px] text-ink-muted">
          {t('guidance.crisis.adviser', { name: event.class_adviser })}
        </p>
      </div>
      <div className="rounded-card bg-canvas p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
          {t('guidance.crisis.itemTitle')}
        </p>
        <p className="mt-1 text-[17px] font-semibold text-ink">{event.item_label}</p>
        <p className="mt-1 text-[13px] text-ink-muted">{t('guidance.crisis.itemNote')}</p>
      </div>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
          {t('guidance.crisis.protocolTitle')}
        </p>
        <p className="mt-1 text-[15px] text-ink">
          {event.protocol_ref || t('guidance.crisis.noProtocol')}
        </p>
      </div>
      {acknowledged && (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t('guidance.crisis.acknowledged', {
            name: event.acknowledged_by,
            time: formatDateTime(event.acknowledged_at),
          })}
        </p>
      )}
      <FormMessage>{error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {!acknowledged ? (
          <Button onClick={() => act('acknowledge_crisis_event')} loading={busy}>
            {t('guidance.crisis.acknowledge')}
          </Button>
        ) : (
          <Button onClick={() => act('resolve_crisis_event')} loading={busy}>
            {t('guidance.crisis.resolve')}
          </Button>
        )}
        <Link to="/staff/referrals" className={buttonClasses('outline', 'md')}>
          <BookUser aria-hidden="true" className="size-4" />
          {t('guidance.crisis.directory')}
        </Link>
      </div>
      <p className="text-[13px] text-ink-muted">{t('guidance.crisis.resolveHint')}</p>
    </Card>
  );
}
```

**`src/features/guidance/ReferralsPage.jsx`**

```jsx
// Fig 26 · partner directory only (2.1.5.2.4; D-02 team decision: no referral notes; D-03 static).
// The four referral targets of manuscript 1.4, from src/content/directory.js. No student data.
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { GUIDANCE_OFFICE, HOTLINES, SPECIALISTS } from '../../content/directory.js';
import { Card, Chip } from '../../components/ui/index.js';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';

export function ReferralsPage() {
  const [params] = useSearchParams();
  const requestId = params.get('request');
  return (
    <div className="flex flex-col gap-6">
      {requestId && /^[0-9a-f-]{36}$/i.test(requestId) && (
        <Link
          to={`/staff/requests/${requestId}`}
          className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('guidance.referrals.back')}
        </Link>
      )}
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('guidance.referrals.title')}
        </h1>
        <p className="max-w-3xl text-base text-ink-muted">{t('guidance.referrals.lead')}</p>
        <p className="max-w-3xl text-[14px] text-ink">{t('guidance.referrals.noNotes')}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <Chip className="self-start">
            <Building2 aria-hidden="true" className="size-4" />
            {t('guidance.referrals.office')}
          </Chip>
          <p className="font-semibold text-ink">
            {t('guidance.referrals.inCharge', {
              name: GUIDANCE_OFFICE.personInCharge,
              role: GUIDANCE_OFFICE.roleTitle,
            })}
          </p>
          <p className="text-[14px] text-ink">
            {t('guidance.referrals.location', { value: GUIDANCE_OFFICE.location })}
          </p>
          <p className="text-[14px] text-ink">
            {t('guidance.referrals.hours', { value: GUIDANCE_OFFICE.hours })}
          </p>
          <ContactLine
            icon={Phone}
            href={`tel:${GUIDANCE_OFFICE.dial}`}
            text={t('guidance.referrals.contact', { value: GUIDANCE_OFFICE.phone })}
          />
        </Card>
        {SPECIALISTS.map((s) => (
          <Card key={s.id} className="flex flex-col gap-2">
            <Chip className="self-start">
              {s.kind === 'partner'
                ? t('guidance.referrals.partner')
                : t('guidance.referrals.external')}
            </Chip>
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="text-[14px] text-ink-muted">{s.description}</p>
            <ContactLine icon={Phone} text={t('guidance.referrals.contact', { value: s.phone })} />
            <ContactLine icon={Mail} text={t('guidance.referrals.email', { value: s.email })} />
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <Chip className="self-start">{t('guidance.referrals.hotlines')}</Chip>
          <ul className="flex flex-col gap-2">
            {HOTLINES.map((h) => (
              <li key={h.id} className="rounded-control bg-surface-muted p-3">
                <p className="font-semibold text-ink">{h.name}</p>
                <p className="text-[14px] text-ink-muted">{h.note}</p>
                <ContactLine icon={Phone} href={`tel:${h.dial}`} text={h.number} />
              </li>
            ))}
          </ul>
          <EmergencyNotice />
        </Card>
      </div>
    </div>
  );
}

function ContactLine({ icon: Icon, text, href }) {
  const body = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{text}</span>
    </>
  );
  return href ? (
    <a
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink underline"
    >
      {body}
    </a>
  ) : (
    <p className="flex items-center gap-2 text-[14px] text-ink">{body}</p>
  );
}
```

### Step 7 — Routes

The five guidance routes now use `GuidanceLayout` and the real screens. Only the admin routes still show `PhasePlaceholder` (Phase 09).

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
import { GuidanceLayout } from './features/guidance/GuidanceLayout.jsx';
import { QueuePage } from './features/guidance/QueuePage.jsx';
import { RequestDetailPage } from './features/guidance/RequestDetailPage.jsx';
import { OfficeTagPage } from './features/guidance/OfficeTagPage.jsx';
import { CrisisChannelPage } from './features/guidance/CrisisChannelPage.jsx';
import { ReferralsPage } from './features/guidance/ReferralsPage.jsx';

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
        <Route element={<GuidanceLayout />}>
          <Route path="staff/queue" element={<QueuePage />} />
          <Route path="staff/requests/:id" element={<RequestDetailPage />} />
          <Route path="staff/requests/:id/tag" element={<OfficeTagPage />} />
          <Route path="staff/crisis" element={<CrisisChannelPage />} />
          <Route path="staff/referrals" element={<ReferralsPage />} />
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

### Step 8 — Tests

**`src/features/guidance/testClient.js`** — test helper

```js
// Test helper for the guidance screens: a fake client whose tables and RPCs return set results.
// A table entry may be: one result, a list of results (used in call order), or a function
// (calls) => result that picks a result from the query's recorded calls.
import { vi } from 'vitest';
import { createMockSupabase } from '../../test/mockSupabase.js';

const METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'neq',
  'not',
  'is',
  'in',
  'gte',
  'lte',
  'lt',
  'gt',
  'order',
  'limit',
  'single',
  'maybeSingle',
  'range',
];

function lazyQuery(resolve) {
  const calls = [];
  const q = {
    calls,
    then: (ok, bad) =>
      Promise.resolve()
        .then(() => resolve(calls))
        .then(ok, bad),
  };
  for (const m of METHODS) {
    q[m] = (...args) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return q;
}

export function guidanceClient({ tables = {}, rpc = {} } = {}) {
  const c = createMockSupabase();
  const queries = {};
  c.from.mockImplementation((table) => {
    const spec = tables[table];
    let resolve;
    if (typeof spec === 'function') resolve = spec;
    else if (Array.isArray(spec)) {
      const result = spec.length > 1 ? spec.shift() : spec[0];
      resolve = () => result;
    } else resolve = () => spec ?? { data: [], error: null };
    const q = lazyQuery(resolve);
    (queries[table] ??= []).push(q);
    return q;
  });
  c.rpc.mockImplementation(async (name, args) => {
    const r = rpc[name];
    return typeof r === 'function' ? r(args) : (r ?? { data: null, error: null });
  });
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  c.channel.mockReturnValue(channel);
  return { client: c, queries, channel };
}
```

**`src/features/guidance/guidanceHelpers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  followUpTimestamp,
  markersFor,
  matchesStatus,
  orderActive,
  splitQueue,
} from './guidanceHelpers.js';

const row = (id, band, created_at, extra = {}) => ({
  id,
  band,
  created_at,
  status: 'pending',
  has_other_open_request: false,
  is_overdue: false,
  first_contact_at: null,
  ...extra,
});

describe('queue order (2.1.5.2.2)', () => {
  it('P1, P2, P3, oldest first within each; For Review in its own queue, oldest first', () => {
    const rows = [
      row('a', 'P3', '2026-10-12T01:00:00Z'),
      row('b', 'P1', '2026-10-12T03:00:00Z'),
      row('c', 'FR', '2026-10-12T02:00:00Z'),
      row('d', 'P1', '2026-10-12T02:00:00Z'),
      row('e', 'P2', '2026-10-11T02:00:00Z'),
      row('f', 'FR', '2026-10-11T02:00:00Z'),
      row('g', null, '2026-10-10T02:00:00Z'),
    ];
    const { priority, review } = splitQueue(rows);
    expect(priority.map((r) => r.id)).toEqual(['d', 'b', 'e', 'a']);
    expect(review.map((r) => r.id)).toEqual(['g', 'f', 'c']);
  });

  it('never reads an office tag', () => {
    const a = row('a', 'P2', '2026-10-12T01:00:00Z', { office_tag: 'x' });
    const b = row('b', 'P2', '2026-10-12T02:00:00Z');
    expect(splitQueue([b, a]).priority.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('status filters: open means pending, reviewed, referred', () => {
    expect(matchesStatus({ status: 'referred' }, 'open')).toBe(true);
    expect(matchesStatus({ status: 'resolved' }, 'open')).toBe(false);
    expect(matchesStatus({ status: 'resolved' }, 'resolved')).toBe(true);
    expect(matchesStatus({ status: 'resolved' }, 'all')).toBe(true);
  });
});

describe('markers (2.1.3.7, 2.1.3.8, 2.1.5.2.7)', () => {
  // Friday 16 Oct 2026, 10:00 Manila; due by the end of Tuesday 20 Oct (holidays not set).
  const created = '2026-10-16T02:00:00Z';
  it('shows each marker that applies, in a fixed order', () => {
    const r = row('a', 'P2', created, { has_other_open_request: true, is_overdue: true });
    expect(markersFor(r, new Date('2026-10-21T01:00:00Z'))).toEqual([
      'otherOpen',
      'followUpOverdue',
      'firstContactLate',
    ]);
  });
  it('no first-contact marker before the due day ends, after a first contact, or once resolved', () => {
    expect(markersFor(row('a', 'P2', created), new Date('2026-10-20T08:00:00Z'))).toEqual([]);
    expect(
      markersFor(
        row('a', 'P2', created, { first_contact_at: '2026-10-16T03:00:00Z' }),
        new Date('2026-10-30T01:00:00Z'),
      ),
    ).toEqual([]);
    expect(
      markersFor(row('a', 'P2', created, { status: 'resolved' }), new Date('2026-10-30T01:00:00Z')),
    ).toEqual([]);
  });
});

describe('crisis order and follow-up', () => {
  it('unacknowledged first, then longest waiting', () => {
    const rows = [
      { id: 'a', created_at: '2026-10-12T01:00:00Z', acknowledged_at: '2026-10-12T01:05:00Z' },
      { id: 'b', created_at: '2026-10-12T03:00:00Z', acknowledged_at: null },
      { id: 'c', created_at: '2026-10-12T02:00:00Z', acknowledged_at: null },
    ];
    expect(orderActive(rows).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
  it('a follow-up date ends at 23:59:59 Manila time', () => {
    expect(followUpTimestamp('2026-10-20')).toBe('2026-10-20T23:59:59+08:00');
  });
});
```

**`src/features/guidance/queue.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';
import { CrisisFeedContext } from './crisisFeed.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { QueuePage } = await import('./QueuePage.jsx');

const base = {
  concern_type: 'academic',
  follow_up_at: null,
  has_other_open_request: false,
  first_contact_at: null,
  is_overdue: false,
  grade_level: 12,
  class_adviser: 'Mr. Ramon Cruz',
};
const ROWS = [
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    band: 'P2',
    status: 'pending',
    full_name: 'Paolo Diaz',
    section: 'HUMSS-B',
    created_at: '2026-10-12T01:00:00Z',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    band: 'P1',
    status: 'reviewed',
    full_name: 'Ana Reyes',
    section: 'HUMSS-A',
    created_at: '2026-10-12T03:00:00Z',
    has_other_open_request: true,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    band: 'FR',
    status: 'pending',
    full_name: 'Miguel Tan',
    section: 'ABM-B',
    created_at: '2026-10-11T03:00:00Z',
    concern_type: 'wellness',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000004',
    band: 'P3',
    status: 'resolved',
    full_name: 'Sam Villanueva',
    section: 'TVL-A',
    created_at: '2026-10-10T03:00:00Z',
  },
];

function renderQueue(activeCount = 0) {
  const { client, queries } = guidanceClient({
    tables: { support_queue: { data: ROWS, error: null } },
  });
  mock.client = client;
  renderWithAuth(
    <Route
      path="/staff/queue"
      element={
        <CrisisFeedContext.Provider
          value={{ activeCount, version: 0, alert: false, dismissAlert: () => {} }}
        >
          <QueuePage />
        </CrisisFeedContext.Provider>
      }
    />,
    { path: '/staff/queue', auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return queries;
}

describe('QueuePage (Fig 21; 2.1.3.7; 2.1.5.2.2; D-14)', () => {
  it('reads the queue view with no note column', async () => {
    const queries = renderQueue();
    await screen.findByRole('table');
    const select = queries.support_queue[0].calls[0][1];
    expect(select).not.toMatch(/note/);
    expect(select).toMatch(/full_name/);
  });

  it('lists open priority requests P1 first, with only the allowed columns', async () => {
    renderQueue();
    const table = await screen.findByRole('table', {
      name: 'Support requests, in the order they should be seen',
    });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual([
      'Priority',
      'Student',
      'Class adviser',
      'Submitted',
      'Concern',
      'Status',
      'Notes',
      'Action',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'Ana ReyesGrade 12 · HUMSS-A',
      'Paolo DiazGrade 12 · HUMSS-B',
    ]);
    expect(within(rows[0]).getByText('Has another open request')).toBeInTheDocument();
    expect(
      within(rows[0]).getByRole('link', { name: 'Open the request from Ana Reyes' }),
    ).toHaveAttribute('href', '/staff/requests/00000000-0000-4000-8000-000000000002');
    expect(screen.queryByText('Sam Villanueva')).not.toBeInTheDocument(); // resolved, hidden by "Open"
    expect(screen.queryByText('Miguel Tan')).not.toBeInTheDocument(); // For Review queue
    expect(
      screen.getByText(
        "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning.",
      ),
    ).toBeInTheDocument();
  });

  it('For Review requests sit in their own queue', async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole('table');
    expect(screen.getByRole('radio', { name: 'Priority queue (2)' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'For Review (1)' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Miguel Tan')).toBeInTheDocument();
    expect(within(table).getByText('For Review')).toBeInTheDocument();
    expect(within(table).getByText("Something else about how I'm doing")).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'P1' })).not.toBeInTheDocument();
  });

  it('filters by priority and status', async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole('table');
    await user.click(screen.getByRole('radio', { name: 'P2' }));
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
    expect(screen.getByText('Paolo Diaz')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Priority' })).getByRole('radio', {
        name: 'All',
      }),
    );
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    expect(screen.getByText('Sam Villanueva')).toBeInTheDocument();
  });

  it('holds crisis events outside the queue in a banner', async () => {
    renderQueue(2);
    expect(await screen.findByText('2 crisis events need attention')).toBeInTheDocument();
    expect(screen.getByText('Outside the priority queue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open crisis channel/ })).toHaveAttribute(
      'href',
      '/staff/crisis',
    );
  });
});
```

**`src/features/guidance/detail.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { RequestDetailPage } = await import('./RequestDetailPage.jsx');

const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const REQUEST = {
  id: RID,
  created_at: '2026-10-12T00:14:00Z',
  status: 'pending',
  concern_type: 'family',
  follow_up_at: null,
  note: 'Please help.\nSecond line.',
  disclosed: {
    full_name: 'Ana Reyes',
    grade_level: 12,
    section: 'HUMSS-A',
    class_adviser: 'Mr. Ramon Cruz',
    c1: 5,
    c2: 5,
    c3: 1,
    c4: 1,
  },
  triage: {
    score: 3.8588,
    band: 'P1',
    computed_at: '2026-10-12T00:14:01Z',
    guardrails: {
      fired: ['anySingleAtMax', 'twoOrMoreHigh'],
      weights: { c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 },
      thresholds: { P2_MIN: 2.25, P1_MIN: 3.5 },
      grayZoneHalfWidth: 0.1,
      provisional: true,
    },
  },
  office_tag: null,
  has_other_open_request: false,
  viewed_at: '2026-10-12T00:22:00Z',
};

function renderDetail({
  rpc = { data: REQUEST, error: null },
  tables = {},
  strict = false,
  state,
} = {}) {
  const { client, queries } = guidanceClient({ rpc: { open_support_request: rpc }, tables });
  mock.client = client;
  const page = strict ? (
    <StrictMode>
      <RequestDetailPage />
    </StrictMode>
  ) : (
    <RequestDetailPage />
  );
  renderWithAuth(<Route path="/staff/requests/:id" element={page} />, {
    path: `/staff/requests/${RID}`,
    auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    state,
  });
  return { client, queries };
}

describe('RequestDetailPage (Fig 23; 2.1.3.6; 2.1.3.7)', () => {
  it('opens through open_support_request exactly once, even in StrictMode', async () => {
    const { client } = renderDetail({ strict: true });
    await screen.findByText(/Ana Reyes • Grade 12 · HUMSS-A/);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('open_support_request', { p_request_id: RID });
    expect(client.from).not.toHaveBeenCalled(); // the note is never read any other way
  });

  it('shows the note as written, the audit notice, and what is not available', async () => {
    renderDetail();
    expect(await screen.findByText(/Please help\.\s+Second line\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Your access to this request was recorded at 12 Oct 2026, 8:22 AM/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Submitted 12 Oct 2026, 8:14 AM • Ref 7c9e6679/)).toBeInTheDocument();
    expect(screen.getByText('Home and family')).toBeInTheDocument();
    expect(screen.getByText(/These are not readable by any staff account/)).toBeInTheDocument();
  });

  it('shows the stored computation without recomputing it', async () => {
    renderDetail();
    const table = await screen.findByRole('table', {
      name: 'Ratings and weights used for this request',
    });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Criterion', "Student's answer", 'Rating used (1–5)', 'Weight']);
    const c4 = within(table)
      .getByRole('rowheader', { name: 'C4 · Manageability / coping capacity' })
      .closest('tr');
    expect(
      within(c4)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Very much', '1', '0.1671']);
    expect(within(table).getByText('3.8588')).toBeInTheDocument();
    expect(
      screen.getByText('Floor applied: a criterion at 5 sets at least P2.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('These weights and thresholds are provisional until the scoring session.'),
    ).toBeInTheDocument();
    expect(table.textContent).not.toMatch(/1\.308|Weighted/);
  });

  it('a request sent with no check-in explains For Review with no score', async () => {
    renderDetail({
      rpc: {
        data: {
          ...REQUEST,
          disclosed: { ...REQUEST.disclosed, c1: null, c2: null, c3: null, c4: null },
          triage: { score: null, band: 'FR', guardrails: {} },
        },
        error: null,
      },
    });
    expect(
      await screen.findByText(/had no check-in when they sent this request/),
    ).toBeInTheDocument();
  });

  it('changes status and confirms only after the row comes back', async () => {
    const { queries } = renderDetail({
      tables: { support_requests: { data: { id: RID, status: 'reviewed' }, error: null } },
    });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.click(screen.getByRole('radio', { name: 'Reviewed' }));
    expect(await screen.findByText('Status saved.')).toBeInTheDocument();
    expect(queries.support_requests[0].calls).toEqual([
      ['update', { status: 'reviewed' }],
      ['eq', 'id', RID],
      ['select', 'id, status'],
      ['single'],
    ]);
    expect(screen.getByRole('radio', { name: 'Reviewed' })).toHaveAttribute('aria-checked', 'true');
  });

  it('says so when the status was not saved', async () => {
    renderDetail({ tables: { support_requests: { data: null, error: { code: 'PGRST116' } } } });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    expect(await screen.findByText('The status was not saved. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pending' })).toHaveAttribute('aria-checked', 'true');
  });

  it('sets a follow-up date as the end of that Manila day', async () => {
    const { queries } = renderDetail({
      tables: {
        support_requests: { data: { id: RID, follow_up_at: '2026-10-20T15:59:59Z' }, error: null },
      },
    });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.type(screen.getByLabelText('Follow up by'), '2026-10-20');
    await user.click(screen.getByRole('button', { name: 'Set follow-up date' }));
    expect(await screen.findByText('Follow-up date saved.')).toBeInTheDocument();
    expect(queries.support_requests[0].calls[0]).toEqual([
      'update',
      { follow_up_at: '2026-10-20T23:59:59+08:00' },
    ]);
  });

  it('links to the tag page and the directory; never offers referral notes', async () => {
    renderDetail();
    await screen.findByText(/Ana Reyes/);
    expect(screen.getByRole('link', { name: 'Assign office tag' })).toHaveAttribute(
      'href',
      `/staff/requests/${RID}/tag`,
    );
    expect(screen.getByRole('link', { name: 'Open partner directory' })).toHaveAttribute(
      'href',
      `/staff/referrals?request=${RID}`,
    );
    expect(screen.queryByText(/Add referral note/i)).not.toBeInTheDocument();
    expect(screen.getByText('No office tag yet.')).toBeInTheDocument();
  });

  it('not found and error states', async () => {
    renderDetail({ rpc: { data: null, error: { code: 'P0002' } } });
    expect(await screen.findByText('This request does not exist.')).toBeInTheDocument();
  });
});
```

**`src/features/guidance/OfficeTagPage.test.jsx`** — the file name starts with OfficeTag, so it may name the tag values (00 §10.4)

```jsx
// File name starts with OfficeTag, so it may name the office's tag values (00 Section 10.4).
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { OfficeTagPage } = await import('./OfficeTagPage.jsx');
const { OfficeTagBadge } = await import('./OfficeTagBadge.jsx');

const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const HEADER = {
  data: { id: RID, full_name: 'Ana Reyes', grade_level: 12, section: 'HUMSS-A' },
  error: null,
};

function renderTag({
  latest = { data: null, error: null },
  insert = { data: { id: 'x' }, error: null },
} = {}) {
  const { client, queries } = guidanceClient({
    tables: { support_queue: HEADER, office_tags: [latest, insert] },
  });
  mock.client = client;
  renderWithAuth(
    [
      <Route key="t" path="/staff/requests/:id/tag" element={<OfficeTagPage />} />,
      <Route key="d" path="/staff/requests/:id" element={<p>detail page</p>} />,
    ],
    { path: `/staff/requests/${RID}/tag`, auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return { client, queries };
}

describe('OfficeTagPage (Fig 25; 2.1.3.4; 2.1.5.2.5; D-33)', () => {
  it('offers the three tags with none selected and Save disabled', async () => {
    renderTag();
    expect(await screen.findByRole('heading', { name: 'Assign office tag' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.value)).toEqual(['green', 'yellow', 'red']);
    for (const r of radios) expect(r).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save tag' })).toBeDisabled();
    expect(screen.getByText('No office tag has been assigned yet.')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is the guidance office's own tag. HingaWeb never computes, suggests, or changes it.",
      ),
    ).toBeInTheDocument();
  });

  it('never reads the band, score, ratings, or note', async () => {
    const { queries } = renderTag();
    await screen.findByRole('heading', { name: 'Assign office tag' });
    expect(queries.support_queue[0].calls[0]).toEqual([
      'select',
      'id, full_name, grade_level, section',
    ]);
    expect(JSON.stringify(queries)).not.toMatch(/\bband\b|score|triage|\bnote\b|\bc1\b/);
  });

  it('saves only the chosen tag, then returns to the request', async () => {
    const { queries } = renderTag();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: 'Yellow' }));
    await user.click(screen.getByRole('button', { name: 'Save tag' }));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
    expect(queries.office_tags[1].calls).toEqual([
      ['insert', { request_id: RID, tag: 'yellow' }],
      ['select', 'id'],
      ['single'],
    ]);
  });

  it('shows the current tag and who set it, but still preselects nothing', async () => {
    renderTag({
      latest: {
        data: {
          tag: 'red',
          assigned_at: '2026-10-12T02:00:00Z',
          staff_accounts: { display_name: 'Guidance Associate (dev)' },
        },
        error: null,
      },
    });
    expect(
      await screen.findByText(
        'Current tag: Red, assigned by Guidance Associate (dev) on 12 Oct 2026, 10:00 AM.',
      ),
    ).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('says so when the tag was not saved', async () => {
    renderTag({ insert: { data: null, error: { code: '42501' } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: 'Green' }));
    await user.click(screen.getByRole('button', { name: 'Save tag' }));
    expect(await screen.findByText('The tag was not saved. Try again.')).toBeInTheDocument();
  });

  it('the badge shows the label staff chose', () => {
    renderWithAuth(<Route path="/" element={<OfficeTagBadge tag="green" />} />);
    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});
```

**`src/features/guidance/crisis-channel.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { CrisisChannelPage } = await import('./CrisisChannelPage.jsx');
const { GuidanceLayout } = await import('./GuidanceLayout.jsx');

const ev = (n, extra = {}) => ({
  id: `ccccccc${n}-0000-4000-8000-00000000000${n}`,
  created_at: `2026-10-12T0${n}:00:00Z`,
  full_name: `Student ${n}`,
  grade_level: 11,
  section: 'ABM-A',
  class_adviser: 'Ms. Liza Uy',
  protocol_ref: '[[GUIDANCE:crisis_protocol_step_1]]',
  item_label: '[[GUIDANCE:crisis_item_1]]',
  acknowledged_at: null,
  acknowledged_by: null,
  resolved_at: null,
  resolved_by: null,
  ...extra,
});

function renderChannel({
  active = [ev(2), ev(1, { acknowledged_at: '2026-10-12T01:05:00Z', acknowledged_by: 'GA' })],
  resolved = [],
  rpc = {},
} = {}) {
  const { client, queries, channel } = guidanceClient({
    tables: {
      crisis_channel: (calls) => {
        const select = calls.find((c) => c[0] === 'select');
        if (select[2]?.head) return { count: active.length, data: null, error: null };
        return calls.some((c) => c[0] === 'gte')
          ? { data: resolved, error: null }
          : { data: active, error: null };
      },
    },
    rpc,
  });
  mock.client = client;
  renderWithAuth(
    <Route element={<GuidanceLayout />}>
      <Route path="/staff/crisis" element={<CrisisChannelPage />} />
    </Route>,
    { path: '/staff/crisis', auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return { client, queries, channel };
}

describe('CrisisChannelPage (Fig 24; 2.1.3.8; 2.1.5.2.3; D-05)', () => {
  it('shows active events, new ones first, each with the item and protocol step; no priority', async () => {
    renderChannel();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Student 2',
      'Student 1',
    ]);
    expect(within(cards[0]).getByText('New')).toBeInTheDocument();
    expect(within(cards[0]).getByText('[[GUIDANCE:crisis_item_1]]')).toBeInTheDocument();
    expect(within(cards[0]).getByText('[[GUIDANCE:crisis_protocol_step_1]]')).toBeInTheDocument();
    expect(within(cards[1]).getByText(/Acknowledged by GA/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bP1\b|\bP2\b|score/);
    expect(
      screen.getByText(
        'Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests.',
      ),
    ).toBeInTheDocument();
  });

  it('records one view per event shown', async () => {
    const { client } = renderChannel();
    await screen.findAllByRole('article');
    await waitFor(() =>
      expect(
        client.rpc.mock.calls.filter(([n]) => n === 'log_crisis_view').map(([, a]) => a.p_event_id),
      ).toEqual([ev(2).id, ev(1).id]),
    );
  });

  it('acknowledge, then resolve, through the audited RPCs', async () => {
    const { client } = renderChannel({
      rpc: { acknowledge_crisis_event: { data: '2026-10-12T02:01:00Z', error: null } },
    });
    const user = userEvent.setup();
    const cards = await screen.findAllByRole('article');
    await user.click(within(cards[0]).getByRole('button', { name: 'Acknowledge' }));
    expect(client.rpc).toHaveBeenCalledWith('acknowledge_crisis_event', { p_event_id: ev(2).id });
    await user.click(within(cards[1]).getByRole('button', { name: 'Mark resolved' }));
    expect(client.rpc).toHaveBeenCalledWith('resolve_crisis_event', { p_event_id: ev(1).id });
  });

  it('the layout subscribes to new crisis events and alerts on any guidance screen', async () => {
    const { client, channel } = renderChannel();
    await screen.findAllByRole('article');
    expect(client.channel).toHaveBeenCalledWith('guidance-crisis-events');
    const [event, filter, onInsert] = channel.on.mock.calls[0];
    expect(event).toBe('postgres_changes');
    expect(filter).toEqual({ event: 'INSERT', schema: 'public', table: 'crisis_events' });
    await act(async () => onInsert({ new: {} }));
    expect(screen.getByText('A new crisis event was raised.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /2 active crisis events/ }).length).toBeGreaterThan(
      0,
    );
  });
});
```

**`src/features/guidance/referrals.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext } from '../../lib/auth/AuthContext.js';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';
import { SPECIALISTS } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ReferralsPage } = await import('./ReferralsPage.jsx');

describe('ReferralsPage (Fig 26 directory only; D-02, D-03)', () => {
  it('shows the static partners and hotlines, no note form, and reads nothing', () => {
    const { client } = guidanceClient();
    mock.client = client;
    renderWithAuth(<Route path="/staff/referrals" element={<ReferralsPage />} />, {
      path: '/staff/referrals',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Partner directory' }),
    ).toBeInTheDocument();
    for (const s of SPECIALISTS) expect(screen.getByText(s.name)).toBeInTheDocument();
    expect(screen.getByText(/Referral notes are not kept in HingaWeb/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('links back to the request it was opened from', () => {
    mock.client = guidanceClient().client;
    const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    // renderWithAuth takes a pathname only, so this test builds its own router with a query string.
    render(
      <AuthContext.Provider value={fakeAuth({ account: GUIDANCE, aal: AAL2 })}>
        <MemoryRouter initialEntries={[`/staff/referrals?request=${id}`]}>
          <Routes>
            <Route path="/staff/referrals" element={<ReferralsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: 'Back to support request' })).toHaveAttribute(
      'href',
      `/staff/requests/${id}`,
    );
  });
});
```

**`e2e/phase-08/guidance.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { staffLogin, studentLogin } from '../helpers/auth.js';

// Needs the local stack, `npx supabase functions serve`, and `node scripts/dev-enrol-totp.js`.
// Run right after `npx supabase db reset`. Adds rows, so it runs once (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const NOTE = 'Phase 08 E2E note. Please ignore.';

test.describe('Phase 08 · guidance dashboard (Figs 21, 23, 24, 25, 26)', () => {
  test('setup: a student sends a request after a check-in', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    const picks = ['Very much', 'Very much', 'Not at all', 'Not at all', 'Low', 'Quite a lot'];
    const groups = page.getByRole('radiogroup');
    for (let i = 0; i < picks.length; i += 1) {
      await groups.nth(i).getByRole('radio', { name: picks[i], exact: true }).click();
    }
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Continue to send a request' }).click();
    await page.getByLabel('What is this mostly about?').selectOption('academic');
    await page.getByLabel(/Is there anything you want them to know/).fill(NOTE);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
  });

  test('the queue lists the request without the note', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    const row = page.getByRole('row', { name: /Ana Reyes/ });
    await expect(row).toBeVisible();
    await expect(row.getByText('P1')).toBeVisible(); // stored (5, 5, 1, 5): S = 4.5272 -> P1
    await expect(row.getByText('School work')).toBeVisible();
    await expect(page.getByText(NOTE)).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('opening shows the note, records the access, and status changes are saved', async ({
    page,
  }) => {
    await staffLogin(page, 'guidance.one@example.test');
    const opened = page.waitForResponse((r) =>
      r.url().includes('/rest/v1/rpc/open_support_request'),
    );
    await page
      .getByRole('row', { name: /Ana Reyes/ })
      .getByRole('link', { name: 'Open the request from Ana Reyes' })
      .click();
    expect((await opened).status()).toBe(200);
    await expect(page.getByText(NOTE)).toBeVisible();
    await expect(page.getByText(/Your access to this request was recorded at/)).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Ratings and weights used for this request' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole('radio', { name: 'Reviewed' }).click();
    await expect(page.getByText('Status saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Reviewed' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('assigning an office tag starts with nothing selected', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await page
      .getByRole('row', { name: /Ana Reyes/ })
      .getByRole('link', { name: /Open the request/ })
      .click();
    await page.getByRole('link', { name: 'Assign office tag' }).click();
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(radios.nth(i)).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Save tag' })).toBeDisabled();
    await radios.nth(1).check();
    await page.getByRole('button', { name: 'Save tag' }).click();
    await expect(page.getByText('Office tag saved.')).toBeVisible();
  });

  test('a crisis tick reaches an open dashboard at once, then is acknowledged and resolved', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    await page.waitForTimeout(1500); // let the Realtime subscription join

    const studentContext = await browser.newContext();
    const student = await studentContext.newPage();
    await studentLogin(student, 'student.full@example.test');
    await student.getByLabel('[[GUIDANCE:crisis_item_1]]').click();
    await expect(student.getByText('The guidance office has been told.')).toBeVisible();
    await studentContext.close();

    await expect(page.getByText('A new crisis event was raised.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/crisis events? needs? attention/)).toBeVisible();
    await page.getByRole('link', { name: 'Open crisis channel' }).first().click();
    const card = page.getByRole('article').filter({ hasText: 'Ana Reyes' }).first();
    await expect(card.getByText('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await card.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(card.getByText(/Acknowledged by/)).toBeVisible();
    await card.getByRole('button', { name: 'Mark resolved' }).click();
    await expect(
      page.getByRole('table', { name: 'Crisis events resolved in the last 7 days' }),
    ).toContainText('Ana Reyes');
  });

  test('the partner directory has no note form', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await page.getByRole('link', { name: 'Referrals' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Partner directory' })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });
});
```

Run:

```bash
npm run verify
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-08
```

### Step 9 — Hosted project

Nothing to deploy beyond the site. Check in the dashboard that **Database → Publications → supabase_realtime** lists `crisis_events` only (Phase 01).

---

## 6. Must never (this phase)

1. Never fetch or show a request's note except through `open_support_request()`, and never call it more than once per visit.
2. Never read `checkins`, `prompt_events`, `resource_views`, `consent_records`, or `students` from any guidance code.
3. Never compute, suggest, preselect, default, or sort by an office tag, and never show the band, score, or ratings on the tag page.
4. Never recompute the score or weighted values in the browser; show only what was stored.
5. Never put a crisis event in the priority queue, give it a band, or make it wait for a refresh: the Realtime alert must reach every guidance screen.
6. Never show a prompt dismissal, a count of students without requests, or any list of students who did not ask.
7. Never show "saved" before the database returns the changed row.
8. Never add referral notes, tag notes, or crisis resolution notes (D-02, D-05, D-06).
9. Never show a student ID or an invented code; only "Ref" + 8 characters.
10. Never use a traffic-light colour outside `OfficeTag*.jsx` and `office-tag.css`, and there only for a tag staff chose.
11. Never insert audit rows by hand from the UI; they come from the RPCs and the Phase 01 triggers.
12. Never keep queue or crisis data in browser storage.
13. Never use diagnostic words on staff screens either (00 §10.3 staff list).

---

## 7. Acceptance checklist

Record `phase-08: acceptance passed (checks 1–12)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 253 tests pass; lint, copy, colours OK; build OK |
| 2 | End to end | `db reset`, enrol TOTP, functions serving, `npm run test:e2e -- e2e/phase-08` | 6 pass on desktop; 6 skipped on mobile |
| 3 | No note in the list | sign in as `guidance.one`, DevTools → Network → `support_queue` response | no `note` field; the note appears only after "Open" |
| 4 | Queue order | `db reset`, run the SQL below in Studio, open `/staff/queue` | Priority tab: P1, then P2, then P3; For Review tab: the FR request; nothing about tags affects order |
| 5 | Audit trail | open one request, change its status, set a follow-up date, assign a tag; Studio → `staff_access_audit` | rows `view_request`, `state_change`, `follow_up`, `tag` (and `view_request` again after returning from the tag page) with your staff id |
| 6 | Confirmed saves | DevTools → Network → **Offline**, change the status | "The status was not saved. Try again."; the old status stays selected |
| 7 | Tag never preselected | open the tag page twice, before and after saving a tag | no option is ticked either time; "Save tag" disabled until you choose |
| 8 | Live crisis alert | staff on `/staff/referrals`; in another browser, `student.full` ticks a crisis item | within a few seconds the staff page shows "A new crisis event was raised." and the Crisis badge count goes up, without reloading |
| 9 | Crisis handling | open the channel, Acknowledge, then Mark resolved | "Acknowledged by Guidance Associate (dev) at …"; the event moves to "Resolved in the last 7 days"; Studio → `staff_access_audit` has `view_crisis`, `crisis_acknowledged`, `crisis_resolved` |
| 10 | Not found | open `/staff/requests/00000000-0000-4000-8000-000000000000` | "This request does not exist."; no new audit row |
| 11 | Other roles | sign in as `admin.one` and open `/staff/queue`; as `student.full` open `/staff/queue` | both are sent to their own home page |
| 12 | Mobile, keyboard, timeout | 390 px; Tab through queue, detail, tag, crisis; then leave a dashboard tab idle for 15 minutes | no horizontal page scroll (the computation table scrolls inside its box and is focusable); visible focus ring; the Fig 22 overlay appears after 15 minutes |

SQL for check 4 (local only; four requests for `student.full`, one per band; `guardrails` left empty, so the detail page shows no weights for these rows). **Run each block on its own** (select it in the Studio SQL editor, then Run): each request must follow its own check-in, and statements run together share one timestamp, so the second block would be refused as `stale_checkin`.

```sql
-- Run 1 of 4 (P3)
do $$
declare s uuid := '11111111-1111-4111-8111-111111111111'; c uuid;
begin
  insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress) values (s, 1, 1, 1, 1, 3, 2) returning id into c;
  perform public.create_support_request(s, c, null, 'academic', 1.0000, 'P3', '{}'::jsonb);
end $$;

-- Run 2 of 4 (P2)
do $$
declare s uuid := '11111111-1111-4111-8111-111111111111'; c uuid;
begin
  insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress) values (s, 2, 3, 2, 2, 3, 3) returning id into c;
  perform public.create_support_request(s, c, null, 'family', 2.4531, 'P2', '{}'::jsonb);
end $$;

-- Run 3 of 4 (P1)
do $$
declare s uuid := '11111111-1111-4111-8111-111111111111'; c uuid;
begin
  insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress) values (s, 5, 5, 1, 1, 2, 4) returning id into c;
  perform public.create_support_request(s, c, null, 'peer', 3.8588, 'P1', '{}'::jsonb);
end $$;

-- Run 4 of 4 (FR)
do $$
declare s uuid := '11111111-1111-4111-8111-111111111111'; c uuid;
begin
  insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress) values (s, 2, 2, 2, 3, 3, 3) returning id into c;
  perform public.create_support_request(s, c, null, 'wellness', 2.1671, 'FR', '{}'::jsonb);
end $$;
```

The "Follow-up overdue" and "No first contact in 3 school days" markers depend on dates passing; they are covered by `guidanceHelpers.test.js`, `time.test.js`, and the Phase 01 database tests for `is_overdue`.
