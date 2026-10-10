# Demo mode

Demo mode is for **local demos and screenshots only**. It has two separate parts:

- **Sample content:** names, hours, rooms and hotlines shown in the app.
- **Sample records:** students, check-ins, requests and similar rows in the local database.

You can use either part on its own. The team decision behind this is recorded in
`docs/questions.md` under "Demo mode".

> **Never run the demo seed on a hosted project.** `scripts/demo-seed.js` refuses to run unless
> `VITE_SUPABASE_URL` in `.env.local` points at `127.0.0.1` or `localhost`. Never copy demo data
> into `supabase/seed.sql` or a migration.

## 1. Sample content (`VITE_DEMO_CONTENT`)

When `VITE_DEMO_CONTENT=true`, `src/config/site.js` and `src/content/directory.js` show the sample
values from `src/content/demo-content.js` instead of the `[[...]]` placeholders. The placeholders in
those two files are not changed.

- **The two hotlines are real public lines:** the NCMH Crisis Hotline and the 911 National
  Emergency Hotline.
- **Everything else is fictional:** made-up names, a made-up room, `000` phone numbers and
  `example.org` emails. These values carry no "(sample)" label on screen.
- **Translations are not covered:** `src/copy/ceb.js` and `src/copy/tl.js` stay placeholders.

### Turn it on

Create `.env.demo.local` in the repo root. Git ignores it. It holds one line:

```
VITE_DEMO_CONTENT=true
```

Then run the app in the `demo` mode:

```bash
npx vite --mode demo                                  # dev server
npx vite build --mode demo && npx vite preview --port 4173   # built app
```

You can also set the variable for a single command. In Git Bash:

```bash
VITE_DEMO_CONTENT=true npx vite build && npx vite preview --port 4173
```

### Turn it off

1. Run the normal commands (`npm run dev` and `npm run build`) without `--mode demo`.
2. Rebuild before you run e2e tests or deploy. The built `dist/` keeps whatever it was built with.

Do not put `VITE_DEMO_CONTENT=true` in `.env` or `.env.local`. Every normal run, and the unit tests,
would then use the sample values.

To check that a build is clean:

```bash
npx vite build && grep -rlE "NCMH|Room 101" dist   # prints nothing when demo content is off
```

### Safety

`npm run build:pilot` runs `scripts/check-placeholders.js --strict`. The check fails if
`VITE_DEMO_CONTENT` is `"true"` in either of these places:

- the environment
- any `.env*` file in the repo root

## 2. Sample records (`scripts/demo-seed.js`)

Load the records into the local database only, starting from a fresh reset:

```bash
npx supabase db reset            # normal migrations + supabase/seed.sql
node scripts/demo-seed.js        # adds the demo records on top
node scripts/dev-enrol-totp.js   # staff authenticator secrets (a reset clears them)
```

The script uses `docker exec` with `psql` inside the local `supabase_db_<project_id>` container, so
it needs no extra packages. It runs only once per reset; a second run stops with a message.

### What it adds

- **10 fictional students** in grades 11 and 12, all with emails `demo.studentNN@example.test` and
  the usual dev password.
  - 7 have both consents.
  - 2 are waiting for parental consent.
  - 1 has withdrawn parental consent.
- **14 check-ins for `student.full@example.test`** (Ana Reyes) spread over the last 6 weeks, so My
  Trends has a real shape. The `checkins_stamp` trigger is turned off only while these backdated
  rows are inserted.
- **8 support requests** saved through `create_support_request`.
  - Every score and band comes from `saw.js` and `scoring-config.js`. The script stops if the
    sample ratings stop producing all of P1, P2, P3 and For Review.
- **Guidance actions done as `guidance.one`:** opening requests, changing statuses, office tags and
  one overdue follow-up. This fills the queue markers and the audit trail.
- **Crisis items:** the three placeholder crisis items are retired, and three "(sample)" items with a
  sample protocol step are added.
- **2 crisis events:** one active, and one acknowledged and resolved.
- **Resources:** real guide links instead of `example.org`.
  - The five seed resources keep their titles and areas and get matching YoungMinds pages.
    "Sleep and routine" stays the draft.
  - 7 more published guides are added, each titled to match its page: Problems at school, Family,
    Self-care, Believing in yourself, Friendships, Social media, Young carers.

Demo guides link to YoungMinds (UK); the guidance office chooses the real library before the pilot.

Requests, audit entries and crisis events carry the time the script ran, because the database
stamps them. Only the check-ins are backdated.

### Remove the demo records

Run `npx supabase db reset`. The e2e specs expect the plain seed, so always reset before you run
them.
