// DEMO MODE ONLY (docs/demo.md). Adds fictional sample records to the LOCAL database, on top of
// supabase/seed.sql, so demos and screenshots look real. NEVER run against a hosted project.
// Usage: npx supabase db reset && node scripts/demo-seed.js
// Applies the SQL through `docker exec` into the local Supabase db container (psql), so it needs
// no extra npm packages. Scores and bands come from saw.js + scoring-config.js, never by hand.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.js';
import * as config from '../supabase/functions/_shared/scoring-config.js';
import { triage } from '../supabase/functions/_shared/saw.js';
import { OFFICE_TAGS } from '../src/config/vocabulary.js';

// ---- 1. Refuse anything that is not the local stack ----
const envPath = join(ROOT, '.env.local');
if (!existsSync(envPath))
  fail('.env.local not found; demo-seed only runs against the local stack.');
const urlLine = readFileSync(envPath, 'utf8').match(/^\s*VITE_SUPABASE_URL\s*=\s*["']?([^"'\s]+)/m);
let host = '';
try {
  host = new URL(urlLine?.[1] ?? '').hostname;
} catch {
  /* handled below */
}
if (host !== '127.0.0.1' && host !== 'localhost')
  fail(
    `VITE_SUPABASE_URL in .env.local is not local (host "${host || 'missing'}"). Refusing to run.`,
  );

const projectId = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8').match(
  /^project_id\s*=\s*"([^"]+)"/m,
)?.[1];
const container = `supabase_db_${projectId}`;

function fail(msg) {
  console.error(`demo-seed: ${msg}`);
  process.exit(1);
}

function psql(sql, extra = []) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
      ...extra,
    ],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] },
  );
}

// ---- 2. Only once per reset ----
const already = psql(
  "select count(*) from auth.users where email like 'demo.student%@example.test';",
  ['-t', '-A'],
).trim();
if (already !== '0')
  fail('demo records are already loaded. Run `npx supabase db reset` first, then run this again.');

// ---- 3. Helpers ----
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const daysAgo = (d, hhmm = '15:30') =>
  `(date_trunc('day', now() at time zone 'Asia/Manila') - interval '${d} days' + interval '${hhmm.split(':')[0]} hours ${hhmm.split(':')[1]} minutes') at time zone 'Asia/Manila'`;
const GUIDANCE_ID = '55555555-5555-4555-8555-555555555555';
const ANA_ID = '11111111-1111-4111-8111-111111111111';
const [TAG_1, TAG_2, TAG_3] = OFFICE_TAGS.map((t) => t.value);
const asGuidance = (body) =>
  [
    'begin;',
    'set local role authenticated;',
    `select set_config('request.jwt.claims', ${q(JSON.stringify({ sub: GUIDANCE_ID, role: 'authenticated', aal: 'aal2' }))}, true);`,
    body,
    'commit;',
  ].join('\n');

const sql = [];

// ---- 4. Ten fictional students ----
sql.push(`create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_meta jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('LocalOnly-Pass-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, p_meta, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;`);

// consent: 'both' = parental + assent; 'assent' = awaiting parental consent; 'withdrawn' = parental withdrawn
const STUDENTS = [
  ['Bea Santos', 12, 'STEM-A', 'Ms. Carla Reyes', 'both'],
  ['Carlo Mendoza', 11, 'ABM-A', 'Mr. Dennis Go', 'both'],
  ['Dana Flores', 12, 'HUMSS-B', 'Ms. Grace Ong', 'both'],
  ['Elijah Ramos', 11, 'STEM-B', 'Mr. Paul Chua', 'both'],
  ['Faith Navarro', 12, 'TVL-B', 'Ms. Irene Lao', 'both'],
  ['Gabriel Torres', 11, 'HUMSS-A', 'Ms. Joy Santos', 'both'],
  ['Hannah Cruz', 12, 'ABM-B', 'Mr. Leo Tan', 'both'],
  ['Ivan Castillo', 11, 'STEM-C', 'Ms. Mae Lim', 'assent'],
  ['Jasmine Aquino', 12, 'GAS-A', 'Mr. Noel Sy', 'assent'],
  ['Kevin Bautista', 11, 'TVL-A', 'Mr. Ben Lim', 'withdrawn'],
].map(([full_name, grade_level, section, class_adviser, consent], i) => ({
  id: randomUUID(),
  email: `demo.student${String(i + 1).padStart(2, '0')}@example.test`,
  meta: { account_type: 'student', full_name, grade_level, section, class_adviser },
  consent,
}));

