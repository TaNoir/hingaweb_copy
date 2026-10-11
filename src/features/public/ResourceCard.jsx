// One verified resource: area chip, title, and a link that opens the source in a new tab.
// Phase 06 reuses this card: it passes `area` (computed on the server, so no attribute vector
// reaches the browser, 2.1.6.1.5) and onOpen to record a resource view.
import { ArrowRight } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Card, Chip } from '../../components/ui/index.js';
import { cx } from '../../components/ui/cx.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { primaryArea } from './primaryArea.js';

export function ResourceCard({ resource, onOpen, className = '' }) {
  const area = resource.area
    ? { label: CRITERIA.find((c) => c.attribute === resource.area)?.studentLabel ?? '' }
    : primaryArea(resource.attributes);
  return (
    <Card as="article" className={cx('flex flex-col gap-3', className)}>
      <Chip className="self-start">{area.label}</Chip>
      <h3 className="text-[17px] font-semibold text-ink">{resource.title}</h3>
      <div className="mt-auto flex items-center justify-end gap-3 border-t border-line pt-3">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpen?.(resource)}
          className="inline-flex min-h-11 items-center gap-1 rounded-control font-semibold text-ink"
        >
          {t('public.guides.read')}
          <span className="sr-only">
            {' '}
            {resource.title} {t('public.guides.opensNewTab')}
          </span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </Card>
  );
}
