// 24/7 hotlines from the static directory (2.1.5.1.2, 2.1.6.4.6). No network needed.
import { Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { HOTLINES } from '../../content/directory.js';
import { buttonClasses } from '../../components/ui/index.js';

export function HotlineList({ lang = 'en' }) {
  return (
    <ul className="flex flex-col gap-3">
      {HOTLINES.map((h) => (
        <li
          key={h.id}
          className="flex flex-col gap-3 rounded-card border border-line bg-surface-muted p-4"
        >
          <div>
            <p className="font-semibold text-ink">{h.name}</p>
            <p className="text-[14px] text-ink-muted">{h.note}</p>
            <p className="mt-1 font-mono text-[15px] text-ink">{h.number}</p>
          </div>
          <a
            href={`tel:${h.dial}`}
            aria-label={t('public.hotlines.callLabel', { name: h.name, number: h.number }, lang)}
            className={buttonClasses('primary', 'md', 'max-w-full self-start text-left')}
          >
            <Phone aria-hidden="true" className="size-4" />
            <span>{t('public.hotlines.call', { number: h.number }, lang)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