for (const s of STUDENTS) {
  sql.push(`select pg_temp.seed_user(${q(s.id)}, ${q(s.email)}, ${j(s.meta)});`);
  if (s.consent !== 'assent')
    sql.push(
      `insert into public.consent_records (student_id, type, instrument_version) values (${q(s.id)}, 'parental', 'parental-v1');`,
    );
  sql.push(
    `insert into public.consent_records (student_id, type, instrument_version) values (${q(s.id)}, 'assent', 'assent-en-v1');`,
  );
  if (s.consent === 'withdrawn')
    sql.push(
      `update public.consent_records set status = 'withdrawn' where student_id = ${q(s.id)} and type = 'parental';`,
    );
}

// ---- 5. Check-ins (backdated: the stamp trigger is off only while these rows go in) ----
// Ana Reyes (student.full): 14 check-ins over the last 6 weeks, so My Trends has a real shape.
const ANA_CHECKINS = [
  // [days ago, c1, c2, c3, c4, mood, stress, note]
  [41, 2, 2, 1, 2, 4, 2, null],
  [38, 2, 3, 2, 2, 4, 3, null],
  [35, 3, 3, 2, 2, 3, 3, 'Quiz week. Tired but okay.'],
  [32, 3, 4, 2, 3, 3, 4, null],
  [29, 4, 4, 3, 3, 2, 4, 'Too many deadlines at once.'],
  [26, 3, 4, 3, 3, 2, 4, null],
  [22, 3, 3, 2, 3, 3, 3, null],
  [19, 2, 3, 2, 2, 3, 3, 'Talked to my sister, felt better.'],
  [15, 2, 2, 2, 2, 4, 2, null],
  [12, 3, 3, 3, 2, 3, 3, null],
  [9, 3, 4, 3, 3, 2, 4, null],
  [6, 2, 3, 2, 3, 3, 3, null],
  [3, 2, 2, 2, 2, 4, 2, 'Good week overall.'],
  [1, 3, 3, 2, 2, 3, 3, null],
];
const checkinRows = [];
const latest = {}; // student id -> { id, r }
const addCheckin = (studentId, [d, c1, c2, c3, c4, mood, stress, note], hhmm) => {
  const id = randomUUID();
  checkinRows.push(
    `(${q(id)}, ${q(studentId)}, ${c1}, ${c2}, ${c3}, ${c4}, ${mood}, ${stress}, ${q(note)}, ${daysAgo(d, hhmm)})`,
  );
  latest[studentId] = { id, r: { c1, c2, c3, c4 } };
};
ANA_CHECKINS.forEach((row, i) => addCheckin(ANA_ID, row, i % 2 ? '16:10' : '07:45'));

// One recent check-in for each student who will send a request. Ratings are picked so the
// queue shows every band; the bands themselves are computed below by saw.js.
const S = Object.fromEntries(STUDENTS.map((s) => [s.meta.full_name.split(' ')[0], s.id]));
addCheckin(S.Bea, [4, 4, 4, 3, 3, 2, 5, null], '12:15'); // expect P1
addCheckin(S.Carlo, [5, 3, 3, 2, 2, 3, 3, null], '10:05'); // expect P2
addCheckin(S.Dana, [3, 4, 4, 4, 3, 1, 4, null], '14:20'); // expect P1
addCheckin(S.Elijah, [6, 2, 1, 2, 1, 4, 2, null], '08:30'); // expect P3
addCheckin(S.Faith, [2, 2, 2, 3, 3, 3, 3, null], '13:40'); // expect For Review (gray zone)
addCheckin(S.Gabriel, [2, 3, 3, 2, 3, 3, 3, null], '09:50'); // expect P2

sql.push('alter table public.checkins disable trigger checkins_stamp;');
sql.push(
  `insert into public.checkins (id, student_id, c1, c2, c3, c4, mood, stress, note, created_at) values\n  ${checkinRows.join(',\n  ')};`,
);
sql.push('alter table public.checkins enable trigger checkins_stamp;');

