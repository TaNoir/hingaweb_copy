import { t } from '../../copy/index.js';

export function Skeleton({ lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-shimmer rounded bg-[linear-gradient(90deg,var(--color-blush)_0%,var(--color-blush-strong)_50%,var(--color-blush)_100%)] bg-[length:200%_100%] motion-reduce:animate-none"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
