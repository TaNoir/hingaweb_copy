# HingaWeb Implementation Plan — 09 · Administrator Console

> Upload order: `00` (v1.3), `01` … `08`, then this file. Phase 08 acceptance must have passed.
> Every file in this phase is given **in full**, except `supabase/config.toml`, where you **append** the block shown.

**What was verified when this plan was written:** `npm run verify` passes (**283 unit and component tests**). `admin-accounts` was started under Deno 2 with its real `npm:` imports and answered a smoke request correctly. Against the real Phase 01 schema in Postgres 16, acting as `admin.one` at aal2: recording a parental consent opened Tier 2 for that student, and a withdrawal closed it at once; a crisis item was added and then retired; a resource was published (the database stamped `verified_at`), moved back to draft, and deleted; another staff member's role was changed; changing your own role was refused with the Phase 01 trigger message; reading check-ins, support requests, crisis events, or a request's note returned nothing or was refused. With a production build in Chromium and a simulated administrator session at aal2, all seven admin screens and their dialogs had **0 axe WCAG 2.1 A/AA violations** at 1280 px and 390 px. The Playwright specs in `e2e/phase-09` run for the first time on Jared's machine; if one fails, fix the app, change only selectors or waits, and note it in `docs/questions.md`.

**A bug from Phase 02 is fixed here.** `Dialog` re-ran its focus code every time its parent re-rendered, so typing in a field inside a dialog threw focus back to the first control after each key. Phase 08 dialogs had no text fields, so nobody saw it. Step 1 replaces `src/components/ui/Dialog.jsx` and adds a test that fails on the old file.

---

## 1. Goal

1. **Accounts and roles** (Figs 27–28; 2.1.5.3.1, 2.1.6.2.9): list staff accounts, invite a new guidance or administrator account by email (no password is set by the administrator), change a role, deactivate and reactivate. Students are counted, never listed.
2. **Consent register** (Fig 29; 2.1.5.3.2, 2.1.6.2.3): see both records for each student, record parental consent (D-26), record a withdrawal on the original record.
3. **Reference data** (Fig 30; 2.1.5.3.2, 2.1.5.1.3): publish the crisis item set agreed with the guidance office, retire items, never edit or delete them.
4. **Resource library and attribute tags** (Figs 31–32; 2.1.5.3.3, 2.2.2.4): add, edit, publish (naming the verifier), unpublish, and delete resources and their four attribute values.
5. **Audit trail** (Fig 33; 2.1.3.6, 2.1.6.2.8): read-only list of who opened or acted on a support request or crisis event, with filters and a CSV export.

### 1.1 Prerequisites

Phase 08 acceptance passed. `node scripts/dev-enrol-totp.js` has been run (staff sign-in needs TOTP). The local Supabase stack is running (its mail catcher, Mailpit, receives the invitation email).

### 1.2 Not in this phase

Lazy loading, the bundle-size check, security headers, deployment, backups, and the runbook (Phase 10). Editing the referral directory or hotlines: they live in `src/content/directory.js` and change only through a reviewed update (D-03). Any audit entry for an administrator action (D-04).

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Accounts and roles | Fig 27 | 2.1.5.3.1, 2.1.6.2.9; Table 8 (`staff_accounts`); D-04 |
| Create staff account | Fig 28 | 2.1.5.3.1, 2.1.6.2.9; D-04 |
| Consent register | Fig 29 | 2.1.5.3.2, 2.1.6.2.3; Table 14; D-26, D-27 |
| Reference data (crisis items) | Fig 30 | 2.1.5.1.3, 2.1.5.3.2; Table 12; D-03, D-24 |
| Resource library | Fig 31 | 2.1.5.3.3; Table 16; D-07 |
| Resource attribute tags | Fig 32 | 2.1.5.3.3, 2.2.2.4; Table 16; D-07 |
| Audit trail | Fig 33 | 2.1.3.6, 2.1.6.2.8; Table 17; D-04, D-16 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure or other source shows | Ruling |
|---|---|---|---|
| P09-D1 | 2.1.5.3.1: students self-register; the administrator "holds the widest permissions … and the narrowest view of student wellbeing data" (Fig 27 caption) | Fig 27 lists students (Ana Reyes, Miguel Tan, Paolo Diaz) in the accounts table, with a "Student" role filter and "Reactivate" on a student | Students are **not listed**. A count card shows how many there are. Role filter: All · Guidance · Administrator. Line under the table: "Students are not listed here. Their private check-ins close when a consent is withdrawn in the consent register." |
| P09-D2 | D-04 (Table 17 can only hold request and crisis actions) | Fig 27 footer "Every role change and deactivation is written to the audit trail."; Fig 28 "Account creation is written to the audit trail." | Both lines removed. No admin screen claims admin actions are audited |
| P09-D3 | D-02 (no referral notes), D-03 (directory lives in the content file) | Fig 28 role descriptions "add referral notes", "configure institutional directory references"; chips "Counseling staff", "System steward"; a drop-down "Select a role…" | Role is two radio cards, **none preselected**, with the descriptions in §3.2. No chips |
| P09-D4 | — | Fig 27 table: Name · Role · Status · Last sign in · Actions; three empty count cards; the administrator's own row has no actions | Columns: Name · Email · Role · Status · Last sign in · Actions. Count cards: Students, Guidance, Administrators. Your own row shows "This is your account" instead of buttons (the Phase 01 trigger refuses changes to your own role or status anyway) |
| P09-D5 | 2.1.6.2.9: created without a password; the staff member sets one and enrols an authenticator on first sign-in | No figure shows how the account is made | The browser calls the `admin-accounts` Edge Function, which sends a Supabase invitation email whose link opens `/staff/setup` (Phase 02). The service key never reaches the browser. Message: "Invitation sent to {email}." |
| P09-D6 | D-26: add "Record parental consent" | Fig 29 shows only "Record withdrawal" | "Record parental consent" shows when the student's newest parental record is not granted. It needs the form version exactly as printed and a tick: "I hold the signed parental consent form for {name}." Student assent is recorded by the student in the Phase 04 walkthrough, never here |
| P09-D7 | D-17 (grade and section, not strand); Table 14 keeps one row per record | Fig 29 columns "Grade and strand", one "Form version", one "Recorded", one "Withdrawn" column for both records | Columns: Student · Grade and section · Parental consent · Student assent · Actions. Each record cell reads "Recorded {date} · form {version}", "Withdrawn {date} · form {version}", or "Not recorded". Filter adds "No assent yet" |
| P09-D8 | D-27: Tier 2 needs both records granted; 2.1.5.1.2 | Fig 29 lead "before a student can complete a check-in", card notes "Eligible to complete check-ins", "Pending parent signature", "Active withdrawals on file" | Copy says "private check-ins" (Tier 2) because Tier 1 needs no consent. The withdrawal dialog asks which record is withdrawn when both are granted, and marks **every** granted record of that type withdrawn, so no older record keeps Tier 2 open. No reason field (Table 14 has none) |
| P09-D9 | D-03: the directory and hotlines are in `src/content/directory.js` | Fig 30 lead "Manage system reference lists, validated guidance prompts, and formal referral directories." | This screen manages the crisis item set only. Lead says the directory and hotlines change only through a reviewed update |
| P09-D10 | Fig 30 caption: items are "co-designed with the guidance office and published rather than authored by the administrator" | Fig 30 button "Propose new item" (no approval step exists in the schema) | Button "Add agreed item". The dialog needs a tick: "This wording and protocol step were agreed with the guidance office." The item set itself is a GUIDANCE placeholder; the seed has placeholder items only |
| P09-D11 | Phase 01 trigger: an item's text, protocol step, and version never change; it can only be retired | Fig 30 columns Item text · Referral protocol · Status ("Retired in v1.1"); blank rows | Columns: Item text · Protocol step · Version · Status · Actions. Status "Active" or "Retired" (retired text struck through). Only action: "Retire". No edit, no delete |
| P09-D12 | Table 16: published = `verified_by` and `verified_at` set | Fig 31 "Topics" column, "Edit tags", search "title or topic", and a **Draft** row that already has a verifier and a verified date | Column "Main topic" = the area with the highest value (Phase 06 `primaryArea`). Action "Edit". Search by title; topic filter by main topic. A draft has no verifier, so its Verified by / Verified on cells are empty |
| P09-D13 | Table 16 has no summary column | Fig 32 "Summary" field; area hints "Academic, workload, grades", "Household, domestic routine", "College, career decisions", "Stress response, daily sleep"; scale "0 (Neutral) to 5 (High Focus)" | No summary field. Hints match the check-in areas (§3.6). Scale: "Scale: 0 (not about this) to 5 (mainly about this)". At least one area must be above 0 (Table 16 check) |
| P09-D14 | D-04; 2.1.5.3.3 "recording who verified each resource and when" (Fig 31 caption) | Fig 32 a bare Draft/Published toggle and "The change is written to the audit trail."; no way to remove a resource | Publishing needs a "Verified by" choice (an active staff member) and a tick; the database stamps `verified_at`. Draft clears the verifier. "Delete resource" added with a confirmation (its `resource_views` rows go with it, Phase 01 cascade). The audit sentence is removed |
| P09-D15 | D-04: Table 17 holds request and crisis actions only | Fig 33 rows "Signed in", "Published resource", "Changed role", "Recorded consent withdrawal", "Published crisis item set" | Only the Table 17 actions appear. The Action filter lists the `AUDIT_ACTIONS` labels from `src/config/vocabulary.js` (00) |
| P09-D16 | D-16: no invented codes; the trail never records what a student wrote | Fig 33 objects "SR-2024-089", "CE-2024-014", a student's name "Sam Villanueva" | Record column: "Support request Ref 7c9e6679" or "Crisis event Ref 1a2b3c4d". Never a student name |
| P09-D17 | — | Fig 33 "Export log", one "All recorded dates" picker, filter chips "Actor" and "Action" | "From" and "To" date fields (whole Manila days), "Action" and "Staff member" selects, 200 entries per page with "Load older entries", and "Export CSV", which exports the entries currently loaded with the current filters |

---

## 2. Files in this phase

**New:**
- `supabase/functions/admin-accounts/`: `handler.js`, `index.js`, `handler.test.js`
- `src/copy/en/admin.js`
- `src/features/admin/`: `adminHelpers.js`, `AccountsPage.jsx`, `ConsentPage.jsx`, `ReferencePage.jsx`, `ResourceLibraryPage.jsx`, `ResourceEditPage.jsx`, `AuditPage.jsx`
- Tests: `src/components/ui/Dialog.test.jsx`, `src/features/admin/adminHelpers.test.js`, `accounts.test.jsx`, `consent.test.jsx`, `reference.test.jsx`, `resources-admin.test.jsx`, `audit.test.jsx`; `e2e/phase-09/admin.spec.js`

**Changed (replace the whole file):** `src/components/ui/Dialog.jsx` (focus bug, Phase 02 file), `src/components/layout/AdminLayout.jsx` (the "Admin console" chip hides on phones so the header fits at 390 px), `src/copy/en/index.js`, `src/routes.jsx` (every admin route gets its real screen; `PhasePlaceholder` is no longer imported).

**Changed (append):** `supabase/config.toml`.

---

## 3. Screens

Every screen: guard `RequireStaff role="administrator"` (aal2), layout `AdminLayout` → Phase 02 `StaffLayout` (15-minute idle sign-out). Nav: Accounts · Consent · Reference data · Resources · Audit. All times are Manila (`formatDateTime`, `formatDate`). Every screen has a loading skeleton, an error state with "Try again", an empty state, and the offline banner from Phase 02. Every save waits for the database to return the changed row before it says "Saved." (00 must-never 16). Copy below is quoted from `src/copy/en/admin.js`; the file in Step 2 is the source.

### 3.1 Accounts and roles — `/admin/accounts`

- Figure: Fig 27. Component: `AccountsPage` (no props).
- h1 "Accounts and roles"; lead "Students create their own accounts. Guidance and administrator accounts are created here and cannot be self-registered."; button "Create staff account".
- Count cards: "Students" / "Self-registered accounts" (head count of `students`, no rows read), "Guidance" / "Active guidance accounts", "Administrators" / "Active administrator accounts".
- Search "Search by name"; role filter "Role": All · Guidance · Administrator.
- Table (caption "Staff accounts"): Name · Email · Role · Status ("Active" / "Deactivated") · Last sign in (time or "Not yet") · Actions. Actions: "Change role" (accessible name "Change the role of {name}") and "Deactivate" / "Reactivate" (accessible names "Deactivate {name}" / "Reactivate {name}"). Your own row: "This is your account". Empty: "No accounts match."
- Under the table: "Students are not listed here. Their private check-ins close when a consent is withdrawn in the consent register."
- Card "What this account cannot do": "Read any student's check-ins." / "Read the contents of a support request or a crisis event." / "Edit or delete an audit entry."
- **Change role dialog** ("Change role", "Choose the role for {name}.", radios Guidance / Administrator, "Save role", "Cancel").
- **Deactivate dialog** ("Deactivate this account?", "{name} will no longer be able to open any staff screen. Their name stays on past records.", "Deactivate account", "Cancel"). **Reactivate dialog** ("Reactivate this account?", "{name} will be able to sign in again with their password and authenticator.", "Reactivate account", "Cancel").
  - Both save with `update(patch).eq('id', id).select('id, role, is_active').single()`. Success: "Saved." Errors, mapped from the Phase 01 trigger messages by `staffUpdateErrorKey`: "You cannot change your own role or status." / "There must always be at least one active administrator." / anything else "That was not saved. Try again."
- Data: `admin-accounts` `{ action: 'list' }` (staff rows plus email and last sign-in), `students` head count. Writes `staff_accounts.role`, `staff_accounts.is_active`.

### 3.2 Create staff account — dialog on `/admin/accounts`

- Figure: Fig 28. Component: `CreateStaffDialog` inside `AccountsPage.jsx`.
- Title "Create staff account". Fields: "Full name"; "Work email address"; "Role" — two radio cards, none selected:
  - "Guidance" — "Opens the support request queue, reads submitted requests, handles crisis events, and assigns office tags."
  - "Administrator" — "Manages accounts, the consent register, the crisis item set, and the resource library, and reads the audit trail. Cannot read support requests or crisis events."
- Note "Guidance accounts can read support requests. Administrator accounts cannot." Box "What happens next" — "The account is created without a password. The staff member gets an email invitation, sets a password, and registers an authenticator app on first sign in."
- Buttons "Create account", "Cancel". Field errors: "Enter the full name (2 to 120 characters)." / "Enter a valid email address." / "Choose a role." Server errors: 409 `email_taken` → "That email address already has an account."; anything else → "The account was not created. Try again."
- Success: dialog closes, the list reloads, message "Invitation sent to {email}."
- Calls `admin-accounts` `{ action: 'create', email, display_name, role }`.

### 3.3 Consent register — `/admin/consent`

