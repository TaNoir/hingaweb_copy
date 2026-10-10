export function EmptyState({ title, body = '', action = null }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line bg-surface p-6">
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[15px] text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
