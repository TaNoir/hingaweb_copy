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
