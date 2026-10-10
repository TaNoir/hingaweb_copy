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
