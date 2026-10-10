export function Checkbox({ id, label, checked, onChange, disabled = false }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-5 shrink-0 accent-[var(--color-action)]"
      />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