// ---- 6. Support requests through create_support_request (scores from saw.js) ----
const REQUESTS = [
  {
    key: 'r1',
    student: ANA_ID,
    concern: 'academic',
    note: 'I keep falling behind in two subjects and I do not know where to start.',
  },
  {
    key: 'r2',
    student: S.Bea,
    concern: 'family',
    note: 'Things at home have been hard lately. Can I talk to someone this week?',
  },
  { key: 'r3', student: S.Carlo, concern: 'peer', note: null },
  {
    key: 'r4',
    student: S.Carlo,
    concern: 'academic',
    note: 'Also worried about my research group.',
  },
  {
    key: 'r5',
    student: S.Dana,
    concern: 'wellness',
    note: 'I have not been sleeping well and feel tired all the time.',
  },
  { key: 'r6', student: S.Elijah, concern: 'academic', note: null },
  {
    key: 'r7',
    student: S.Faith,
    concern: 'peer',
    note: 'Some classmates have been leaving me out.',
  },
  { key: 'r8', student: S.Gabriel, concern: 'wellness', note: null },
];
const bands = new Set();
sql.push('create temp table demo_req (key text primary key, id uuid);');
for (const r of REQUESTS) {
  const c = latest[r.student];
  const t = triage(c.r, config);
  bands.add(t.band);
  r.band = t.band;
  sql.push(
    `insert into demo_req select ${q(r.key)}, (public.create_support_request(${q(r.student)}, ${q(c.id)}, ${q(r.note)}, ${q(r.concern)}, ${t.score === null ? 'null' : t.score}, ${q(t.band)}, ${j(t.guardrails)}) ->> 'request_id')::uuid;`,
  );
}
for (const b of ['P1', 'P2', 'P3', 'FR'])
  if (!bands.has(b))
    fail(
      `the sample ratings no longer produce band ${b} with this scoring-config.js; adjust them.`,
    );

// ---- 7. Guidance actions as guidance.one (queue markers and audit trail) ----
const req = (key) => `(select id from demo_req where key = ${q(key)})`;
const open = (key) => `select public.open_support_request(${req(key)});`;
const status = (key, s) =>
  `update public.support_requests set status = ${q(s)} where id = ${req(key)};`;
const tag = (key, value) =>
  `insert into public.office_tags (request_id, tag) values (${req(key)}, ${q(value)});`;
sql.push('grant select on demo_req to authenticated;');
sql.push(asGuidance([open('r2'), tag('r2', TAG_3)].join('\n')));
sql.push(asGuidance(status('r2', 'referred')));
sql.push(asGuidance([open('r3'), status('r3', 'reviewed'), tag('r3', TAG_2)].join('\n')));
sql.push(asGuidance([open('r5'), tag('r5', TAG_2)].join('\n')));
sql.push(asGuidance(status('r5', 'reviewed')));
sql.push(asGuidance(status('r5', 'referred')));
sql.push(asGuidance([open('r6'), status('r6', 'reviewed'), tag('r6', TAG_1)].join('\n')));
sql.push(asGuidance(status('r6', 'resolved')));
// r7: reviewed, then a follow-up date that has already passed -> "Follow-up overdue"
sql.push(asGuidance([open('r7'), status('r7', 'reviewed'), tag('r7', TAG_2)].join('\n')));
sql.push(
  asGuidance(
    `update public.support_requests set follow_up_at = now() - interval '2 days' where id = ${req('r7')};`,
  ),
);
sql.push(asGuidance(open('r1')));
sql.push('drop table demo_req;');

// ---- 8. Crisis items: retire the placeholders, add three sample items ----
const PROTOCOL =
  'Notify the guidance associate on duty and follow the school crisis protocol (sample)';
const ITEMS = [
  [
    'ccccccc1-0000-4000-8000-000000000001',
    'I am being harmed or I do not feel safe at home (sample)',
  ],
  ['ccccccc1-0000-4000-8000-000000000002', 'I am thinking of hurting myself (sample)'],
  ['ccccccc1-0000-4000-8000-000000000003', 'I am thinking of ending my life (sample)'],
];
sql.push(
  "update public.crisis_items set is_active = false where label like '[[GUIDANCE:crisis_item_%' and is_active;",
);
sql.push(
  `insert into public.crisis_items (id, label, protocol_ref, set_version) values\n  ${ITEMS.map(([id, label]) => `(${q(id)}, ${q(label)}, ${q(PROTOCOL)}, 'demo-v1')`).join(',\n  ')};`,
);

