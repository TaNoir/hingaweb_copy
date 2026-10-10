import { useEffect, useId, useRef, useState } from 'react';
import { CircleUser } from 'lucide-react';

/** Account button with a one-item menu (Log out / Sign out). */
export function AccountMenu({ label, itemLabel, onSelect }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full bg-action text-action-ink"
      >
        <CircleUser aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 min-w-40 rounded-control border border-line bg-surface p-1 shadow-lg"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-[15px] text-ink hover:bg-blush"
            >
              {itemLabel}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