- Figure: Fig 29. Component: `ConsentPage`.
- h1 "Consent register"; lead "Parental consent and student assent must both be recorded before a student can use private check-ins."
- Cards: "Both recorded" / "Private check-ins open"; "Awaiting parental consent" / "Assent given, parental consent not yet recorded"; "Withdrawn" / "A consent or assent was withdrawn".
- Search "Search by student name"; filter "Show": All · Both recorded · Awaiting · Withdrawn · No assent yet.
- Table (caption "Consent and assent for each student"): Student · Grade and section ("Grade {n} · {section}") · Parental consent · Student assent · Actions. Each record cell uses the student's newest record of that type (`consentRows`). Actions: "Record parental consent" (when the newest parental record is not granted) and "Record withdrawal" (when either record is granted). Empty: "No students match."
- Card "Withdrawal": "A withdrawal takes effect at once. The student keeps the public guides, the directory, and the crisis information, which need no consent." Footer: "Consent records are never deleted. A withdrawal is written on the original record with its date."
- **Record parental consent dialog**: "For {name}. Record this only when you hold the signed consent form."; "Form version" (hint "Exactly as printed on the signed form.", error "Enter the form version (1 to 40 characters)."); tick "I hold the signed parental consent form for {name}."; "Record consent" (disabled until ticked) / "Cancel". Saves `insert({ student_id, type: 'parental', instrument_version }).select('id').single()`. Failure: "The consent was not recorded. Try again."
- **Record withdrawal dialog**: "For {name}. Private check-ins close as soon as this is saved."; "What is being withdrawn?" (Parental consent / Student assent; only granted ones are offered; preselected only when there is just one); tick "I have this withdrawal on record."; "Record withdrawal" / "Cancel". Saves `update({ status: 'withdrawn' }).eq('student_id').eq('type').eq('status', 'granted').select('id')` and succeeds only if at least one row comes back. The Phase 01 trigger keeps `signed_at` and sets `withdrawn_at`. Failure: "The withdrawal was not recorded. Try again."
- Data: reads `students` (`id, full_name, grade_level, section`) and `consent_records`. Never reads check-ins or anything a student wrote.

### 3.4 Reference data — `/admin/reference`

- Figure: Fig 30. Component: `ReferencePage`.
- h1 "Reference data"; lead "The crisis items students can select on their check-in. The referral directory and hotlines are kept in the app content file and change only through a reviewed update."
- Card "Co-designed with the guidance office": "The crisis item set is agreed with the guidance office. The administrator publishes the agreed set and does not write it. Changing the set changes what a student is asked, so each item keeps its version."
- "{active} active, {retired} retired"; button "Add agreed item".
- Table (caption "Crisis items"): Item text · Protocol step (or "No protocol step") · Version · Status · Actions ("Retire", accessible name "Retire the item {label}"; active items only). Order: active first, then by text. Empty: "No crisis items yet. Students see no crisis items on the check-in until you add the agreed set."
- Footer lines: "Items are retired, never deleted, so that a past crisis event still shows the item the student actually selected." / "HingaWeb never scans or matches words. A crisis event arises only when a student selects one of these items."
- **Add agreed item dialog**: "Item text" (hint "The exact words students will see.", 2–200 characters); "Protocol step (optional)" (hint "Shown to guidance staff with each crisis event."); "Set version" (hint "The version of the agreed set this item belongs to.", 1–20 characters); tick "This wording and protocol step were agreed with the guidance office."; "Add item" / "Cancel". Saves `insert(...).select('id').single()`. Failure: "The item was not added. Try again."
- **Retire dialog**: "Retire this item?", "Students will no longer see "{label}". Past crisis events keep showing it.", "Retire item" / "Cancel". Saves `update({ is_active: false }).eq('id').select('id, is_active').single()`. Failure: "The item was not retired. Try again."
- Data: `crisis_items` (`id, label, protocol_ref, set_version, is_active`).

### 3.5 Resource library — `/admin/resources`

- Figure: Fig 31. Component: `ResourceLibraryPage`.
- h1 "Resource library"; lead "Verified guides shown to students. Ranking compares a student's check-in to these guides and never to other students."; button "Add resource" → `/admin/resources/new`.
- Search "Search by title"; "Topic": All · School work · Home and family · Future · Managing (by main topic).
- Table (caption "Resources"): Title · Main topic · Verified by · Verified on · Status ("Published" / "Draft") · Actions ("Edit", accessible name "Edit {title}" → `/admin/resources/:id`). Empty: "No resources match."
- Note: "A resource reaches students only once it is verified and published."
- Data: `resources` (`id, title, url, attributes, verified_at, staff_accounts(display_name)`); RLS shows drafts to the administrator only.

### 3.6 Add or edit resource — `/admin/resources/new` and `/admin/resources/:id`

- Figure: Fig 32. Component: `ResourceEditPage` (`id` from the route; none means new).
- "Back to resource library"; h1 "Add resource" or "Edit resource".
- "Title" (2–160 characters, "Enter a title (2 to 160 characters)."); "Source URL" (hint "Must start with https://", error "Enter a link that starts with https://"; required when publishing, checked whenever filled in).
- Card "Attribute tags": "These four values place the resource in the same four areas the check-in asks about. Ranking compares a student's answers to these values." One 0–5 segmented control per area, with the area label and its hint: School work — "School work, workload, grades"; Home and family — "Home, family, money"; Future — "Graduating, college, career"; Managing — "Coping with what one is carrying". "Scale: 0 (not about this) to 5 (mainly about this)", "Resource vector: {values}". Error "At least one area must be above 0."
- Card "Verification status": "Status" Draft / Published. When Published: "Verified by" (active staff; placeholder "Choose who checked it"; error "Choose who verified this resource."), tick "I confirm the person named checked this resource before it is published." (error "Tick the box to publish."), note "A published resource needs a source URL and a verifier."
- "Save resource" / "Cancel"; "Changing these values changes how this resource ranks for every student." Saves `insert(row)` or `update(row).eq('id')` with `.select('id').single()`, then returns to the library. `verified_by` is `null` for a draft; the database stamps `verified_at`. Failure: "The resource was not saved. Try again."
- Edit only: "Delete resource" → dialog "Delete this resource?", "It disappears from every student list. Records of students opening it are deleted with it.", "Delete" / "Cancel"; `delete().eq('id').select('id')`, success only if a row comes back; failure "The resource was not deleted. Try again." Unknown id: "This resource does not exist."
- Data: `resources`, `staff_accounts` (`id, display_name` where active).

### 3.7 Audit trail — `/admin/audit`

- Figure: Fig 33. Component: `AuditPage`.
- h1 "Audit trail"; lead "Append-only. No account, including this one, can edit or delete an entry."; "The trail records each opening of a support request or crisis event and every action on them. It never records what a student wrote."; button "Export CSV" (disabled while loading or empty).
- Filters: "From", "To" (dates; whole Manila days: `T00:00:00+08:00` to `T23:59:59.999+08:00`), "Action" (Any + `AUDIT_ACTIONS`), "Staff member" (Any + staff names).
- Table (caption "Audit entries, newest first"): Time · Staff member · Action (label from `AUDIT_ACTIONS`) · Record ("Support request Ref …" / "Crisis event Ref …"). 200 per page; "Load older entries" when more exist. Empty: "No entries match these filters."
- Card "Why there is no delete": "Audit entries carry INSERT and SELECT permissions only. No role has UPDATE or DELETE, including the administrator. An entry that could be removed would not be evidence of anything."
- CSV: file `hingaweb-audit-YYYY-MM-DD.csv`, header `time,staff_member,action,record_type,record_ref`, one line per loaded entry (time in ISO UTC, action as its code, record_type `support_request` or `crisis_event`, the 8-character ref).
- Data: `staff_access_audit` (`id, created_at, action, actor_id, request_id, crisis_event_id, staff_accounts(display_name)`), `staff_accounts`. Writes nothing.

---

## 4. Edge Function `admin-accounts`

- `POST`, `verify_jwt = true`. Body is one of `{ "action": "list" }` or `{ "action": "create", "email", "display_name", "role" }` (strict; `role` is `guidance` or `administrator`).
- First checks `rpc('is_admin')` with the caller's token (active administrator at aal2); otherwise 403 `not_allowed`.
- `list`: reads `staff_accounts` with the caller's token, then the service client's `auth.admin.getUserById` **for staff ids only** to add `email` and `last_sign_in_at`. Never touches student users.
- `create`: `auth.admin.inviteUserByEmail(email, { data: { account_type: 'staff' }, redirectTo: SITE_URL + '/staff/setup' })`, then inserts the `staff_accounts` row with the service client; if that insert fails, deletes the half-made user. Already used email → 409 `email_taken`.
- Responses: 200 `{ accounts }` or `{ id, email, role, display_name }`; 400 `bad_request`; 401 `unauthorized`; 403 `not_allowed`; 405; 409; 500 `read_failed` / `invite_failed`.
- New secret `SITE_URL` on the hosted project (local default `http://localhost:5173`).

---

## 5. Who can see or do what

| Action | Administrator at aal2 | Guidance | Student | Administrator at aal1 |
|---|---|---|---|---|
| Open any `/admin/*` screen | yes | sent to own home | sent to own home | sent to `/staff/verify` |
| List / invite staff (`admin-accounts`) | yes | 403 | 403 | 403 |
| Change another staff member's role or status | yes (trigger blocks own row and the last administrator) | no | no | no |
| Read `students` names, grade, section; `consent_records` | yes | no | own consent only | no |
| Insert parental consent; record a withdrawal | yes | no | own assent only (Phase 04) | no |
| Add or retire a crisis item | yes | read only | active items only | no |
| Add, edit, publish, delete a resource | yes | read published | read published | no |
| Read `staff_access_audit` | yes | no | no | no |
| Read check-ins, mood, stress, support requests, notes, crisis events, triage decisions, office tags | **never** | (Phase 08 rules) | own check-ins only | never |

---

## 6. Build steps

### Step 1 — Dialog focus fix and the admin header

Replace both files. Run `npx vitest run src/components/ui/Dialog.test.jsx` on the **old** `Dialog.jsx` first if you want to see it fail, then on the new one: it must pass.

**`src/components/ui/Dialog.jsx`** — replaces the Phase 02 file

```jsx
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { t } from '../../copy/index.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with a focus trap. Focus returns to the element that opened it.
 * dismissible=false hides the close button and ignores Escape (used for Fig 15 and Fig 22 only
 * when the phase file says so).
 */
export function Dialog({ open, onClose, title, children, dismissible = true }) {
  const titleId = useId();
  const panel = useRef(null);
  const opener = useRef(null);
  // Keep the latest onClose without re-running the focus effect on every render. If the effect
  // depended on onClose, a parent re-render (for example typing in a field inside the dialog)
  // would move focus back to the first control after each keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const first = panel.current?.querySelector(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener.current?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6 shadow-xl"
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-control"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
        <h2 id={titleId} className="pr-10 text-[20px] font-semibold leading-7 text-ink">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
```

**`src/components/ui/Dialog.test.jsx`** — regression test for the focus bug

```jsx
// Phase 09 · regression test for the Dialog focus fix (typing inside a dialog keeps focus).
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog.jsx';

function Form() {
  const [value, setValue] = useState('');
  return (
    // onClose is a new function on every render, as in most callers.
    <Dialog open title="Edit" onClose={() => {}}>
      <label htmlFor="f">Name</label>
      <input id="f" value={value} onChange={(e) => setValue(e.target.value)} />
    </Dialog>
  );
}

describe('Dialog', () => {
  it('keeps focus in the field while the parent re-renders on each keystroke', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByLabelText('Name');
    await user.click(input);
    await user.keyboard('Ana Reyes');
    expect(input).toHaveValue('Ana Reyes');
    expect(input).toHaveFocus();
  });
});
```

**`src/components/layout/AdminLayout.jsx`** — replaces the Phase 02 file

```jsx
import { t } from '../../copy/index.js';
import { Chip } from '../ui/Chip.jsx';
import { StaffShell } from './StaffShell.jsx';

export function AdminLayout() {
  const items = [
    { to: '/admin/accounts', label: t('nav.admin.accounts') },
    { to: '/admin/consent', label: t('nav.admin.consent') },
    { to: '/admin/reference', label: t('nav.admin.reference') },
    { to: '/admin/resources', label: t('nav.admin.resources') },
    { to: '/admin/audit', label: t('nav.admin.audit') },
  ];
  return (
    <StaffShell
      logoTo="/admin/accounts"
      navLabel={t('nav.admin.label')}
      items={items}
      // The chip hides on phones so the header fits at 390 px (Phase 09).
      chip={
        <span className="hidden sm:inline">
          <Chip>{t('nav.admin.console')}</Chip>
        </span>
      }
      accountLabel={t('nav.admin.account')}
      signOutLabel={t('nav.admin.signOut')}
    />
  );
}
```

### Step 2 — Copy

**`src/copy/en/admin.js`**

