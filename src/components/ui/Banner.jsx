import { cx } from './cx.js';

/** tone 'attention' = dark border and ink, never a traffic-light colour (00 Section 10.4). */
export function Banner({ tone = 'info', title = '', icon = null, action = null, children, role }) {
  return (
    <div
      role={role}
      className={cx(
        'flex flex-col gap-3 rounded-card p-4 sm:flex-row sm:items-center',
        tone === 'attention' ? 'border-2 border-ink bg-surface' : 'border border-line bg-blush',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex-1">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className="text-[14px] text-ink">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
