// Fig 13 · ranked resources (2.1.5.1.5, 2.1.6.1.5; Equation 2; D-07, D-20; P06-D5..D7).
// Ranking runs on the server (rank-resources). Relevance is shown by order alone: no number,
// no "match" wording. The student is never compared to other students.
import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  SegmentedControl,
  Skeleton,
} from '../../components/ui/index.js';
import { ResourceCard } from '../public/ResourceCard.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';

const FILTERS = [
  { value: 'all', label: () => t('resources.all') },
  ...CRITERIA.map((c) => ({ value: c.attribute, label: () => c.studentLabel })),
];

export function ResourcesPage() {
  const { session } = useAuth();
  const owner = session.user.id;
  const [filter, setFilter] = useState('all');
  usePageTitle(t('resources.title'));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    attempt: -1,
    status: 'loading',
    basis: null,
    resources: [],
  });

  useEffect(() => {
    let active = true;
    supabase.functions.invoke('rank-resources', { body: {} }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data || !Array.isArray(data.resources)) {
        setState({ attempt, status: 'error', basis: null, resources: [] });
      } else {
        setState({ attempt, status: 'ready', basis: data.basis, resources: data.resources });
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const status = state.attempt === attempt ? state.status : 'loading';

  // Owner-only record that this student opened a guide (Table 20). Fire and forget.
  const onOpen = (resource) => {
    supabase
      .from('resource_views')
      .insert({ student_id: owner, resource_id: resource.id })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) console.error('resource_views insert failed');
      });
  };

  const shown =
    filter === 'all' ? state.resources : state.resources.filter((r) => r.area === filter);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('resources.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('resources.title')}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">{t('resources.lead')}</p>
      </header>

      {status === 'loading' && (
        <div className="flex flex-col gap-3">
          <p className="sr-only">{t('common.loading')}</p>
          <Skeleton lines={5} />
        </div>
      )}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {status === 'ready' && state.basis === 'none' && (
        <EmptyState
          title={t('resources.noCheckin.title')}
          body={t('resources.noCheckin.body')}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/check-in">{t('resources.noCheckin.checkin')}</LinkButton>
              <LinkButton to="/guides" variant="outline">
                {t('resources.noCheckin.guides')}
              </LinkButton>
            </div>
          }
        />
      )}
      {status === 'ready' && state.basis !== 'none' && state.resources.length === 0 && (
        <EmptyState
          title={t('resources.emptyLibrary.title')}
          body={t('resources.emptyLibrary.body')}
        />
      )}
      {status === 'ready' && state.resources.length > 0 && (
        <>
          <SegmentedControl
            label={t('resources.filterLabel')}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label() }))}
            value={filter}
            onChange={setFilter}
          />
          {shown.length === 0 ? (
            <EmptyState
              title={t('resources.emptyFilter.title')}
              body={t('resources.emptyFilter.body')}
            />
          ) : (
            // Same grid as /guides: 1 column under 640px, 2 from 640px, 3 from 1024px, equal-height
            // cards. The list stays an ordered list (ranking order unchanged).
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((r) => (
                <li key={r.id} className="flex">
                  <ResourceCard resource={r} onOpen={onOpen} className="h-full w-full" />
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <MessageSquare aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-[17px] font-semibold text-ink">{t('resources.talk.title')}</h2>
            <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{t('resources.talk.body')}</p>
          </div>
        </div>
        <LinkButton to="/request" variant="outline" className="shrink-0">
          {t('resources.talk.action')}
        </LinkButton>
      </Card>
    </div>
  );
}
