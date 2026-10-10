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
