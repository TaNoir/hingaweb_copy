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
  Chip,
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
            <span className="flex flex-wrap justify-end gap-1 md:justify-start">
              {markersFor(r, now).map((m) => (
                <Chip key={m}>{t(`guidance.queue.markers.${m}`)}</Chip>
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
