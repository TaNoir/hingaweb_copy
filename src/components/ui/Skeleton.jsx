import { t } from '../../copy/index.js';

export function Skeleton({ lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-pulse rounded bg-blush motion-reduce:animate-none"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