// ---- 9. Two crisis events: one active, one acknowledged and resolved ----
sql.push(
  `insert into public.crisis_events (id, student_id, trigger_item_id) values ('ddddddd1-0000-4000-8000-000000000001', ${q(S.Hannah)}, ${q(ITEMS[0][0])});`,
);
sql.push(asGuidance("select public.log_crisis_view('ddddddd1-0000-4000-8000-000000000001');"));
sql.push(
  asGuidance("select public.acknowledge_crisis_event('ddddddd1-0000-4000-8000-000000000001');"),
);
sql.push(asGuidance("select public.resolve_crisis_event('ddddddd1-0000-4000-8000-000000000001');"));
sql.push(
  `insert into public.crisis_events (id, student_id, trigger_item_id) values ('ddddddd1-0000-4000-8000-000000000002', ${q(S.Dana)}, ${q(ITEMS[1][0])});`,
);

// ---- 10. Resources: real guide pages (YoungMinds, UK) for the demo library ----
// The four published seed resources and the seed draft keep their titles and areas; only their
// links change. "Sleep and routine" stays a draft (no verifier). The guidance office chooses the
// real library before the pilot (docs/demo.md).
const YM = 'https://www.youngminds.org.uk/young-person';
const SEED_LINKS = [
  ['bbbbbbb1-0000-4000-8000-000000000001', `${YM}/coping-with-life/exam-stress/`], // Managing exam pressure
  ['bbbbbbb1-0000-4000-8000-000000000002', `${YM}/coping-with-life/money-and-mental-health/`], // Talking to family about money worries
  ['bbbbbbb1-0000-4000-8000-000000000003', `${YM}/my-feelings/down-and-unable-to-cope/`], // When everything feels like too much
  ['bbbbbbb1-0000-4000-8000-000000000004', `${YM}/coping-with-life/looking-after-yourself-at-uni/`], // Thinking about life after senior high
  ['bbbbbbb1-0000-4000-8000-000000000005', `${YM}/my-feelings/sleep-problems/`], // Sleep and routine (draft)
];
for (const [id, url] of SEED_LINKS)
  sql.push(`update public.resources set url = ${q(url)} where id = ${q(id)};`);

// Added for the demo, all published. Each title matches its page; the highest value is the main area.
const RESOURCES = [
  [
    'Problems at school',
    `${YM}/coping-with-life/problems-at-school/`,
    { school_work: 5, home_family: 0, future: 1, managing: 2 },
  ],
  [
    'Family',
    `${YM}/coping-with-life/family/`,
    { school_work: 1, home_family: 5, future: 0, managing: 2 },
  ],
  [
    'Self-care',
    `${YM}/coping-with-life/self-care/`,
    { school_work: 1, home_family: 1, future: 0, managing: 5 },
  ],
  [
    'Believing in yourself',
    `${YM}/coping-with-life/self-esteem-and-believing-in-yourself/`,
    { school_work: 1, home_family: 0, future: 2, managing: 5 },
  ],
  [
    'Friendships',
    `${YM}/coping-with-life/friends/`,
    { school_work: 2, home_family: 0, future: 0, managing: 4 },
  ],
  [
    'Social media',
    `${YM}/coping-with-life/social-media-and-mental-health/`,
    { school_work: 1, home_family: 1, future: 0, managing: 4 },
  ],
  [
    'Young carers',
    `${YM}/coping-with-life/young-carers/`,
    { school_work: 2, home_family: 5, future: 1, managing: 3 },
  ],
];
sql.push(
  `insert into public.resources (title, url, attributes, verified_by) values\n  ${RESOURCES.map(
    ([title, url, a]) => `(${q(title)}, ${q(url)}, ${j(a)}, ${q(GUIDANCE_ID)})`,
  ).join(',\n  ')};`,
);

// ---- 11. Apply ----
psql(sql.join('\n\n') + '\n');
console.log(
  `demo-seed: added ${STUDENTS.length} students, ${checkinRows.length} check-ins (${ANA_CHECKINS.length} for student.full), ` +
    `${REQUESTS.length} support requests (bands ${[...bands].join(', ')}), 3 sample crisis items, 2 crisis events, ` +
    `${RESOURCES.length} published resources, and YoungMinds links on the ${SEED_LINKS.length} seed resources.`,
);
