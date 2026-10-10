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
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} disabled={!confirmed} loading={saving}>
            {k('save')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} disabled={!confirmed || !type} loading={saving}>
            {k('save')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