```js
// Phase 09 copy: administrator console (Figs 27-33). Staff-facing (00 Section 10.3 admin.* rules).
// D-04: admin screens never claim that admin actions are audited; only request and crisis
// actions are in the audit trail.
export const adminCopy = {
  accounts: {
    title: 'Accounts and roles',
    lead: 'Students create their own accounts. Guidance and administrator accounts are created here and cannot be self-registered.',
    create: 'Create staff account',
    counts: {
      students: 'Students',
      studentsNote: 'Self-registered accounts',
      guidance: 'Guidance',
      guidanceNote: 'Active guidance accounts',
      admins: 'Administrators',
      adminsNote: 'Active administrator accounts',
    },
    search: 'Search by name',
    roleFilter: 'Role',
    all: 'All',
    caption: 'Staff accounts',
    columns: {
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      lastSignIn: 'Last sign in',
      actions: 'Actions',
    },
    roles: { guidance: 'Guidance', administrator: 'Administrator' },
    active: 'Active',
    inactive: 'Deactivated',
    never: 'Not yet',
    you: 'This is your account',
    changeRole: 'Change role',
    changeRoleLabel: 'Change the role of {name}',
    deactivate: 'Deactivate',
    deactivateLabel: 'Deactivate {name}',
    reactivate: 'Reactivate',
    reactivateLabel: 'Reactivate {name}',
    studentsNote:
      'Students are not listed here. Their private check-ins close when a consent is withdrawn in the consent register.',
    cannotTitle: 'What this account cannot do',
    cannot1: "Read any student's check-ins.",
    cannot2: 'Read the contents of a support request or a crisis event.',
    cannot3: 'Edit or delete an audit entry.',
    empty: 'No accounts match.',
    saved: 'Saved.',
    errors: {
      own: 'You cannot change your own role or status.',
      lastAdmin: 'There must always be at least one active administrator.',
      generic: 'That was not saved. Try again.',
    },
    roleDialog: {
      title: 'Change role',
      lead: 'Choose the role for {name}.',
      save: 'Save role',
      cancel: 'Cancel',
    },
    statusDialog: {
      deactivateTitle: 'Deactivate this account?',
      deactivateBody:
        '{name} will no longer be able to open any staff screen. Their name stays on past records.',
      reactivateTitle: 'Reactivate this account?',
      reactivateBody: '{name} will be able to sign in again with their password and authenticator.',
      confirmDeactivate: 'Deactivate account',
      confirmReactivate: 'Reactivate account',
      cancel: 'Cancel',
    },
    createDialog: {
      title: 'Create staff account',
      name: 'Full name',
      email: 'Work email address',
      emailPlaceholder: 'Work email address',
      role: 'Role',
      guidance: 'Guidance',
      guidanceBody:
        'Opens the support request queue, reads submitted requests, handles crisis events, and assigns office tags.',
      administrator: 'Administrator',
      administratorBody:
        'Manages accounts, the consent register, the crisis item set, and the resource library, and reads the audit trail. Cannot read support requests or crisis events.',
      roleNote: 'Guidance accounts can read support requests. Administrator accounts cannot.',
      nextTitle: 'What happens next',
      nextBody:
        'The account is created without a password. The staff member gets an email invitation, sets a password, and registers an authenticator app on first sign in.',
      submit: 'Create account',
      cancel: 'Cancel',
      sent: 'Invitation sent to {email}.',
      nameError: 'Enter the full name (2 to 120 characters).',
      emailError: 'Enter a valid email address.',
      roleError: 'Choose a role.',
      taken: 'That email address already has an account.',
      failed: 'The account was not created. Try again.',
    },
  },
  consent: {
    title: 'Consent register',
    lead: 'Parental consent and student assent must both be recorded before a student can use private check-ins.',
    cards: {
      both: 'Both recorded',
      bothNote: 'Private check-ins open',
      awaiting: 'Awaiting parental consent',
      awaitingNote: 'Assent given, parental consent not yet recorded',
      withdrawn: 'Withdrawn',
      withdrawnNote: 'A consent or assent was withdrawn',
    },
    search: 'Search by student name',
    filterLabel: 'Show',
    filters: {
      all: 'All',
      both: 'Both recorded',
      awaiting: 'Awaiting',
      withdrawn: 'Withdrawn',
      noAssent: 'No assent yet',
    },
    caption: 'Consent and assent for each student',
    columns: {
      student: 'Student',
      class: 'Grade and section',
      parental: 'Parental consent',
      assent: 'Student assent',
      actions: 'Actions',
    },
    granted: 'Recorded {date} · form {version}',
    withdrawnOn: 'Withdrawn {date} · form {version}',
    none: 'Not recorded',
    recordParental: 'Record parental consent',
    recordParentalLabel: 'Record parental consent for {name}',
    recordWithdrawal: 'Record withdrawal',
    recordWithdrawalLabel: 'Record a withdrawal for {name}',
    empty: 'No students match.',
    withdrawalTitle: 'Withdrawal',
    withdrawalBody:
      'A withdrawal takes effect at once. The student keeps the public guides, the directory, and the crisis information, which need no consent.',
    footer:
      'Consent records are never deleted. A withdrawal is written on the original record with its date.',
    saved: 'Saved.',
    parentalDialog: {
      title: 'Record parental consent',
      lead: 'For {name}. Record this only when you hold the signed consent form.',
      version: 'Form version',
      versionHint: 'Exactly as printed on the signed form.',
      versionError: 'Enter the form version (1 to 40 characters).',
      confirm: 'I hold the signed parental consent form for {name}.',
      save: 'Record consent',
      cancel: 'Cancel',
      failed: 'The consent was not recorded. Try again.',
    },
    withdrawalDialog: {
      title: 'Record withdrawal',
      lead: 'For {name}. Private check-ins close as soon as this is saved.',
      which: 'What is being withdrawn?',
      parental: 'Parental consent',
      assent: 'Student assent',
      confirm: 'I have this withdrawal on record.',
      save: 'Record withdrawal',
      cancel: 'Cancel',
      failed: 'The withdrawal was not recorded. Try again.',
    },
  },
  reference: {
    title: 'Reference data',
    lead: 'The crisis items students can select on their check-in. The referral directory and hotlines are kept in the app content file and change only through a reviewed update.',
    codesignTitle: 'Co-designed with the guidance office',
    codesignBody:
      'The crisis item set is agreed with the guidance office. The administrator publishes the agreed set and does not write it. Changing the set changes what a student is asked, so each item keeps its version.',
    count: '{active} active, {retired} retired',
    add: 'Add agreed item',
    caption: 'Crisis items',
    columns: {
      text: 'Item text',
      protocol: 'Protocol step',
      version: 'Version',
      status: 'Status',
      actions: 'Actions',
    },
    active: 'Active',
    retired: 'Retired',
    retire: 'Retire',
    retireLabel: 'Retire the item {label}',
    none: 'No protocol step',
    empty:
      'No crisis items yet. Students see no crisis items on the check-in until you add the agreed set.',
    footer:
      'Items are retired, never deleted, so that a past crisis event still shows the item the student actually selected.',
    noScan:
      'HingaWeb never scans or matches words. A crisis event arises only when a student selects one of these items.',
    saved: 'Saved.',
    addDialog: {
      title: 'Add agreed item',
      label: 'Item text',
      labelHint: 'The exact words students will see.',
      labelError: 'Enter the item text (2 to 200 characters).',
      protocol: 'Protocol step (optional)',
      protocolHint: 'Shown to guidance staff with each crisis event.',
      version: 'Set version',
      versionHint: 'The version of the agreed set this item belongs to.',
      versionError: 'Enter the set version (1 to 20 characters).',
      confirm: 'This wording and protocol step were agreed with the guidance office.',
      save: 'Add item',
      cancel: 'Cancel',
      failed: 'The item was not added. Try again.',
    },
    retireDialog: {
      title: 'Retire this item?',
      body: 'Students will no longer see "{label}". Past crisis events keep showing it.',
      confirm: 'Retire item',
      cancel: 'Cancel',
      failed: 'The item was not retired. Try again.',
    },
  },
  resources: {
    title: 'Resource library',
    lead: "Verified guides shown to students. Ranking compares a student's check-in to these guides and never to other students.",
    add: 'Add resource',
    search: 'Search by title',
    topicLabel: 'Topic',
    all: 'All',
    caption: 'Resources',
    columns: {
      title: 'Title',
      topic: 'Main topic',
      verifiedBy: 'Verified by',
      verifiedOn: 'Verified on',
      status: 'Status',
      actions: 'Actions',
    },
    published: 'Published',
    draft: 'Draft',
    edit: 'Edit',
    editLabel: 'Edit {title}',
    empty: 'No resources match.',
    note: 'A resource reaches students only once it is verified and published.',
  },
  resourceEdit: {
    back: 'Back to resource library',
    newTitle: 'Add resource',
    editTitle: 'Edit resource',
    title: 'Title',
    titleError: 'Enter a title (2 to 160 characters).',
    url: 'Source URL',
    urlHint: 'Must start with https://',
    urlError: 'Enter a link that starts with https://',
    attributesTitle: 'Attribute tags',
    attributesLead:
      "These four values place the resource in the same four areas the check-in asks about. Ranking compares a student's answers to these values.",
    attributeHints: {
      school_work: 'School work, workload, grades',
      home_family: 'Home, family, money',
      future: 'Graduating, college, career',
      managing: 'Coping with what one is carrying',
    },
    scale: 'Scale: 0 (not about this) to 5 (mainly about this)',
    vector: 'Resource vector: {values}',
    attributesError: 'At least one area must be above 0.',
    statusTitle: 'Verification status',
    statusLabel: 'Status',
    draft: 'Draft',
    published: 'Published',
    verifiedBy: 'Verified by',
    verifiedByPlaceholder: 'Choose who checked it',
    verifiedByError: 'Choose who verified this resource.',
    confirm: 'I confirm the person named checked this resource before it is published.',
    confirmError: 'Tick the box to publish.',
    publishNote: 'A published resource needs a source URL and a verifier.',
    save: 'Save resource',
    cancel: 'Cancel',
    saved: 'Resource saved.',
    failed: 'The resource was not saved. Try again.',
    rankNote: 'Changing these values changes how this resource ranks for every student.',
    delete: 'Delete resource',
    deleteTitle: 'Delete this resource?',
    deleteBody:
      'It disappears from every student list. Records of students opening it are deleted with it.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    deleteFailed: 'The resource was not deleted. Try again.',
    notFound: 'This resource does not exist.',
  },
  audit: {
    title: 'Audit trail',
    lead: 'Append-only. No account, including this one, can edit or delete an entry.',
    scope:
      'The trail records each opening of a support request or crisis event and every action on them. It never records what a student wrote.',
    export: 'Export CSV',
    from: 'From',
    to: 'To',
    action: 'Action',
    actor: 'Staff member',
    any: 'Any',
    caption: 'Audit entries, newest first',
    columns: { time: 'Time', actor: 'Staff member', action: 'Action', object: 'Record' },
    request: 'Support request {ref}',
    crisis: 'Crisis event {ref}',
    loadMore: 'Load older entries',
    empty: 'No entries match these filters.',
    whyTitle: 'Why there is no delete',
    whyBody:
      'Audit entries carry INSERT and SELECT permissions only. No role has UPDATE or DELETE, including the administrator. An entry that could be removed would not be evidence of anything.',
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
import { adminCopy } from './admin.js';

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
  admin: adminCopy,
};
```

### Step 3 — Edge Function `admin-accounts`

**`supabase/functions/admin-accounts/handler.js`**

```js
// admin-accounts (2.1.5.3.1, 2.1.6.2.9; Figs 27-28). Administrator only, at aal2.
//   { action: 'list' }   -> staff accounts with their sign-in email and last sign-in time
//   { action: 'create', email, display_name, role } -> invites a staff member by email
// Staff accounts are never self-registered. The invitation creates the account WITHOUT a
// password; the staff member sets one and enrols TOTP at /staff/setup (Phase 02).
// Service-client use, named here as 00 Section 5.2 requires:
//   - auth.admin.getUserById for STAFF ids only (email, last sign-in). Never student users.
//   - auth.admin.inviteUserByEmail, then an insert into staff_accounts, then (only if that
//     insert fails) auth.admin.deleteUser to undo the half-made account.
// Role changes and deactivation are plain updates from the browser (RLS: administrator only).
import { bearer, makeHttp, readJson } from '../_shared/http.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, makeServiceClient: () => object,
 *   siteUrl: string, allowedOrigin?: string }} deps
 */
export function makeAdminAccounts({
  z,
  makeUserClient,
  makeServiceClient,
  siteUrl,
  allowedOrigin = '*',
}) {
  const http = makeHttp(allowedOrigin);
  const Input = z.discriminatedUnion('action', [
    z.object({ action: z.literal('list') }).strict(),
    z
      .object({
        action: z.literal('create'),
        email: z.email().max(254),
        display_name: z.string().trim().min(2).max(120),
        role: z.enum(['guidance', 'administrator']),
      })
      .strict(),
  ]);

  return async function adminAccounts(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    // is_admin() is true only for an active administrator at aal2 (Phase 01).
    const db = makeUserClient(auth);
    const check = await db.rpc('is_admin');
    if (check.error || check.data !== true) return http.json({ error: 'not_allowed' }, 403);

    const service = makeServiceClient();

    if (input.data.action === 'list') {
      const staff = await db
        .from('staff_accounts')
        .select('id, role, display_name, is_active')
        .order('display_name', { ascending: true });
      if (staff.error) return http.json({ error: 'read_failed' }, 500);
      const accounts = [];
      for (const s of staff.data ?? []) {
        const { data } = await service.auth.admin.getUserById(s.id);
        accounts.push({
          ...s,
          email: data?.user?.email ?? null,
          last_sign_in_at: data?.user?.last_sign_in_at ?? null,
        });
      }
      return http.json({ accounts });
    }

    const { email, display_name, role } = input.data;
    const invited = await service.auth.admin.inviteUserByEmail(email, {
      data: { account_type: 'staff' },
      redirectTo: `${siteUrl.replace(/\/$/, '')}/staff/setup`,
    });
    if (invited.error) {
      const taken = invited.error.status === 422 || /already/i.test(invited.error.message ?? '');
      return http.json({ error: taken ? 'email_taken' : 'invite_failed' }, taken ? 409 : 500);
    }
    const userId = invited.data.user.id;
    const row = await service
      .from('staff_accounts')
      .insert({ id: userId, role, display_name })
      .select('id')
      .single();
    if (row.error) {
      await service.auth.admin.deleteUser(userId);
      return http.json({ error: 'invite_failed' }, 500);
    }
    return http.json({ id: userId, email, role, display_name });
  };
}
```

**`supabase/functions/admin-accounts/index.js`**

```js
// Deno entry point for admin-accounts (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import { makeServiceClient, makeUserClient } from '../_shared/clients.js';
import { makeAdminAccounts } from './handler.js';

Deno.serve(
  makeAdminAccounts({
    z,
    makeUserClient,
    makeServiceClient,
    siteUrl: Deno.env.get('SITE_URL') ?? 'http://localhost:5173',
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);
```

