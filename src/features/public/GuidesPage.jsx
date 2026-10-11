// Tier 1 guide list (Fig 7 "Read something helpful"; 2.1.5.1.2). Unranked; no tracking.
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '../../components/ui/index.js';
import { ResourceCard } from './ResourceCard.jsx';
import { primaryArea } from './primaryArea.js';
import { usePublishedResources } from './usePublishedResources.js';
import { usePageTitle } from '../../lib/usePageTitle.js';

export function GuidesPage() {
  const { account } = useAuth();
  const { status, resources, reload } = usePublishedResources();
  const [area, setArea] = useState('all');
  usePageTitle(t('public.guides.title'));
  const options = [
    { value: 'all', label: t('public.guides.all') },
    ...CRITERIA.map((c) => ({ value: c.attribute, label: c.studentLabel })),
  ];
  const shown =
    area === 'all'
      ? resources
      : resources.filter((r) => primaryArea(r.attributes).attribute === area);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('public.guides.chip')}
        title={t('public.guides.title')}
        lead={t('public.guides.lead')}
      />
      {account.kind === 'student' && account.tier2 && (
        <p className="text-[14px] text-ink">
          {t('public.guides.matchedNote')}{' '}
          <Link to="/resources" className="font-semibold underline">
            {t('public.guides.matchedLink')}
          </Link>
        </p>
      )}
      {/* Full width so the filter bar lines up with the grid; the buttons wrap on phones. */}
      <SegmentedControl
        label={t('public.guides.filterLabel')}
        options={options}
        value={area}
        onChange={setArea}
        className="flex w-full"
      />
      {status === 'loading' && <Skeleton lines={5} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && resources.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={t('public.guides.emptyTitle')}
          body={t('public.guides.emptyBody')}
        />
      )}
      {status === 'ready' && resources.length > 0 && shown.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={t('public.guides.emptyFilterTitle')}
          body={t('public.guides.emptyFilterBody')}
        />
      )}
      {status === 'ready' && shown.length > 0 && (
        // 1 column under 640px, 2 from 640px, 3 from 1024px; every card in a row is the same height
        // ("Read guide" sits at the bottom of each card).
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <li key={r.id} className="flex">
              <ResourceCard resource={r} className="h-full w-full" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
