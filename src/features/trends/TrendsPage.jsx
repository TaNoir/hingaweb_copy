// Fig 12 · mood and stress over time (2.1.5.1.4; D-08, D-09, D-25; P06-D1..D4).
// Owner-only. Each area is charted separately against its answer scale. Descriptive only:
// no computed value, average, trend phrase, forecast, or comparison (Fig 12 caption).
import { useState } from 'react';
import { useAuth } from '../../lib/auth/useAuth.js';
import { t } from '../../copy/index.js';
import { CRITERIA, MOOD_SCALE, STRESS_SCALE, ANSWER_SCALE } from '../../config/vocabulary.js';
import { itemFor, tappedValue } from '../../config/checkin-items.js';
import { formatDate } from '../../lib/format.js';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  SegmentedControl,
  Skeleton,
  Table,
} from '../../components/ui/index.js';
import { Lock, MessageCircleHeart } from 'lucide-react';
import { TrendChart } from './TrendChart.jsx';
import { useCheckinHistory } from './useCheckinHistory.js';
import { usePageTitle } from '../../lib/usePageTitle.js';

const RANGES = ['days30', 'months3', 'all'];

/** The six charts in screen order. Values are shown as the student tapped them (D-09). */
const SERIES = [
  { column: 'mood', name: () => t('trends.names.mood'), levels: MOOD_SCALE },
  { column: 'stress', name: () => t('trends.names.stress'), levels: STRESS_SCALE },
  ...CRITERIA.map((c) => ({ column: c.key, name: () => c.studentLabel, levels: ANSWER_SCALE })),
];

function shown(column, stored) {
  if (stored == null) return null;
  return tappedValue(itemFor(column), stored);
}

export function TrendsPage() {
  const { session } = useAuth();
  const [range, setRange] = useState('days30');
  const [table, setTable] = useState(false);
  usePageTitle(t('trends.title'));
  const history = useCheckinHistory(session.user.id, range);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Chip className="self-start">
            <Lock aria-hidden="true" className="size-4" />
            {t('trends.chip')}
          </Chip>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('trends.title')}
          </h1>
          <p className="max-w-xl text-base text-ink-muted">{t('trends.lead')}</p>
        </div>
        <div className="md:shrink-0">
          <SegmentedControl
            label={t('trends.rangeLabel')}
            options={RANGES.map((r) => ({ value: r, label: t(`trends.range.${r}`) }))}
            value={range}
            onChange={setRange}
          />
        </div>
      </header>

      <Body
        history={history}
        range={range}
        onAllTime={() => setRange('all')}
        table={table}
        onToggleTable={() => setTable((v) => !v)}
      />

      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <MessageCircleHeart aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-[17px] font-semibold text-ink">{t('trends.talk.title')}</h2>
            <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{t('trends.talk.body')}</p>
          </div>
        </div>
        <LinkButton to="/request" variant="outline" className="shrink-0">
          {t('trends.talk.action')}
        </LinkButton>
      </Card>
      <p className="text-center text-[13px] text-ink-muted">{t('trends.footer')}</p>
    </div>
  );
}

function Body({ history, range, onAllTime, table, onToggleTable }) {
  if (history.status === 'loading') {
    return (
      <Card>
        <p className="sr-only">{t('common.loading')}</p>
        <Skeleton lines={6} />
      </Card>
    );
  }
  if (history.status === 'error') return <ErrorState onRetry={history.reload} />;
  if (history.rows.length === 0) {
    return range === 'all' ? (
      <EmptyState
        title={t('trends.empty.title')}
        body={t('trends.empty.body')}
        action={<LinkButton to="/check-in">{t('trends.empty.action')}</LinkButton>}
      />
    ) : (
      <EmptyState
        title={t('trends.emptyRange.title')}
        body={t('trends.emptyRange.body')}
        action={
          <Button variant="outline" onClick={onAllTime}>
            {t('trends.emptyRange.action')}
          </Button>
        }
      />
    );
  }

  const rows = history.rows;
  return (
    <Card className="flex flex-col gap-5">
      <div className="border-b border-line pb-4">
        <h2 className="text-[19px] font-semibold text-ink">{t('trends.sectionTitle')}</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{t('trends.sectionLead')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SERIES.map((s) => (
          <TrendChart
            key={s.column}
            title={s.name()}
            levels={s.levels}
            points={rows
              .filter((r) => r[s.column] != null)
              .map((r) => ({ at: r.created_at, value: shown(s.column, r[s.column]) }))}
          />
        ))}
      </div>
      <Button variant="ghost" className="self-start" onClick={onToggleTable} aria-expanded={table}>
        {table ? t('trends.tableHide') : t('trends.tableShow')}
      </Button>
      {table && (
        <Table
          caption={t('trends.tableCaption')}
          getRowKey={(r) => r.created_at}
          rows={rows}
          columns={[
            {
              key: 'created_at',
              header: t('trends.tableDate'),
              render: (r) => formatDate(r.created_at),
            },
            ...SERIES.map((s) => ({
              key: s.column,
              header: s.name(),
              render: (r) => {
                const v = shown(s.column, r[s.column]);
                return v == null ? t('trends.noAnswer') : s.levels.find((l) => l.value === v).label;
              },
            })),
          ]}
        />
      )}
    </Card>
  );
}
