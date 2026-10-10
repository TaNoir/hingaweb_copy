// Tier 1 guide list (Fig 7 "Read something helpful"; 2.1.5.1.2). Unranked; no tracking.
import { useState } from 'react';
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

export function GuidesPage() {
  const { account } = useAuth();
  const { status, resources, reload } = usePublishedResources();
  const [area, setArea] = useState('all');
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
      <SegmentedControl
        label={t('public.guides.filterLabel')}
        options={options}
        value={area}
        onChange={setArea}
      />
      {status === 'loading' && <Skeleton lines={5} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && resources.length === 0 && (
        <EmptyState title={t('public.guides.emptyTitle')} body={t('public.guides.emptyBody')} />
      )}
      {status === 'ready' && resources.length > 0 && shown.length === 0 && (
        <EmptyState
          title={t('public.guides.emptyFilterTitle')}
          body={t('public.guides.emptyFilterBody')}
        />
      )}
      {status === 'ready' && shown.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <ResourceCard resource={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
