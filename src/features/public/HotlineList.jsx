// 24/7 hotlines from the static directory (2.1.5.1.2, 2.1.6.4.6). No network needed.
import { Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { HOTLINES } from '../../content/directory.js';
import { buttonClasses } from '../../components/ui/index.js';

/**
 * variant: 'primary' (default; request pages) or 'outline' (landing page card and Where to get help).
 * The number is shown once, inside the Call button (it wraps to two lines on narrow screens).
 */
export function HotlineList({ lang = 'en', variant = 'primary' }) {
  const callVariant = variant === 'outline' ? 'outline' : 'primary';
  return (
    <ul className="flex flex-col gap-3">
      {HOTLINES.map((h) => (
        <li
          key={h.id}
          className="card-hover flex flex-col gap-3 rounded-card border border-line bg-surface-muted p-4"
        >
          <div>
            <p className="font-semibold text-ink">{h.name}</p>
            <p className="text-[14px] text-ink-muted">{h.note}</p>
          </div>
          <a
            href={`tel:${h.dial}`}
            aria-label={t('public.hotlines.callLabel', { name: h.name, number: h.number }, lang)}
            className={buttonClasses(
              callVariant,
              'md',
              'max-w-full self-start py-2 text-left leading-snug',
            )}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            <span>{t('public.hotlines.call', { number: h.number }, lang)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