**`supabase/functions/admin-accounts/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeAdminAccounts } from './handler.js';

const STAFF = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    role: 'guidance',
    display_name: 'Guidance Associate (dev)',
    is_active: true,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    role: 'administrator',
    display_name: 'Administrator (dev)',
    is_active: true,
  },
];
const NEW_ID = '77777777-7777-4777-8777-777777777777';

function setup({
  isAdmin = { data: true, error: null },
  invite,
  insert = { data: { id: NEW_ID }, error: null },
} = {}) {
  const userCalls = [];
  const q = {
    select: (...a) => (userCalls.push(['select', ...a]), q),
    order: (...a) => (userCalls.push(['order', ...a]), q),
    then: (ok, bad) => Promise.resolve({ data: STAFF, error: null }).then(ok, bad),
  };
  const userClient = { rpc: vi.fn(async () => isAdmin), from: vi.fn(() => q) };
  const insertCalls = [];
  const iq = {
    insert: (...a) => (insertCalls.push(['insert', ...a]), iq),
    select: (...a) => (insertCalls.push(['select', ...a]), iq),
    single: async () => insert,
  };
  const admin = {
    getUserById: vi.fn(async (id) => ({
      data: {
        user: {
          id,
          email: `${id.slice(0, 4)}@example.test`,
          last_sign_in_at: '2026-10-10T00:00:00Z',
        },
      },
    })),
    inviteUserByEmail: vi.fn(async () => invite ?? { data: { user: { id: NEW_ID } }, error: null }),
    deleteUser: vi.fn(async () => ({ error: null })),
  };
  const service = { auth: { admin }, from: vi.fn(() => iq) };
  const handler = makeAdminAccounts({
    z,
    makeUserClient: () => userClient,
    makeServiceClient: () => service,
    siteUrl: 'https://hingaweb.example.test/',
  });
  return { handler, userClient, service, admin, insertCalls };
}

const post = (body, auth = 'Bearer admin-jwt') =>
  new Request('http://local/admin-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const CREATE = {
  action: 'create',
  email: 'new.staff@example.test',
  display_name: 'New Staff',
  role: 'guidance',
};

describe('admin-accounts (2.1.5.3.1; Figs 27-28)', () => {
  it('needs a JWT, a known action, and an administrator at aal2', async () => {
    const { handler, admin } = setup({ isAdmin: { data: false, error: null } });
    expect((await handler(post({ action: 'list' }, null))).status).toBe(401);
    expect((await handler(post({ action: 'delete' }))).status).toBe(400);
    expect((await handler(post({ ...CREATE, role: 'student' }))).status).toBe(400);
    expect((await handler(post({ action: 'list' }))).status).toBe(403);
    expect((await handler(post(CREATE))).status).toBe(403);
    expect(admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('lists staff with email and last sign-in, looking up staff ids only', async () => {
    const { handler, admin } = setup();
    const res = await handler(post({ action: 'list' }));
    const body = await res.json();
    expect(body.accounts).toHaveLength(2);
    expect(body.accounts[0]).toMatchObject({
      role: 'guidance',
      email: '5555@example.test',
      last_sign_in_at: '2026-10-10T00:00:00Z',
    });
    expect(admin.getUserById.mock.calls.map(([id]) => id)).toEqual(STAFF.map((s) => s.id));
  });

  it('invites without a password, marks the account as staff, then adds the staff row', async () => {
    const { handler, admin, insertCalls } = setup();
    const res = await handler(post(CREATE));
    expect(res.status).toBe(200);
    expect(admin.inviteUserByEmail).toHaveBeenCalledWith('new.staff@example.test', {
      data: { account_type: 'staff' },
      redirectTo: 'https://hingaweb.example.test/staff/setup',
    });
    expect(insertCalls[0]).toEqual([
      'insert',
      { id: NEW_ID, role: 'guidance', display_name: 'New Staff' },
    ]);
    expect(await res.json()).toEqual({
      id: NEW_ID,
      email: 'new.staff@example.test',
      role: 'guidance',
      display_name: 'New Staff',
    });
  });

  it('reports an email that already has an account', async () => {
    const { handler } = setup({
      invite: {
        data: null,
        error: {
          status: 422,
          message: 'A user with this email address has already been registered',
        },
      },
    });
    const res = await handler(post(CREATE));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email_taken' });
  });

  it('undoes the invitation when the staff row cannot be saved', async () => {
    const { handler, admin } = setup({ insert: { data: null, error: { code: '23514' } } });
    const res = await handler(post(CREATE));
    expect(res.status).toBe(500);
    expect(admin.deleteUser).toHaveBeenCalledWith(NEW_ID);
  });
});
```

Append to `supabase/config.toml` (change nothing else), then restart `npx supabase functions serve --env-file supabase/functions/.env`:

```toml
# ---- Phase 09 ----
[functions.admin-accounts]
enabled = true
verify_jwt = true
entrypoint = "./functions/admin-accounts/index.js"
```

### Step 4 — Helpers

**`src/features/admin/adminHelpers.js`**

```js
// Administrator helpers (Phase 09). Pure functions, tested in adminHelpers.test.js.

/** The newest record of one type for one student, or null. */
function latest(records, type) {
  return (
    records
      .filter((r) => r.type === type)
      .sort((a, b) => new Date(b.signed_at) - new Date(a.signed_at))[0] ?? null
  );
}

/**
 * One row per student for the consent register (Fig 29; Table 14; D-26, D-27).
 * category: 'withdrawn' | 'both' | 'awaiting' | 'noAssent'
 */
export function consentRows(students, records) {
  const byStudent = new Map();
  for (const r of records) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id).push(r);
  }
  return students
    .map((s) => {
      const mine = byStudent.get(s.id) ?? [];
      const parental = latest(mine, 'parental');
      const assent = latest(mine, 'assent');
      let category = 'noAssent';
      if (parental?.status === 'withdrawn' || assent?.status === 'withdrawn')
        category = 'withdrawn';
      else if (parental?.status === 'granted' && assent?.status === 'granted') category = 'both';
      else if (assent?.status === 'granted') category = 'awaiting';
      return { ...s, parental, assent, category };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'en'));
}

export function countBy(rows, key) {
  return rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + 1 }), {});
}

/** Which copy key explains a failed staff_accounts update (Phase 01 trigger messages). */
export function staffUpdateErrorKey(error) {
  const msg = error?.message ?? '';
  if (/own role or status/i.test(msg)) return 'admin.accounts.errors.own';
  if (/at least one active administrator/i.test(msg)) return 'admin.accounts.errors.lastAdmin';
  return 'admin.accounts.errors.generic';
}

/** Valid resource attributes: four integers 0-5 with at least one above 0 (Table 16 CHECK). */
export function validAttributes(a) {
  const values = ['school_work', 'home_family', 'future', 'managing'].map((k) => a?.[k]);
  return values.every((v) => Number.isInteger(v) && v >= 0 && v <= 5) && values.some((v) => v > 0);
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text (header + rows) for the audit export. rows: string[][] */
export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
```

### Step 5 — Accounts

**`src/features/admin/AccountsPage.jsx`**

```jsx
// Figs 27-28 · accounts and roles (2.1.5.3.1, 2.1.6.2.9; D-04; P09-D1..D5).
// Staff accounts only. Listing and creating go through the admin-accounts Edge Function;
// role and status changes are direct updates that RLS allows only for an administrator at aal2.
// The Phase 01 trigger blocks changing your own role or status and removing the last administrator.
import { useCallback, useEffect, useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { formatDateTime } from '../../lib/format.js';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { staffUpdateErrorKey } from './adminHelpers.js';

const ROLES = ['guidance', 'administrator'];

export function AccountsPage() {
  const { session } = useAuth();
  const me = session?.user?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', accounts: [], students: 0 });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { kind: 'role' | 'status', account }
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.functions.invoke('admin-accounts', { body: { action: 'list' } }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
    ]).then(([list, students]) => {
      if (!active) return;
      if (list.error || !Array.isArray(list.data?.accounts) || students.error) {
        setState({ attempt, status: 'error', accounts: [], students: 0 });
      } else {
        setState({
          attempt,
          status: 'ready',
          accounts: list.data.accounts,
          students: students.count ?? 0,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const accounts = state.accounts;
  const activeOf = (r) => accounts.filter((a) => a.role === r && a.is_active).length;
  const shown = accounts.filter(
    (a) =>
      (role === 'all' || a.role === role) &&
      a.display_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const done = (text) => {
    setEditing(null);
    setCreating(false);
    setMessage(text);
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('admin.accounts.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.accounts.lead')}</p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          iconLeft={<Plus aria-hidden="true" className="size-4" />}
        >
          {t('admin.accounts.create')}
        </Button>
      </header>

      <p role="status" className="font-semibold text-ink">
        {message}
      </p>

      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CountCard
              label={t('admin.accounts.counts.students')}
              value={state.students}
              note={t('admin.accounts.counts.studentsNote')}
            />
            <CountCard
              label={t('admin.accounts.counts.guidance')}
              value={activeOf('guidance')}
              note={t('admin.accounts.counts.guidanceNote')}
            />
            <CountCard
              label={t('admin.accounts.counts.admins')}
              value={activeOf('administrator')}
              note={t('admin.accounts.counts.adminsNote')}
            />
          </div>

          <Card className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <Field id="account-search" label={t('admin.accounts.search')}>
                <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
              </Field>
            </div>
            <SegmentedControl
              label={t('admin.accounts.roleFilter')}
              options={[
                { value: 'all', label: t('admin.accounts.all') },
                ...ROLES.map((r) => ({ value: r, label: t(`admin.accounts.roles.${r}`) })),
              ]}
              value={role}
              onChange={setRole}
            />
          </Card>

          {shown.length === 0 ? (
            <EmptyState title={t('admin.accounts.empty')} />
          ) : (
            <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
              <Table
                caption={t('admin.accounts.caption')}
                getRowKey={(a) => a.id}
                rows={shown}
                columns={[
                  {
                    key: 'name',
                    header: t('admin.accounts.columns.name'),
                    render: (a) => <span className="font-semibold text-ink">{a.display_name}</span>,
                  },
                  {
                    key: 'email',
                    header: t('admin.accounts.columns.email'),
                    render: (a) => a.email ?? '',
                  },
                  {
                    key: 'role',
                    header: t('admin.accounts.columns.role'),
                    render: (a) => t(`admin.accounts.roles.${a.role}`),
                  },
                  {
                    key: 'status',
                    header: t('admin.accounts.columns.status'),
                    render: (a) =>
                      a.is_active ? t('admin.accounts.active') : t('admin.accounts.inactive'),
                  },
                  {
                    key: 'last',
                    header: t('admin.accounts.columns.lastSignIn'),
                    render: (a) =>
                      a.last_sign_in_at
                        ? formatDateTime(a.last_sign_in_at)
                        : t('admin.accounts.never'),
                  },
                  {
                    key: 'actions',
                    header: t('admin.accounts.columns.actions'),
                    render: (a) =>
                      a.id === me ? (
                        <span className="text-ink-muted">{t('admin.accounts.you')}</span>
                      ) : (
                        <span className="flex flex-wrap justify-end gap-2 md:justify-start">
                          <Button
                            variant="ghost"
                            onClick={() => setEditing({ kind: 'role', account: a })}
                            aria-label={t('admin.accounts.changeRoleLabel', {
                              name: a.display_name,
                            })}
                          >
                            {t('admin.accounts.changeRole')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setEditing({ kind: 'status', account: a })}
                            aria-label={t(
                              a.is_active
                                ? 'admin.accounts.deactivateLabel'
                                : 'admin.accounts.reactivateLabel',
                              { name: a.display_name },
                            )}
                          >
                            {a.is_active
                              ? t('admin.accounts.deactivate')
                              : t('admin.accounts.reactivate')}
                          </Button>
                        </span>
                      ),
                  },
                ]}
              />
            </div>
          )}
          <p className="text-[14px] text-ink-muted">{t('admin.accounts.studentsNote')}</p>
        </>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          <Lock aria-hidden="true" className="size-4" />
          {t('admin.accounts.cannotTitle')}
        </h2>
        <ul className="list-disc pl-6 text-[15px] text-ink">
          <li>{t('admin.accounts.cannot1')}</li>
          <li>{t('admin.accounts.cannot2')}</li>
          <li>{t('admin.accounts.cannot3')}</li>
        </ul>
      </Card>

      <CreateStaffDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(email) => done(t('admin.accounts.createDialog.sent', { email }))}
      />
      {editing?.kind === 'role' && (
        <RoleDialog
          account={editing.account}
          onClose={() => setEditing(null)}
          onSaved={() => done(t('admin.accounts.saved'))}
        />
      )}
      {editing?.kind === 'status' && (
        <StatusDialog
          account={editing.account}
          onClose={() => setEditing(null)}
          onSaved={() => done(t('admin.accounts.saved'))}
        />
      )}
    </div>
  );
}

function CountCard({ label, value, note }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-[32px] font-semibold leading-10 text-ink">{value}</p>
      <p className="text-[13px] text-ink-muted">{note}</p>
    </Card>
  );
}

async function updateStaff(id, patch) {
  // .select().single() confirms the row really changed (00 must-never 16).
  return supabase
    .from('staff_accounts')
    .update(patch)
    .eq('id', id)
    .select('id, role, is_active')
    .single();
}

function RoleDialog({ account, onClose, onSaved }) {
  const [role, setRole] = useState(account.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await updateStaff(account.id, { role });
    setSaving(false);
    if (e || data?.role !== role) return setError(t(staffUpdateErrorKey(e)));
    onSaved();
  };
  return (
    <Dialog open title={t('admin.accounts.roleDialog.title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">
          {t('admin.accounts.roleDialog.lead', { name: account.display_name })}
        </p>
        <RolePicker value={role} onChange={setRole} />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {t('admin.accounts.roleDialog.cancel')}
          </Button>
          <Button onClick={save} loading={saving} disabled={role === account.role}>
            {t('admin.accounts.roleDialog.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function StatusDialog({ account, onClose, onSaved }) {
  const deactivating = account.is_active;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await updateStaff(account.id, { is_active: !deactivating });
    setSaving(false);
    if (e || data?.is_active !== !deactivating) return setError(t(staffUpdateErrorKey(e)));
    onSaved();
  };
  const k = (x) => t(`admin.accounts.statusDialog.${x}`, { name: account.display_name });
  return (
    <Dialog
      open
      title={deactivating ? k('deactivateTitle') : k('reactivateTitle')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">
          {deactivating ? k('deactivateBody') : k('reactivateBody')}
        </p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
          <Button onClick={save} loading={saving}>
            {deactivating ? k('confirmDeactivate') : k('confirmReactivate')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RolePicker({ value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-semibold text-ink">
        {t('admin.accounts.createDialog.role')}
      </legend>
      {ROLES.map((r) => (
        <label key={r} className="flex cursor-pointer gap-3 rounded-control border border-line p-3">
          <input
            type="radio"
            name="staff-role"
            value={r}
            checked={value === r}
            onChange={() => onChange(r)}
            className="mt-1 size-5 shrink-0 accent-[var(--color-action)]"
          />
          <span>
            <span className="block font-semibold text-ink">
              {t(`admin.accounts.createDialog.${r}`)}
            </span>
            <span className="block text-[14px] text-ink-muted">
              {t(`admin.accounts.createDialog.${r}Body`)}
            </span>
          </span>
        </label>
      ))}
      <p className="text-[13px] text-ink-muted">{t('admin.accounts.createDialog.roleNote')}</p>
    </fieldset>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreateStaffDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const k = (x, v) => t(`admin.accounts.createDialog.${x}`, v);

  const close = () => {
    setName('');
    setEmail('');
    setRole('');
    setErrors({});
    setFormError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (name.trim().length < 2 || name.trim().length > 120) next.name = k('nameError');
    if (!EMAIL.test(email.trim())) next.email = k('emailError');
    if (!role) next.role = k('roleError');
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-accounts', {
      body: { action: 'create', email: email.trim(), display_name: name.trim(), role },
    });
    setSaving(false);
    if (error || !data?.id) {
      setFormError(error?.context?.status === 409 ? k('taken') : k('failed'));
      return;
    }
    const sentTo = email.trim();
    close();
    onCreated(sentTo);
  };

  return (
    <Dialog open={open} title={k('title')} onClose={close}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="staff-name" label={k('name')} error={errors.name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field id="staff-email" label={k('email')} error={errors.email}>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={k('emailPlaceholder')}
            autoComplete="off"
          />
        </Field>
        <RolePicker value={role} onChange={setRole} />
        {errors.role && (
          <p role="alert" className="text-[13px] font-semibold text-ink">
            {errors.role}
          </p>
        )}
        <div className="rounded-control bg-blush p-3 text-[14px] text-ink">
          <p className="font-semibold">{k('nextTitle')}</p>
          <p className="mt-1">{k('nextBody')}</p>
        </div>
        <FormMessage>{formError}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close}>
            {k('cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {k('submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

### Step 6 — Consent register

**`src/features/admin/ConsentPage.jsx`**

```jsx
// Fig 29 · consent register (2.1.5.3.2, 2.1.6.2.3; Table 14; D-26, D-27; P09-D6..D8).
// Records parental consent (the student records their own assent in Phase 04) and withdrawals.
// A withdrawal is written on the original record (the Phase 01 trigger keeps signed_at and sets
// withdrawn_at); records are never deleted. Tier 2 closes at once because RLS checks consent live.
import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { formatDate } from '../../lib/format.js';
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { consentRows, countBy } from './adminHelpers.js';

