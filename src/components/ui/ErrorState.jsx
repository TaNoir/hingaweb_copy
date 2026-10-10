import { t } from '../../copy/index.js';
import { Button } from './Button.jsx';

export function ErrorState({
  title = t('common.error.title'),
  body = t('common.error.body'),
  onRetry = null,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-card border-2 border-ink bg-surface p-6"
    >
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      <p className="text-[15px] text-ink">{body}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t('common.error.retry')}
        </Button>
      )}
    </div>
  );
}
