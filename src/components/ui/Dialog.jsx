import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { t } from '../../copy/index.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with a focus trap. Focus returns to the element that opened it.
 * dismissible=false hides the close button and ignores Escape (used for Fig 15 and Fig 22 only
 * when the phase file says so).
 */
export function Dialog({ open, onClose, title, children, dismissible = true }) {
  const titleId = useId();
  const panel = useRef(null);
  const opener = useRef(null);
  // Keep the latest onClose without re-running the focus effect on every render. If the effect
  // depended on onClose, a parent re-render (for example typing in a field inside the dialog)
  // would move focus back to the first control after each keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const first = panel.current?.querySelector(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener.current?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6 shadow-xl"
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-control"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
        <h2 id={titleId} className="pr-10 text-[20px] font-semibold leading-7 text-ink">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