const FILTERS = ['all', 'both', 'awaiting', 'withdrawn', 'noAssent'];

function recordText(rec) {
  if (!rec) return t('admin.consent.none');
  return rec.status === 'withdrawn'
    ? t('admin.consent.withdrawnOn', {
        date: formatDate(rec.withdrawn_at),
        version: rec.instrument_version,
      })
    : t('admin.consent.granted', {
        date: formatDate(rec.signed_at),
        version: rec.instrument_version,
      });
}

export function ConsentPage() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', rows: [] });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(null); // { kind: 'parental' | 'withdrawal', row }
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('students')
        .select('id, full_name, grade_level, section')
        .order('full_name', { ascending: true }),
      supabase
        .from('consent_records')
        .select('id, student_id, type, instrument_version, status, signed_at, withdrawn_at'),
    ]).then(([students, records]) => {
      if (!active) return;
      if (students.error || records.error) setState({ attempt, status: 'error', rows: [] });
      else
        setState({
          attempt,
          status: 'ready',
          rows: consentRows(students.data ?? [], records.data ?? []),
        });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const counts = countBy(state.rows, 'category');
  const shown = state.rows.filter(
    (r) =>
      (filter === 'all' || r.category === filter) &&
      r.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const done = () => {
    setDialog(null);
    setMessage(t('admin.consent.saved'));
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('admin.consent.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.consent.lead')}</p>
      </header>
      <p role="status" className="font-semibold text-ink">
        {message}
      </p>

      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {['both', 'awaiting', 'withdrawn'].map((c) => (
              <Card key={c} className="flex flex-col gap-1">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
                  {t(`admin.consent.cards.${c}`)}
                </p>
                <p className="text-[32px] font-semibold leading-10 text-ink">{counts[c] ?? 0}</p>
                <p className="text-[13px] text-ink-muted">{t(`admin.consent.cards.${c}Note`)}</p>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <Field id="consent-search" label={t('admin.consent.search')}>
                <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
              </Field>
            </div>
            <SegmentedControl
              label={t('admin.consent.filterLabel')}
              options={FILTERS.map((f) => ({ value: f, label: t(`admin.consent.filters.${f}`) }))}
              value={filter}
              onChange={setFilter}
            />
          </Card>

          {shown.length === 0 ? (
            <EmptyState title={t('admin.consent.empty')} />
          ) : (
            <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
              <Table
                caption={t('admin.consent.caption')}
                getRowKey={(r) => r.id}
                rows={shown}
                columns={[
                  {
                    key: 'student',
                    header: t('admin.consent.columns.student'),
                    render: (r) => <span className="font-semibold text-ink">{r.full_name}</span>,
                  },
                  {
                    key: 'class',
                    header: t('admin.consent.columns.class'),
                    render: (r) =>
                      t('guidance.gradeSection', { grade: r.grade_level, section: r.section }),
                  },
                  {
                    key: 'parental',
                    header: t('admin.consent.columns.parental'),
                    render: (r) => recordText(r.parental),
                  },
                  {
                    key: 'assent',
                    header: t('admin.consent.columns.assent'),
                    render: (r) => recordText(r.assent),
                  },
                  {
                    key: 'actions',
                    header: t('admin.consent.columns.actions'),
                    render: (r) => (
                      <span className="flex flex-wrap justify-end gap-2 md:justify-start">
                        {r.parental?.status !== 'granted' && (
                          <Button
                            variant="ghost"
                            onClick={() => setDialog({ kind: 'parental', row: r })}
                            aria-label={t('admin.consent.recordParentalLabel', {
                              name: r.full_name,
                            })}
                          >
                            {t('admin.consent.recordParental')}
                          </Button>
                        )}
                        {(r.parental?.status === 'granted' || r.assent?.status === 'granted') && (
                          <Button
                            variant="ghost"
                            onClick={() => setDialog({ kind: 'withdrawal', row: r })}
                            aria-label={t('admin.consent.recordWithdrawalLabel', {
                              name: r.full_name,
                            })}
                          >
                            {t('admin.consent.recordWithdrawal')}
                          </Button>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </>
      )}

      <Card className="flex gap-3">
        <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <div>
          <h2 className="font-semibold text-ink">{t('admin.consent.withdrawalTitle')}</h2>
          <p className="mt-1 text-[15px] text-ink">{t('admin.consent.withdrawalBody')}</p>
        </div>
      </Card>
      <p className="text-center text-[13px] text-ink-muted">{t('admin.consent.footer')}</p>

      {dialog?.kind === 'parental' && (
        <ParentalDialog row={dialog.row} onClose={() => setDialog(null)} onSaved={done} />
      )}
      {dialog?.kind === 'withdrawal' && (
        <WithdrawalDialog row={dialog.row} onClose={() => setDialog(null)} onSaved={done} />
      )}
    </div>
  );
}

function ParentalDialog({ row, onClose, onSaved }) {
  const [version, setVersion] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [versionError, setVersionError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.consent.parentalDialog.${x}`, { name: row.full_name });
  const save = async () => {
    const v = version.trim();
    if (v.length < 1 || v.length > 40) return setVersionError(k('versionError'));
    setVersionError('');
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase
      .from('consent_records')
      .insert({ student_id: row.id, type: 'parental', instrument_version: v })
      .select('id')
      .single();
    setSaving(false);
    if (e || !data) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('lead')}</p>
        <Field
          id="consent-version"
          label={k('version')}
          hint={k('versionHint')}
          error={versionError}
        >
          <TextInput
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Checkbox
          id="consent-confirm"
          label={k('confirm')}
          checked={confirmed}
          onChange={setConfirmed}
        />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
          <Button onClick={save} disabled={!confirmed} loading={saving}>
            {k('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function WithdrawalDialog({ row, onClose, onSaved }) {
  const options = ['parental', 'assent'].filter((type) => row[type]?.status === 'granted');
  const [type, setType] = useState(options.length === 1 ? options[0] : '');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.consent.withdrawalDialog.${x}`, { name: row.full_name });
  const save = async () => {
    setSaving(true);
    setError('');
    // Withdraw every granted record of this type, so no older consent keeps Tier 2 open (D-27).
    const { data, error: e } = await supabase
      .from('consent_records')
      .update({ status: 'withdrawn' })
      .eq('student_id', row.id)
      .eq('type', type)
      .eq('status', 'granted')
      .select('id');
    setSaving(false);
    if (e || !data?.length) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('lead')}</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[14px] font-semibold text-ink">{k('which')}</legend>
          {options.map((o) => (
            <label
              key={o}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line px-3"
            >
              <input
                type="radio"
                name="withdraw-type"
                value={o}
                checked={type === o}
                onChange={() => setType(o)}
                className="size-5 accent-[var(--color-action)]"
              />
              <span className="text-[15px] text-ink">{k(o)}</span>
            </label>
          ))}
        </fieldset>
        <Checkbox
          id="withdraw-confirm"
          label={k('confirm')}
          checked={confirmed}
          onChange={setConfirmed}
        />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
          <Button onClick={save} disabled={!confirmed || !type} loading={saving}>
            {k('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### Step 7 — Reference data

**`src/features/admin/ReferencePage.jsx`**

```jsx
// Fig 30 · reference data: the crisis item set (2.1.5.3.2, 2.1.5.1.3; Table 12; D-03; P09-D9..D11).
// Items are agreed with the guidance office and only published here. An item's text, protocol
// step, and version never change; it can only be retired (Phase 01 trigger), so past crisis
// events still show what the student selected.
import { useCallback, useEffect, useState } from 'react';
import { Info, Plus, ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';

export function ReferencePage() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', items: [] });
  const [adding, setAdding] = useState(false);
  const [retiring, setRetiring] = useState(null);
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('crisis_items')
      .select('id, label, protocol_ref, set_version, is_active')
      .order('is_active', { ascending: false })
      .order('label', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState({ attempt, status: error ? 'error' : 'ready', items: error ? [] : (data ?? []) });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const activeCount = state.items.filter((i) => i.is_active).length;
  const done = () => {
    setAdding(false);
    setRetiring(null);
    setMessage(t('admin.reference.saved'));
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('admin.reference.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.reference.lead')}</p>
      </header>

      <Card className="flex gap-4 border-l-4 border-l-ink">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-control bg-blush"
        >
          <ShieldCheck className="size-5 text-ink" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold text-ink">
            {t('admin.reference.codesignTitle')}
          </h2>
          <p className="mt-1 text-[15px] text-ink">{t('admin.reference.codesignBody')}</p>
        </div>
      </Card>

      <p role="status" className="font-semibold text-ink">
        {message}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {status === 'ready' ? (
          <Chip className="self-start">
            {t('admin.reference.count', {
              active: activeCount,
              retired: state.items.length - activeCount,
            })}
          </Chip>
        ) : (
          <span />
        )}
        <Button
          onClick={() => setAdding(true)}
          iconLeft={<Plus aria-hidden="true" className="size-4" />}
        >
          {t('admin.reference.add')}
        </Button>
      </div>

      {status === 'loading' && <Skeleton lines={4} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' &&
        (state.items.length === 0 ? (
          <EmptyState title={t('admin.reference.empty')} />
        ) : (
          <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
            <Table
              caption={t('admin.reference.caption')}
              getRowKey={(i) => i.id}
              rows={state.items}
              columns={[
                {
                  key: 'text',
                  header: t('admin.reference.columns.text'),
                  render: (i) => (
                    <span
                      className={
                        i.is_active ? 'font-semibold text-ink' : 'text-ink-muted line-through'
                      }
                    >
                      {i.label}
                    </span>
                  ),
                },
                {
                  key: 'protocol',
                  header: t('admin.reference.columns.protocol'),
                  render: (i) => i.protocol_ref || t('admin.reference.none'),
                },
                {
                  key: 'version',
                  header: t('admin.reference.columns.version'),
                  render: (i) => i.set_version,
                },
                {
                  key: 'status',
                  header: t('admin.reference.columns.status'),
                  render: (i) =>
                    i.is_active ? t('admin.reference.active') : t('admin.reference.retired'),
                },
                {
                  key: 'actions',
                  header: t('admin.reference.columns.actions'),
                  render: (i) =>
                    i.is_active ? (
                      <Button
                        variant="ghost"
                        onClick={() => setRetiring(i)}
                        aria-label={t('admin.reference.retireLabel', { label: i.label })}
                      >
                        {t('admin.reference.retire')}
                      </Button>
                    ) : (
                      ''
                    ),
                },
              ]}
            />
          </div>
        ))}

      <p className="flex items-start gap-2 text-[14px] text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {t('admin.reference.footer')} {t('admin.reference.noScan')}
        </span>
      </p>

      {adding && <AddItemDialog onClose={() => setAdding(false)} onSaved={done} />}
      {retiring && (
        <RetireDialog item={retiring} onClose={() => setRetiring(null)} onSaved={done} />
      )}
    </div>
  );
}

function AddItemDialog({ onClose, onSaved }) {
  const [label, setLabel] = useState('');
  const [protocol, setProtocol] = useState('');
  const [version, setVersion] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.reference.addDialog.${x}`);
  const save = async () => {
    const next = {};
    if (label.trim().length < 2 || label.trim().length > 200) next.label = k('labelError');
    if (version.trim().length < 1 || version.trim().length > 20) next.version = k('versionError');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase
      .from('crisis_items')
      .insert({
        label: label.trim(),
        protocol_ref: protocol.trim() || null,
        set_version: version.trim(),
      })
      .select('id')
      .single();
    setSaving(false);
    if (e || !data) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field id="item-label" label={k('label')} hint={k('labelHint')} error={errors.label}>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
        </Field>
        <Field id="item-protocol" label={k('protocol')} hint={k('protocolHint')}>
          <TextInput
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field
          id="item-version"
          label={k('version')}
          hint={k('versionHint')}
          error={errors.version}
        >
          <TextInput
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Checkbox
          id="item-confirm"
          label={k('confirm')}
          checked={confirmed}
          onChange={setConfirmed}
        />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
          <Button onClick={save} disabled={!confirmed} loading={saving}>
            {k('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RetireDialog({ item, onClose, onSaved }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.reference.retireDialog.${x}`, { label: item.label });
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase
      .from('crisis_items')
      .update({ is_active: false })
      .eq('id', item.id)
      .select('id, is_active')
      .single();
    setSaving(false);
    if (e || data?.is_active !== false) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('body')}</p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
          <Button onClick={save} loading={saving}>
            {k('confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### Step 8 — Resource library and editor

**`src/features/admin/ResourceLibraryPage.jsx`**

```jsx
// Fig 31 · verified resource library (2.1.5.3.3; Table 16; D-07; P09-D12).
// The administrator sees drafts and published resources (RLS). Published = verified_by and
// verified_at set. Shows who verified each resource and when.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDate } from '../../lib/format.js';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  Table,
  TextInput,
  buttonClasses,
} from '../../components/ui/index.js';
import { primaryArea } from '../public/primaryArea.js';

export function ResourceLibraryPage() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', resources: [] });
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('resources')
      .select('id, title, url, attributes, verified_at, staff_accounts(display_name)')
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState({
          attempt,
          status: error ? 'error' : 'ready',
          resources: error ? [] : (data ?? []),
        });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const shown = state.resources.filter(
    (r) =>
      (topic === 'all' || primaryArea(r.attributes).attribute === topic) &&
      r.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('admin.resources.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.resources.lead')}</p>
        </div>
        <Link to="/admin/resources/new" className={buttonClasses('primary', 'md', 'self-start')}>
          <Plus aria-hidden="true" className="size-4" />
          {t('admin.resources.add')}
        </Link>
      </header>

      <Card className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Field id="resource-search" label={t('admin.resources.search')}>
            <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
        </div>
        <SegmentedControl
          label={t('admin.resources.topicLabel')}
          options={[
            { value: 'all', label: t('admin.resources.all') },
            ...CRITERIA.map((c) => ({ value: c.attribute, label: c.studentLabel })),
          ]}
          value={topic}
          onChange={setTopic}
        />
      </Card>

      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' &&
        (shown.length === 0 ? (
          <EmptyState title={t('admin.resources.empty')} />
        ) : (
          <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
            <Table
              caption={t('admin.resources.caption')}
              getRowKey={(r) => r.id}
              rows={shown}
              columns={[
                {
                  key: 'title',
                  header: t('admin.resources.columns.title'),
                  render: (r) => <span className="font-semibold text-ink">{r.title}</span>,
                },
                {
                  key: 'topic',
                  header: t('admin.resources.columns.topic'),
                  render: (r) => <Chip>{primaryArea(r.attributes).label}</Chip>,
                },
                {
                  key: 'by',
                  header: t('admin.resources.columns.verifiedBy'),
                  render: (r) => r.staff_accounts?.display_name ?? '—',
                },
                {
                  key: 'on',
                  header: t('admin.resources.columns.verifiedOn'),
                  render: (r) => (r.verified_at ? formatDate(r.verified_at) : '—'),
                },
                {
                  key: 'status',
                  header: t('admin.resources.columns.status'),
                  render: (r) =>
                    r.verified_at ? t('admin.resources.published') : t('admin.resources.draft'),
                },
                {
                  key: 'actions',
                  header: t('admin.resources.columns.actions'),
                  render: (r) => (
                    <Link
                      to={`/admin/resources/${r.id}`}
                      aria-label={t('admin.resources.editLabel', { title: r.title })}
                      className={buttonClasses('ghost', 'md', 'whitespace-nowrap')}
                    >
                      {t('admin.resources.edit')}
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        ))}

      <Card className="flex items-center gap-3">
        <Shield aria-hidden="true" className="size-5 shrink-0" />
        <p className="text-[15px] text-ink">{t('admin.resources.note')}</p>
      </Card>
    </div>
  );
}
```

**`src/features/admin/ResourceEditPage.jsx`**

```jsx
// Fig 32 · add or edit a resource and its attribute tags (2.1.5.3.3, 2.2.2.4; Table 16; D-07;
// P09-D12..D14). The four values are the resource vector used by rank-resources (Phase 06).
// Publishing means naming who verified it: verified_by is set and the database stamps verified_at.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Select,
  Skeleton,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { validAttributes } from './adminHelpers.js';

const LEVELS = [0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));
const EMPTY = {
  title: '',
  url: '',
  attributes: { school_work: 0, home_family: 0, future: 0, managing: 0 },
  verified_by: null,
};

export function ResourceEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const key = `${id ?? 'new'}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', staff: [] });
  const [form, setForm] = useState(EMPTY);
  const [publish, setPublish] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('staff_accounts')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name', { ascending: true }),
      isNew
        ? Promise.resolve({ data: EMPTY, error: null })
        : supabase
            .from('resources')
            .select('id, title, url, attributes, verified_by')
            .eq('id', id)
            .maybeSingle(),
    ]).then(([staff, res]) => {
      if (!active) return;
      if (staff.error || res.error) return setState({ key, status: 'error', staff: [] });
      if (!res.data) return setState({ key, status: 'notFound', staff: [] });
      setForm({ ...EMPTY, ...res.data, url: res.data.url ?? '' });
      setPublish(Boolean(res.data.verified_by));
      setConfirmed(Boolean(res.data.verified_by));
      setState({ key, status: 'ready', staff: staff.data ?? [] });
    });
    return () => {
      active = false;
    };
  }, [id, isNew, key]);

  const status = state.key === key ? state.status : 'loading';
  const k = (x, v) => t(`admin.resourceEdit.${x}`, v);
  const setAttr = (attr, value) =>
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [attr]: value } }));

  const save = async () => {
    const next = {};
    const title = form.title.trim();
    const url = form.url.trim();
    if (title.length < 2 || title.length > 160) next.title = k('titleError');
    if ((publish || url) && !/^https:\/\/\S+$/i.test(url)) next.url = k('urlError');
    if (!validAttributes(form.attributes)) next.attributes = k('attributesError');
    if (publish && !form.verified_by) next.verifiedBy = k('verifiedByError');
    if (publish && !confirmed) next.confirm = k('confirmError');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError('');
    const row = {
      title,
      url: url || null,
      attributes: form.attributes,
      verified_by: publish ? form.verified_by : null,
    };
    const q = isNew
      ? supabase.from('resources').insert(row)
      : supabase.from('resources').update(row).eq('id', id);
    const { data, error: e } = await q.select('id').single();
    setSaving(false);
    if (e || !data) return setError(k('failed'));
    navigate('/admin/resources', { replace: true });
  };

  const back = (
    <Link
      to="/admin/resources"
      className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {k('back')}
    </Link>
  );
  if (status === 'loading')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Skeleton lines={8} />
      </div>
    );
  if (status === 'error')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  if (status === 'notFound')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={k('notFound')} />
      </div>
    );

  const vector = CRITERIA.map((c) => form.attributes[c.attribute]).join(', ');
  return (
    <div className="mx-auto flex w-full max-w-[840px] flex-col gap-6">
      {back}
      <h1 className="text-[28px] font-semibold leading-9 text-ink">
        {isNew ? k('newTitle') : k('editTitle')}
      </h1>

      <Card className="flex flex-col gap-4">
        <Field id="res-title" label={k('title')} error={errors.title}>
          <TextInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field id="res-url" label={k('url')} hint={k('urlHint')} error={errors.url}>
          <TextInput
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{k('attributesTitle')}</h2>
          <p className="mt-1 text-[14px] text-ink-muted">{k('attributesLead')}</p>
        </div>
        {CRITERIA.map((c) => (
          <div
            key={c.attribute}
            className="flex flex-col gap-2 rounded-control bg-surface-muted p-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p id={`attr-${c.attribute}`} className="font-semibold text-ink">
                {c.studentLabel}
              </p>
              <p className="text-[13px] text-ink-muted">{k(`attributeHints.${c.attribute}`)}</p>
            </div>
            <SegmentedControl
              label={c.studentLabel}
              options={LEVELS}
              value={form.attributes[c.attribute]}
              onChange={(v) => setAttr(c.attribute, v)}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1 text-[13px] text-ink-muted sm:flex-row sm:justify-between">
          <span className="font-semibold text-ink">{k('vector', { values: vector })}</span>
          <span>{k('scale')}</span>
        </div>
        {errors.attributes && (
          <p role="alert" className="text-[13px] font-semibold text-ink">
            {errors.attributes}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[17px] font-semibold text-ink">{k('statusTitle')}</h2>
          <SegmentedControl
            label={k('statusLabel')}
            options={[
              { value: 'draft', label: k('draft') },
              { value: 'published', label: k('published') },
            ]}
            value={publish ? 'published' : 'draft'}
            onChange={(v) => setPublish(v === 'published')}
          />
        </div>
        {publish && (
          <>
            <Field id="res-verifier" label={k('verifiedBy')} error={errors.verifiedBy}>
              <Select
                value={form.verified_by ?? ''}
                placeholder={k('verifiedByPlaceholder')}
                options={state.staff.map((s) => ({ value: s.id, label: s.display_name }))}
                onChange={(e) => setForm((f) => ({ ...f, verified_by: e.target.value || null }))}
              />
            </Field>
            <Checkbox
              id="res-confirm"
              label={k('confirm')}
              checked={confirmed}
              onChange={setConfirmed}
            />
            {errors.confirm && (
              <p role="alert" className="text-[13px] font-semibold text-ink">
                {errors.confirm}
              </p>
            )}
          </>
        )}
        <p className="text-[13px] text-ink-muted">{k('publishNote')}</p>
      </Card>

      <FormMessage>{error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={save} loading={saving}>
            {k('save')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/resources')}>
            {k('cancel')}
          </Button>
        </div>
        {!isNew && (
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            {k('delete')}
          </Button>
        )}
      </div>
      <p className="flex items-start gap-2 rounded-control bg-blush p-3 text-[14px] text-ink">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {k('rankNote')}
      </p>

      {deleting && (
        <DeleteDialog
          id={id}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/admin/resources', { replace: true })}
        />
      )}
    </div>
  );
}

function DeleteDialog({ id, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.resourceEdit.${x}`);
  const remove = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase.from('resources').delete().eq('id', id).select('id');
    setSaving(false);
    if (e || !data?.length) return setError(k('deleteFailed'));
    onDeleted();
  };
  return (
    <Dialog open title={k('deleteTitle')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('deleteBody')}</p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            {k('deleteCancel')}
          </Button>
          <Button onClick={remove} loading={saving}>
            {k('deleteConfirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### Step 9 — Audit trail

**`src/features/admin/AuditPage.jsx`**

```jsx
// Fig 33 · audit trail (2.1.3.6, 2.1.6.2.8; Table 17; D-04, D-16; P09-D15..D17).
// Read-only. Lists who opened or acted on a support request or crisis event, and when.
// It shows a Ref for the record, never its contents, and never a student's name.
import { useCallback, useEffect, useState } from 'react';
import { Download, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { AUDIT_ACTIONS, labelFor } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime, shortRef } from '../../lib/format.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { toCsv } from './adminHelpers.js';

export const PAGE_SIZE = 200;
const COLUMNS =
  'id, created_at, action, actor_id, request_id, crisis_event_id, staff_accounts(display_name)';

function objectText(row) {
  return row.request_id
    ? t('admin.audit.request', { ref: shortRef(row.request_id) })
    : t('admin.audit.crisis', { ref: shortRef(row.crisis_event_id) });
}

export function AuditPage() {
  const [filters, setFilters] = useState({ from: '', to: '', action: '', actor: '' });
  const [pages, setPages] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const key = `${JSON.stringify(filters)}|${pages}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', rows: [], more: false });
  const [staff, setStaff] = useState([]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('staff_accounts')
      .select('id, display_name')
      .order('display_name', { ascending: true })
      .then(({ data }) => {
        if (active) setStaff(data ?? []);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let q = supabase.from('staff_access_audit').select(COLUMNS);
    if (filters.from) q = q.gte('created_at', `${filters.from}T00:00:00+08:00`);
    if (filters.to) q = q.lte('created_at', `${filters.to}T23:59:59.999+08:00`);
    if (filters.action) q = q.eq('action', filters.action);
    if (filters.actor) q = q.eq('actor_id', filters.actor);
    q.order('created_at', { ascending: false })
      .range(0, pages * PAGE_SIZE) // one extra row tells us whether there is more
      .then(({ data, error }) => {
        if (!active) return;
        if (error) return setState({ key, status: 'error', rows: [], more: false });
        const rows = data ?? [];
        setState({
          key,
          status: 'ready',
          rows: rows.slice(0, pages * PAGE_SIZE),
          more: rows.length > pages * PAGE_SIZE,
        });
      });
    return () => {
      active = false;
    };
  }, [filters, pages, key]);

  const status = state.key === key ? state.status : 'loading';
  const setFilter = (name, value) => {
    setPages(1);
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const exportCsv = () => {
    const csv = toCsv(
      ['time', 'staff_member', 'action', 'record_type', 'record_ref'],
      state.rows.map((r) => [
        new Date(r.created_at).toISOString(),
        r.staff_accounts?.display_name ?? '',
        r.action,
        r.request_id ? 'support_request' : 'crisis_event',
        shortRef(r.request_id ?? r.crisis_event_id).replace(/^Ref /, ''),
      ]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hingaweb-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('admin.audit.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.audit.lead')}</p>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-muted">{t('admin.audit.scope')}</p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={status !== 'ready' || state.rows.length === 0}
          iconLeft={<Download aria-hidden="true" className="size-4" />}
        >
          {t('admin.audit.export')}
        </Button>
      </header>

      <Card className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Field id="audit-from" label={t('admin.audit.from')}>
          <TextInput
            type="date"
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </Field>
        <Field id="audit-to" label={t('admin.audit.to')}>
          <TextInput
            type="date"
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </Field>
        <Field id="audit-action" label={t('admin.audit.action')}>
          <Select
            value={filters.action}
            onChange={(e) => setFilter('action', e.target.value)}
            options={[{ value: '', label: t('admin.audit.any') }, ...AUDIT_ACTIONS]}
          />
        </Field>
        <Field id="audit-actor" label={t('admin.audit.actor')}>
          <Select
            value={filters.actor}
            onChange={(e) => setFilter('actor', e.target.value)}
            options={[
              { value: '', label: t('admin.audit.any') },
              ...staff.map((s) => ({ value: s.id, label: s.display_name })),
            ]}
          />
        </Field>
      </Card>

      {status === 'loading' && <Skeleton lines={8} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' &&
        (state.rows.length === 0 ? (
          <EmptyState title={t('admin.audit.empty')} />
        ) : (
          <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
            <Table
              caption={t('admin.audit.caption')}
              getRowKey={(r) => r.id}
              rows={state.rows}
              columns={[
                {
                  key: 'time',
                  header: t('admin.audit.columns.time'),
                  render: (r) => formatDateTime(r.created_at),
                },
                {
                  key: 'actor',
                  header: t('admin.audit.columns.actor'),
                  render: (r) => r.staff_accounts?.display_name ?? '',
                },
                {
                  key: 'action',
                  header: t('admin.audit.columns.action'),
                  render: (r) => labelFor(AUDIT_ACTIONS, r.action),
                },
                {
                  key: 'object',
                  header: t('admin.audit.columns.object'),
                  render: (r) => objectText(r),
                },
              ]}
            />
          </div>
        ))}
      {status === 'ready' && state.more && (
        <Button variant="outline" className="self-start" onClick={() => setPages((p) => p + 1)}>
          {t('admin.audit.loadMore')}
        </Button>
      )}

      <section className="rounded-card border-2 border-ink bg-surface p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Lock aria-hidden="true" className="size-4" />
          {t('admin.audit.whyTitle')}
        </h2>
        <p className="mt-2 text-[15px] text-ink">{t('admin.audit.whyBody')}</p>
      </section>
    </div>
  );
}
```

### Step 10 — Routes

Every admin route now has its real screen. Do **not** delete `src/features/placeholder/PhasePlaceholder.jsx` yet; Phase 10 does.

**`src/routes.jsx`**

```jsx
// The route table from 00 Section 7. Every route now has its real screen (Phase 09).
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
import { AccountsPage } from './features/admin/AccountsPage.jsx';
import { ConsentPage } from './features/admin/ConsentPage.jsx';
import { ReferencePage } from './features/admin/ReferencePage.jsx';
import { ResourceLibraryPage } from './features/admin/ResourceLibraryPage.jsx';
import { ResourceEditPage } from './features/admin/ResourceEditPage.jsx';
import { AuditPage } from './features/admin/AuditPage.jsx';

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
          <Route path="admin/accounts" element={<AccountsPage />} />
          <Route path="admin/consent" element={<ConsentPage />} />
          <Route path="admin/reference" element={<ReferencePage />} />
          <Route path="admin/resources" element={<ResourceLibraryPage />} />
          <Route path="admin/resources/new" element={<ResourceEditPage />} />
          <Route path="admin/resources/:id" element={<ResourceEditPage />} />
          <Route path="admin/audit" element={<AuditPage />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

### Step 11 — Tests

**`src/features/admin/adminHelpers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  consentRows,
  countBy,
  staffUpdateErrorKey,
  toCsv,
  validAttributes,
} from './adminHelpers.js';

const s = (id, full_name) => ({ id, full_name, grade_level: 12, section: 'A' });
const r = (student_id, type, status, signed_at) => ({
  id: `${student_id}-${type}-${signed_at}`,
  student_id,
  type,
  status,
  signed_at,
  instrument_version: 'v1',
});

describe('consentRows (Fig 29; D-27)', () => {
  it('uses the newest record of each type and sorts by name', () => {
    const rows = consentRows(
      [s('b', 'Miguel'), s('a', 'Ana'), s('c', 'Paolo'), s('d', 'Sam')],
      [
        r('a', 'assent', 'granted', '2026-08-01'),
        r('a', 'parental', 'granted', '2026-08-02'),
        r('b', 'assent', 'granted', '2026-08-01'),
        r('d', 'assent', 'granted', '2026-08-01'),
        r('d', 'parental', 'withdrawn', '2026-08-02'),
        r('d', 'parental', 'granted', '2026-09-01'),
      ],
    );
    expect(rows.map((x) => [x.full_name, x.category])).toEqual([
      ['Ana', 'both'],
      ['Miguel', 'awaiting'],
      ['Paolo', 'noAssent'],
      ['Sam', 'both'], // a newer parental consent after a withdrawal
    ]);
    expect(countBy(rows, 'category')).toEqual({ both: 2, awaiting: 1, noAssent: 1 });
  });

  it('a withdrawn assent or parental consent puts the student in Withdrawn', () => {
    const rows = consentRows(
      [s('a', 'Ana')],
      [r('a', 'assent', 'withdrawn', '2026-08-01'), r('a', 'parental', 'granted', '2026-08-02')],
    );
    expect(rows[0].category).toBe('withdrawn');
  });
});

describe('small helpers', () => {
  it('maps the Phase 01 staff trigger messages', () => {
    expect(
      staffUpdateErrorKey({ message: 'staff_accounts: you cannot change your own role or status' }),
    ).toBe('admin.accounts.errors.own');
    expect(
      staffUpdateErrorKey({
        message: 'staff_accounts: at least one active administrator is required',
      }),
    ).toBe('admin.accounts.errors.lastAdmin');
    expect(staffUpdateErrorKey({ message: 'x' })).toBe('admin.accounts.errors.generic');
  });

  it('validates resource attributes like the Table 16 CHECK', () => {
    expect(validAttributes({ school_work: 5, home_family: 0, future: 0, managing: 0 })).toBe(true);
    expect(validAttributes({ school_work: 0, home_family: 0, future: 0, managing: 0 })).toBe(false);
    expect(validAttributes({ school_work: 6, home_family: 0, future: 0, managing: 0 })).toBe(false);
    expect(validAttributes({ school_work: 1.5, home_family: 0, future: 0, managing: 0 })).toBe(
      false,
    );
  });

  it('writes CSV with quoting', () => {
    expect(toCsv(['a', 'b'], [['x', 'he said "hi", ok']])).toBe(
      'a,b\r\nx,"he said ""hi"", ok"\r\n',
    );
  });
});
```

**`src/features/admin/accounts.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { AccountsPage } = await import('./AccountsPage.jsx');

const ME = '66666666-6666-4666-8666-666666666666';
const ACCOUNTS = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    role: 'guidance',
    display_name: 'Guidance Associate (dev)',
    is_active: true,
    email: 'guidance.one@example.test',
    last_sign_in_at: '2026-10-10T00:02:00Z',
  },
  {
    id: ME,
    role: 'administrator',
    display_name: 'Administrator (dev)',
    is_active: true,
    email: 'admin.one@example.test',
    last_sign_in_at: null,
  },
];

function renderAccounts({ invoke = [], update } = {}) {
  const { client, queries } = guidanceClient({
    tables: {
      students: { count: 4, data: null, error: null },
      staff_accounts: update ?? { data: null, error: null },
    },
  });
  client.functions.invoke.mockResolvedValueOnce({ data: { accounts: ACCOUNTS }, error: null });
  for (const r of invoke) client.functions.invoke.mockResolvedValueOnce(r);
  client.functions.invoke.mockResolvedValue({ data: { accounts: ACCOUNTS }, error: null });
  mock.client = client;
  renderWithAuth(<Route path="/admin/accounts" element={<AccountsPage />} />, {
    path: '/admin/accounts',
    auth: fakeAuth({
      account: ADMIN,
      aal: AAL2,
      session: { user: { id: ME, email: 'admin.one@example.test' } },
    }),
  });
  return { client, queries };
}

describe('AccountsPage (Figs 27-28; 2.1.5.3.1)', () => {
  it('lists staff from admin-accounts with counts, and lists no students', async () => {
    const { client } = renderAccounts();
    const table = await screen.findByRole('table', { name: 'Staff accounts' });
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-accounts', {
      body: { action: 'list' },
    });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('guidance.one@example.test')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Not yet')).toBeInTheDocument();
    expect(within(rows[1]).getByText('This is your account')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Students').nextSibling).toHaveTextContent('4');
    expect(screen.getByText("Read any student's check-ins.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/written to the audit trail/i); // D-04
  });

  it('changes a role and confirms only when the row comes back', async () => {
    const { queries } = renderAccounts({
      update: { data: { id: ACCOUNTS[0].id, role: 'administrator', is_active: true }, error: null },
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Change the role of Guidance Associate (dev)' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Change role' });
    await user.click(within(dialog).getByRole('radio', { name: /Administrator/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(queries.staff_accounts[0].calls).toEqual([
      ['update', { role: 'administrator' }],
      ['eq', 'id', ACCOUNTS[0].id],
      ['select', 'id, role, is_active'],
      ['single'],
    ]);
  });

  it('explains the last-administrator rule when the database refuses', async () => {
    renderAccounts({
      update: {
        data: null,
        error: { message: 'staff_accounts: at least one active administrator is required' },
      },
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Deactivate Guidance Associate (dev)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
    expect(
      await screen.findByText('There must always be at least one active administrator.'),
    ).toBeInTheDocument();
  });

  it('creates a staff account by invitation, checking the form first', async () => {
    const { client } = renderAccounts({
      invoke: [
        {
          data: { id: '77777777-7777-4777-8777-777777777777', email: 'new@example.test' },
          error: null,
        },
      ],
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create staff account' });
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(
      within(dialog).getByText('Enter the full name (2 to 120 characters).'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a role.')).toBeInTheDocument();
    expect(within(dialog).getByText(/created without a password/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Full name'), 'New Staff');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Work email address' }),
      'new@example.test',
    );
    await user.click(within(dialog).getByRole('radio', { name: /^Guidance/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Invitation sent to new@example.test.')).toBeInTheDocument();
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-accounts', {
      body: {
        action: 'create',
        email: 'new@example.test',
        display_name: 'New Staff',
        role: 'guidance',
      },
    });
  });

  it('says when the email already has an account', async () => {
    renderAccounts({ invoke: [{ data: null, error: { context: { status: 409 } } }] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create staff account' });
    await user.type(within(dialog).getByLabelText('Full name'), 'New Staff');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Work email address' }),
      'guidance.one@example.test',
    );
    await user.click(within(dialog).getByRole('radio', { name: /^Administrator/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(
      await within(dialog).findByText('That email address already has an account.'),
    ).toBeInTheDocument();
  });
});
```

**`src/features/admin/consent.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ConsentPage } = await import('./ConsentPage.jsx');

const STUDENTS = [
  { id: 's1', full_name: 'Ana Reyes', grade_level: 12, section: 'HUMSS-A' },
  { id: 's2', full_name: 'Miguel Tan', grade_level: 11, section: 'ABM-B' },
  { id: 's3', full_name: 'Paolo Diaz', grade_level: 11, section: 'HUMSS-B' },
];
const rec = (student_id, type, status, extra = {}) => ({
  id: `${student_id}-${type}`,
  student_id,
  type,
  status,
  instrument_version: `${type}-v1`,
  signed_at: '2026-08-12T02:00:00Z',
  withdrawn_at: status === 'withdrawn' ? '2026-09-02T02:00:00Z' : null,
  ...extra,
});
const RECORDS = [
  rec('s1', 'assent', 'granted'),
  rec('s1', 'parental', 'granted'),
  rec('s2', 'assent', 'granted'),
  rec('s3', 'assent', 'granted'),
  rec('s3', 'parental', 'withdrawn'),
];

function renderConsent(write = { data: [{ id: 'x' }], error: null }) {
  const { client, queries } = guidanceClient({
    tables: {
      students: { data: STUDENTS, error: null },
      consent_records: (calls) =>
        calls.some((c) => c[0] === 'insert' || c[0] === 'update')
          ? calls.some((c) => c[0] === 'single')
            ? { data: { id: 'n' }, error: write.error }
            : write
          : { data: RECORDS, error: null },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/consent" element={<ConsentPage />} />, {
    path: '/admin/consent',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return { client, queries };
}

describe('ConsentPage (Fig 29; 2.1.5.3.2; D-26, D-27)', () => {
  it('shows each student once with both records and the summary counts', async () => {
    renderConsent();
    const table = await screen.findByRole('table', { name: 'Consent and assent for each student' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      'Ana Reyes',
      'Miguel Tan',
      'Paolo Diaz',
    ]);
    expect(within(rows[0]).getAllByText('Recorded 12 Aug 2026 · form parental-v1').length).toBe(1);
    expect(within(rows[1]).getByText('Not recorded')).toBeInTheDocument();
    expect(
      within(rows[2]).getByText('Withdrawn 2 Sep 2026 · form parental-v1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Both recorded', { selector: 'p' }).nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Awaiting parental consent').nextSibling).toHaveTextContent('1');
  });

  it('records parental consent only after the form version and confirmation', async () => {
    const { queries } = renderConsent();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Record parental consent for Miguel Tan' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Record parental consent' });
    const save = within(dialog).getByRole('button', { name: 'Record consent' });
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(save);
    expect(
      within(dialog).getByText('Enter the form version (1 to 40 characters).'),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Form version'), 'parental-v1');
    await user.click(save);
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const insert = queries.consent_records.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      { student_id: 's2', type: 'parental', instrument_version: 'parental-v1' },
    ]);
  });

  it('records a withdrawal on every granted record of that type', async () => {
    const { queries } = renderConsent();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Record a withdrawal for Ana Reyes' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Record withdrawal' });
    await user.click(within(dialog).getByRole('radio', { name: 'Parental consent' }));
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Record withdrawal' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const update = queries.consent_records.find((q) => q.calls[0][0] === 'update');
    expect(update.calls).toEqual([
      ['update', { status: 'withdrawn' }],
      ['eq', 'student_id', 's1'],
      ['eq', 'type', 'parental'],
      ['eq', 'status', 'granted'],
      ['select', 'id'],
    ]);
  });

  it('filters by category and searches by name', async () => {
    renderConsent();
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.click(screen.getByRole('radio', { name: 'Withdrawn' }));
    expect(screen.getByText('Paolo Diaz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    await user.type(screen.getByLabelText('Search by student name'), 'mig');
    expect(screen.getByText('Miguel Tan')).toBeInTheDocument();
    expect(screen.queryByText('Paolo Diaz')).not.toBeInTheDocument();
  });
});
```

**`src/features/admin/reference.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ReferencePage } = await import('./ReferencePage.jsx');

const ITEMS = [
  {
    id: 'i1',
    label: '[[GUIDANCE:crisis_item_1]]',
    protocol_ref: '[[GUIDANCE:crisis_protocol_step_1]]',
    set_version: 'v0-placeholder',
    is_active: true,
  },
  { id: 'i9', label: 'Old item', protocol_ref: null, set_version: 'v0', is_active: false },
];

function renderRef() {
  const { client, queries } = guidanceClient({
    tables: {
      crisis_items: (calls) => {
        if (calls[0][0] === 'insert') return { data: { id: 'new' }, error: null };
        if (calls[0][0] === 'update') return { data: { id: 'i1', is_active: false }, error: null };
        return { data: ITEMS, error: null };
      },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/reference" element={<ReferencePage />} />, {
    path: '/admin/reference',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return { queries };
}

describe('ReferencePage (Fig 30; Table 12)', () => {
  it('lists active and retired items; only active ones can be retired; nothing can be edited', async () => {
    renderRef();
    const table = await screen.findByRole('table', { name: 'Crisis items' });
    expect(screen.getByText('1 active, 1 retired')).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      within(rows[0]).getByRole('button', { name: 'Retire the item [[GUIDANCE:crisis_item_1]]' }),
    ).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Retired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
    expect(screen.getByText(/never scans or matches words/)).toBeInTheDocument();
  });

  it('adds an agreed item only after the co-design confirmation', async () => {
    const { queries } = renderRef();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Add agreed item' }));
    const dialog = screen.getByRole('dialog', { name: 'Add agreed item' });
    expect(within(dialog).getByRole('button', { name: 'Add item' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Item text'), '  Agreed wording  ');
    await user.type(within(dialog).getByLabelText('Set version'), 'v1');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const insert = queries.crisis_items.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      { label: 'Agreed wording', protocol_ref: null, set_version: 'v1' },
    ]);
  });

  it('retires through is_active only', async () => {
    const { queries } = renderRef();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Retire the item/ }));
    await user.click(screen.getByRole('button', { name: 'Retire item' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const update = queries.crisis_items.find((q) => q.calls[0][0] === 'update');
    expect(update.calls.slice(0, 2)).toEqual([
      ['update', { is_active: false }],
      ['eq', 'id', 'i1'],
    ]);
  });
});
```

**`src/features/admin/resources-admin.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ResourceLibraryPage } = await import('./ResourceLibraryPage.jsx');
const { ResourceEditPage } = await import('./ResourceEditPage.jsx');

const RES = [
  {
    id: 'r1',
    title: 'Managing exam pressure',
    url: 'https://example.org/1',
    attributes: { school_work: 5, home_family: 1, future: 1, managing: 2 },
    verified_at: '2026-07-20T02:00:00Z',
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
  {
    id: 'r5',
    title: 'Sleep and routine',
    url: null,
    attributes: { school_work: 0, home_family: 0, future: 0, managing: 4 },
    verified_at: null,
    staff_accounts: null,
  },
];
const STAFF = [
  { id: '55555555-5555-4555-8555-555555555555', display_name: 'Guidance Associate (dev)' },
];

function setup(resources = {}) {
  const { client, queries } = guidanceClient({
    tables: {
      staff_accounts: { data: STAFF, error: null },
      resources: (calls) => {
        const op = calls[0][0];
        if (op === 'insert' || op === 'update')
          return resources.write ?? { data: { id: 'r1' }, error: null };
        if (op === 'delete') return { data: [{ id: 'r1' }], error: null };
        if (calls.some((c) => c[0] === 'maybeSingle'))
          return {
            data: {
              id: 'r1',
              title: RES[0].title,
              url: RES[0].url,
              attributes: RES[0].attributes,
              verified_by: STAFF[0].id,
            },
            error: null,
          };
        return { data: RES, error: null };
      },
    },
  });
  mock.client = client;
  return queries;
}

const auth = () => fakeAuth({ account: ADMIN, aal: AAL2 });
const routes = [
  <Route key="l" path="/admin/resources" element={<ResourceLibraryPage />} />,
  <Route key="n" path="/admin/resources/new" element={<ResourceEditPage />} />,
  <Route key="e" path="/admin/resources/:id" element={<ResourceEditPage />} />,
];

describe('ResourceLibraryPage (Fig 31)', () => {
  it('shows drafts and published resources with who verified them', async () => {
    const queries = setup();
    renderWithAuth(routes, { path: '/admin/resources', auth: auth() });
    const table = await screen.findByRole('table', { name: 'Resources' });
    expect(queries.resources[0].calls[0]).toEqual([
      'select',
      'id, title, url, attributes, verified_at, staff_accounts(display_name)',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Guidance Associate (dev)')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Published')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Draft')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Managing')).toBeInTheDocument();
  });
});

describe('ResourceEditPage (Fig 32; D-07)', () => {
  it('a new draft saves title, url, and attributes with no verifier', async () => {
    const queries = setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/new', auth: auth() });
    await user.type(await screen.findByLabelText('Title'), 'New guide');
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(screen.getByText('At least one area must be above 0.')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Future' })).getByRole('radio', { name: '4' }),
    );
    expect(screen.getByText('Resource vector: 0, 0, 4, 0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(await screen.findByRole('table', { name: 'Resources' })).toBeInTheDocument();
    const insert = queries.resources.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      {
        title: 'New guide',
        url: null,
        attributes: { school_work: 0, home_family: 0, future: 4, managing: 0 },
        verified_by: null,
      },
    ]);
  });

  it('publishing needs an https URL, a verifier, and the confirmation', async () => {
    setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/new', auth: auth() });
    await user.type(await screen.findByLabelText('Title'), 'New guide');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'School work' })).getByRole('radio', {
        name: '3',
      }),
    );
    await user.click(screen.getByRole('radio', { name: 'Published' }));
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(screen.getByText('Enter a link that starts with https://')).toBeInTheDocument();
    expect(screen.getByText('Choose who verified this resource.')).toBeInTheDocument();
    expect(screen.getByText('Tick the box to publish.')).toBeInTheDocument();
  });

  it('editing loads the resource; unpublishing clears the verifier; delete asks first', async () => {
    const queries = setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/r1', auth: auth() });
    expect(await screen.findByDisplayValue('Managing exam pressure')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Published' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('radio', { name: 'Draft' }));
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    await screen.findByRole('table', { name: 'Resources' });
    const update = queries.resources.find((q) => q.calls[0][0] === 'update');
    expect(update.calls[0][1].verified_by).toBeNull();
    expect(update.calls[1]).toEqual(['eq', 'id', 'r1']);
  });
});
```

**`src/features/admin/audit.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { AuditPage } = await import('./AuditPage.jsx');

const ROWS = [
  {
    id: 'a1',
    created_at: '2026-10-10T00:22:00Z',
    action: 'view_request',
    actor_id: 'g1',
    request_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    crisis_event_id: null,
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
  {
    id: 'a2',
    created_at: '2026-10-10T00:15:00Z',
    action: 'crisis_acknowledged',
    actor_id: 'g1',
    request_id: null,
    crisis_event_id: 'ccccccc1-0000-4000-8000-000000000001',
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
];

function renderAudit() {
  const { client, queries } = guidanceClient({
    tables: {
      staff_accounts: {
        data: [{ id: 'g1', display_name: 'Guidance Associate (dev)' }],
        error: null,
      },
      staff_access_audit: { data: ROWS, error: null },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/audit" element={<AuditPage />} />, {
    path: '/admin/audit',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return queries;
}

describe('AuditPage (Fig 33; Table 17; D-04, D-16)', () => {
  it('lists entries newest first with a Ref, never a student name or contents', async () => {
    const queries = renderAudit();
    const table = await screen.findByRole('table', { name: 'Audit entries, newest first' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Opened support request')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Support request Ref 7c9e6679')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Crisis event Ref ccccccc1')).toBeInTheDocument();
    const select = queries.staff_access_audit[0].calls[0][1];
    expect(select).not.toMatch(/disclosed|note|full_name/);
    expect(screen.queryByRole('button', { name: /delete|edit/i })).not.toBeInTheDocument();
  });

  it('filters by date (Manila day bounds), action, and staff member', async () => {
    const queries = renderAudit();
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.type(screen.getByLabelText('From'), '2026-10-01');
    await user.selectOptions(screen.getByLabelText('Action'), 'tag');
    await user.selectOptions(screen.getByLabelText('Staff member'), 'g1');
    await screen.findByRole('table');
    const last = queries.staff_access_audit[queries.staff_access_audit.length - 1].calls;
    expect(last).toContainEqual(['gte', 'created_at', '2026-10-01T00:00:00+08:00']);
    expect(last).toContainEqual(['eq', 'action', 'tag']);
    expect(last).toContainEqual(['eq', 'actor_id', 'g1']);
  });

  it('exports the shown entries as CSV', async () => {
    renderAudit();
    const user = userEvent.setup();
    await screen.findByRole('table');
    const blobs = [];
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((b) => (blobs.push(b), 'blob:x'));
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const text = await blobs[0].text();
    expect(text.split('\r\n')[0]).toBe('time,staff_member,action,record_type,record_ref');
    expect(text).toContain('view_request,support_request,7c9e6679');
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
});
```

**`e2e/phase-09/admin.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PASSWORD, latestAuthLink, staffLogin, studentLogin } from '../helpers/auth.js';

// Needs the local stack, `npx supabase functions serve`, and `node scripts/dev-enrol-totp.js`.
// Run right after `npx supabase db reset`. Changes seed data, so it runs once (desktop only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'changes seed data; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function noAxeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Phase 09 · administrator console (Figs 27-33)', () => {
  test('accounts: lists staff and invites a new guidance account', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
    const table = page.getByRole('table', { name: 'Staff accounts' });
    await expect(table).toContainText('guidance.one@example.test');
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Create staff account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create staff account' });
    await dialog.getByLabel('Full name').fill('E2E Guidance');
    await dialog
      .getByRole('textbox', { name: 'Work email address' })
      .fill('e2e.guidance@example.test');
    await dialog.getByRole('radio', { name: /^Guidance/ }).check();
    await dialog.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Invitation sent to e2e.guidance@example.test.')).toBeVisible();
    await expect(table).toContainText('E2E Guidance');

    // The invitation link opens first-time setup (Phase 02) in a fresh browser.
    const link = await latestAuthLink('e2e.guidance@example.test');
    const fresh = await page.context().browser().newContext();
    const invited = await fresh.newPage();
    await invited.goto(link);
    await expect(invited).toHaveURL(/\/staff\/setup/);
    await fresh.close();
  });

  test('accounts: a deactivated staff member cannot sign in; reactivating restores access', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('button', { name: 'Deactivate Guidance Associate (dev)' }).click();
    await page.getByRole('button', { name: 'Deactivate account' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    const other = await browser.newContext();
    const g = await other.newPage();
    await g.goto('/staff/login');
    await g.getByLabel('Work email address').fill('guidance.one@example.test');
    await g.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await g.getByRole('button', { name: 'Continue' }).click();
    await expect(g).toHaveURL(/\/staff\/login$/);
    await other.close();

    await page.getByRole('button', { name: 'Reactivate Guidance Associate (dev)' }).click();
    await page.getByRole('button', { name: 'Reactivate account' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
  });

  test('consent: recording parental consent opens check-ins for that student', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Consent' }).click();
    await expect(
      page.getByRole('table', { name: 'Consent and assent for each student' }),
    ).toBeVisible();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Record parental consent for Paolo Diaz' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record parental consent' });
    await dialog.getByLabel('Form version').fill('parental-v1');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Record consent' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    const other = await browser.newContext();
    const s = await other.newPage();
    await studentLogin(s, 'student.noparent@example.test');
    await expect(s).toHaveURL(/\/check-in$/);
    await other.close();
  });

  test('reference data: an added item shows on the check-in; a retired one disappears', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Reference data' }).click();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Add agreed item' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add agreed item' });
    await dialog.getByLabel('Item text').fill('E2E agreed item');
    await dialog.getByLabel('Set version').fill('v-e2e');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByRole('table', { name: 'Crisis items' })).toContainText(
      'E2E agreed item',
    );

    const other = await browser.newContext();
    const s = await other.newPage();
    await studentLogin(s, 'student.full@example.test');
    await expect(s.getByLabel('E2E agreed item')).toBeVisible();

    await page.getByRole('button', { name: 'Retire the item E2E agreed item' }).click();
    await page.getByRole('button', { name: 'Retire item' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await s.reload();
    await expect(s.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    await expect(s.getByLabel('E2E agreed item')).toHaveCount(0);
    await other.close();
  });

  test('resources: a published resource appears on the public guides page', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Resources' }).click();
    await noAxeViolations(page);
    await page.getByRole('link', { name: 'Add resource' }).click();
    await page.getByLabel('Title').fill('E2E published guide');
    await page.getByLabel('Source URL').fill('https://example.org/hingaweb-dev/e2e');
    await page
      .getByRole('radiogroup', { name: 'Future' })
      .getByRole('radio', { name: '4' })
      .click();
    await page.getByRole('radio', { name: 'Published' }).click();
    await page.getByLabel('Verified by').selectOption({ label: 'Guidance Associate (dev)' });
    await page.getByRole('checkbox').check();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Save resource' }).click();
    await expect(page.getByRole('table', { name: 'Resources' })).toContainText(
      'E2E published guide',
    );

    const anon = await browser.newContext();
    const p = await anon.newPage();
    await p.goto('/guides');
    await expect(p.getByText('E2E published guide')).toBeVisible();
    await anon.close();
  });

  test('audit trail: read-only, with no delete or edit', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Audit' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
    await expect(page.getByText('Why there is no delete')).toBeVisible();
    await expect(page.getByRole('button', { name: /delete|edit/i })).toHaveCount(0);
    await noAxeViolations(page);
  });
});
```

Run:

```bash
npm run verify
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-09
```

### Step 12 — Hosted project (after local acceptance)

1. `npx supabase secrets set SITE_URL=https://<production domain>` (no trailing slash).
2. Supabase dashboard → **Authentication → URL Configuration**: Site URL = the production domain; add `https://<production domain>/staff/setup` (and each preview domain you test invitations on, for example `https://*-<team>.vercel.app/**`) to **Redirect URLs**.
3. Authentication → **Emails → Invite user**: keep the default template, or change only the wording around `{{ .ConfirmationURL }}`; never remove the link.
4. `npx supabase functions deploy admin-accounts`.
5. The very first administrator cannot be invited from this screen (nobody can open it yet). Phase 10 §7.2 shows how to make that one account by hand; every later staff account is invited here.

---

## 7. Must never (this phase)

1. Never list, search, or open student accounts on the accounts screen; only count them.
2. Never call `auth.admin.*` from the browser or ship the service key to it; only `admin-accounts` uses the service client, and only for staff ids.
3. Never let the administrator type or set a staff password.
4. Never read `checkins`, `support_requests`, `crisis_events`, `triage_decisions`, `office_tags`, `prompt_events`, or `resource_views` from admin code.
5. Never edit or delete a crisis item; only retire it.
6. Never delete or overwrite a consent record; a withdrawal is an update to `withdrawn` on the existing row.
7. Never record student assent from the admin console (the student records it in Phase 04).
8. Never publish a resource without a named verifier, and never set `verified_at` from the browser.
9. Never add a summary, description, or any text analysis to resources; only the four values.
10. Never offer edit or delete on audit entries, and never show what a student wrote or a student's name in the trail.
11. Never claim an admin action is written to the audit trail (D-04).
12. Never show "Saved." before the database returns the changed row.
13. Never preselect a role in the create dialog, or default a withdrawal type when two records are granted.
14. Never write a crisis item's wording yourself; use the set the guidance office agreed (GUIDANCE placeholder until then).

---

## 8. Acceptance checklist

Record `phase-09: acceptance passed (checks 1–12)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 283 tests pass; lint, copy, colours OK; build OK |
| 2 | End to end | `db reset`, enrol TOTP, functions serving, `npm run test:e2e -- e2e/phase-09` | 6 pass on desktop; 6 skipped on mobile |
| 3 | Invitation | as `admin.one`, create a guidance account `test.invite@example.test`; open Mailpit (`http://127.0.0.1:54324`) and click the link | "Invitation sent to …"; the new row shows "Not yet" for last sign in; the link opens `/staff/setup`, which asks for a password and then an authenticator |
| 4 | Own account | find your own row (`Administrator (dev)`) | it shows "This is your account" and no buttons. (The "own role" and "last administrator" refusals are enforced by the Phase 01 trigger and covered by the Phase 01 database tests and `adminHelpers.test.js`.) |
| 5 | Deactivation | deactivate `Guidance Associate (dev)`; in a private window sign in as `guidance.one@example.test` | the private window stays on `/staff/login`; after "Reactivate" the same sign-in reaches `/staff/queue` |
| 6 | Parental consent | `db reset`; record parental consent for Paolo Diaz ("Awaiting" in the seed); in a private window sign in as `student.noparent@example.test` | the row moves to "Both recorded"; the student lands on `/check-in`, not the waiting page |
| 7 | Withdrawal | record a withdrawal for Paolo Diaz, choosing Parental consent; reload the student's `/check-in` | the cell reads "Withdrawn {date} · form {version}"; the student sees the waiting page; Studio → `consent_records` still has the row, now with `withdrawn_at` set |
| 8 | Crisis items | add an agreed item ("Add item" stays disabled until ticked); in a private window sign in as `student.full@example.test`; then retire the item and reload the student's page | the item appears on the check-in; after retiring it is gone from the check-in and struck through here; there is no edit or delete button |
| 9 | Resources | add a resource with values 0/0/0/0 | "At least one area must be above 0." Then set School work 5, publish without a verifier: "Choose who verified this resource." Choose a verifier and tick: the library shows it as Published with that name and today's date, and it appears on `/guides`; switch it to Draft: it disappears from `/guides` |
| 10 | Audit trail | as `guidance.one` open a request; as `admin.one` open `/admin/audit`, filter by today and that staff member, Export CSV | the entry "Opened support request" with "Support request Ref …" is listed; no edit or delete control anywhere; the CSV header is `time,staff_member,action,record_type,record_ref` |
| 11 | No student wellbeing data | run the SQL below in Studio; also DevTools → Network while visiting every admin screen | `student_sees_own` is 1 and `admin_sees_checkins` is 0; no request to `checkins`, `support_requests`, `crisis_events`, or `triage_decisions` |
| 12 | Mobile, keyboard, dialogs | 390 px; Tab through every screen and dialog; type a full name in "Create staff account" | no horizontal page scroll; the header shows HingaWeb and Menu only; focus stays in the field while typing (Dialog fix); Escape closes a dialog and focus returns to the button that opened it |

SQL for check 11 (local only; run as one block, it rolls back):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
insert into public.checkins (student_id, c1, c2, c3, c4, mood, stress)
  values ('11111111-1111-4111-8111-111111111111', 2, 2, 2, 2, 3, 3);
select count(*) as student_sees_own from public.checkins;
set local request.jwt.claims = '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","aal":"aal2"}';
select (select count(*) from public.checkins) as admin_sees_checkins;
rollback;
```
