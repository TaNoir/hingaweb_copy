// P1 / P2 / P3 / For Review badge (2.1.5.2.2; 00 Section 10.4): blush, blush-strong, and ink only.
// Never a traffic-light colour, never shown to a student.
import { BANDS, labelFor } from '../../config/vocabulary.js';
import { cx } from '../../components/ui/cx.js';

const STYLE = {
  P1: 'bg-action text-action-ink',
  P2: 'bg-blush-strong text-ink',
  P3: 'bg-blush text-ink',
  FR: 'border border-ink bg-surface text-ink',
};

export function BandBadge({ band }) {
  return (
    <span
      className={cx(
        'inline-flex min-w-9 items-center justify-center rounded-control px-2 py-1 text-[13px] font-semibold',
        STYLE[band] ?? STYLE.FR,
      )}
    >
      {labelFor(BANDS, band ?? 'FR')}
    </span>
  );
}
