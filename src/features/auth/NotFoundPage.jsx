import { t } from '../../copy/index.js';
import { LinkButton } from '../../components/ui/index.js';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-[28px] font-semibold text-ink">{t('notFound.title')}</h1>
      <p className="text-base text-ink-muted">{t('notFound.body')}</p>
      <LinkButton to="/" variant="outline">
        {t('notFound.action')}
      </LinkButton>
    </div>
  );
}
