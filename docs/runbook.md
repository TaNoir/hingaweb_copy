# HingaWeb pilot runbook

For the proponent who holds the administrator role (the custodian, 2.1.6.4.3), under the research
adviser's supervision. Every task here is manual unless it says "automatic".

## 1. Every day — keep-alive (automatic, 2.1.6.4.2)

- `.github/workflows/keep-alive.yml` runs once a day and reads one published resource id.
- GitHub → repository → Settings → Secrets and variables → Actions → add `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` (the same two values Vercel uses).
- If a run fails, GitHub emails the repository owner. Open the Supabase dashboard: if the project
  says **Paused**, press **Restore**, then re-run the workflow (Actions → Keep-alive → Run workflow).
  Write the date in `docs/questions.md` under "Pause events".
- **Monthly:** GitHub turns off scheduled workflows after 60 days with no repository activity.
  Open Actions → Keep-alive and make sure it is enabled and its last run is green.

## 2. Every week — encrypted backup (2.1.6.4.3)

Needs: Node 24, this repository, **Docker Desktop running** (`supabase db dump` runs `pg_dump` inside
a container, the same Docker you use for the local stack), and a folder that the **school** controls
(for example a synced school drive folder): `[[SCHOOL:backup_storage_location]]`.

1. Supabase → **Connect** → copy the **Session pooler** connection string (includes the database
   password). Never commit it, never paste it in chat.
2. Choose a passphrase of at least 16 characters. Keep it in the school's password store, not in a
   file next to the backups. Without it no backup can be read.
3. Run (one line, in a terminal):

   ```bash
   SUPABASE_DB_URL='<connection string>' BACKUP_PASSPHRASE='<passphrase>' npm run backup -- --out '<school folder>'
   ```

   On Windows PowerShell set the two values with `$env:SUPABASE_DB_URL='...'` and
   `$env:BACKUP_PASSPHRASE='...'`, then run `npm run backup -- --out '<school folder>'`.

4. Check the output: a file `hingaweb-YYYY-MM-DD.hwbak`, its sha256, and
   `data.sql has auth.users rows: yes`. If it says **NO**, the student accounts were not exported:
   stop and raise it in `docs/questions.md` before relying on the backups.
5. Write the date, file name, and sha256 in the backup log the adviser keeps.
6. Keep exports only as long as the pilot needs them (2.1.6.2.5):
   `[[SCHOOL:backup_retention_rule]]`. Delete older files from the school folder.

The plain SQL never touches your disk outside a private temporary folder, and that folder is
deleted when the script ends. Storage files are not included; HingaWeb stores no student files.

## 3. Once per term — restore test (2.1.6.4.3)

Never restore into the live project. Use a throw-away project.

1. Supabase → **New project** → name `hingaweb-restore-test`, same region. Copy its Session pooler
   connection string.
2. Decrypt the newest backup into an **empty** folder outside the repository:

   ```bash
   BACKUP_PASSPHRASE='<passphrase>' npm run backup -- --decrypt '<file.hwbak>' --out '<empty folder>'
   ```

3. Restore with `psql` (PostgreSQL client tools):

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname '<restore-test connection string>'
   ```

4. In the restore project's SQL editor compare counts with the live project:
   `select (select count(*) from public.students) as students, (select count(*) from public.support_requests) as requests, (select count(*) from public.staff_access_audit) as audit;`
   They must match the live counts taken at the backup time (small differences only from activity after it).
5. Record the result in the backup log. **Delete the restore-test project** and the decrypted folder.

## 4. Every month — availability report (2.1.6.4.1)

- Set up any external uptime monitor that checks every 5 minutes:
  - the site: `https://<your domain>/help`
  - the database: `https://<project>.supabase.co/rest/v1/resources?select=id&limit=1` with header
    `apikey: <publishable key>`
- Each month record the uptime % of both. Record outages caused by Vercel or Supabase separately
  (do not leave them out). Target: 99.0 % each, excluding announced maintenance.

## 5. Crisis text-message channel (Capstone 2, 2.1.6.1.6)

When the SMS gateway exists: `npx supabase secrets set SMS_GATEWAY_URL=... SMS_GATEWAY_TOKEN=... ONCALL_CONTACT_NUMBER=...`.
Test with a TEST student account on a preview deployment: tick a crisis item and confirm the on-duty
phone receives "HingaWeb: a crisis event was raised (Ref ...). Open the crisis channel now."

## 6. Scoring session (2.2.2.2–2.2.2.3)

1. Put each rater's 4×4 matrix in a JSON file shaped like `scripts/ahp.example.json` (keep it out of
   the repository if your ethics rules require).
2. `npm run ahp -- <file.json>`; re-elicit any rater whose CR is 0.10 or more.
3. Paste the printed `WEIGHTS` line into `supabase/functions/_shared/scoring-config.js`; set the
   agreed `THRESHOLDS`, `GRAY_ZONE_HALF_WIDTH`, guardrails, and `MAX_SEV_RULE`; set
   `PROVISIONAL = false`; update `SCORING_SOURCE`.
4. `npm run verify` (the manuscript's placeholder-number tests skip themselves once
   `PROVISIONAL` is false), then deploy the functions:
   `npx supabase functions deploy evaluate-checkin submit-support-request`.
   Requests saved earlier keep the rule set they were scored with (N-06).

## 7. Going live (production deployment)

Vercel runs `npm run build:vercel`. Preview deployments build normally. **Production runs
`build:pilot`**, which refuses to build until every placeholder is filled, `PROVISIONAL` is false,
`CHECKIN_ITEMS_STATUS` is `'final'`, and `ASSENT_COPY_STATUS` is `'final'`. See the Phase 10
pilot checklist.

## 8. End of the pilot (2.1.6.2.5)

Unless the school takes over the system:

1. Take a final backup only if the adviser asks for one for the study record.
2. Supabase → Project settings → **Delete project** (removes the database, auth users, and
   Supabase's own backups).
3. Delete every `.hwbak` file from the school folder, and the backup passphrase.
4. Vercel → project → Settings → **Delete project**. Remove the GitHub Actions secrets.
5. Record the dates in the study log. Data-protection questions go to the person the school names:
   `[[SCHOOL:data_protection_officer]]`.
