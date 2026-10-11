// "Take a breath" (ui-interactive Part 3): an optional breathing exercise above the first check-in
// question. Breathe in 4 s, hold 4 s, breathe out 6 s, three times, then a short closing line.
// It never blocks the check-in (Skip hides it for this visit; nothing is stored in the browser).
// Reduced motion: no growing circle, only the step text and a countdown.
import { useState } from 'react';
import { Wind } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Button, Card } from '../../components/ui/index.js';
import { useBreathing } from './useBreathing.js';

let skippedThisVisit = false; // page memory only

export function BreathCard({ onSkip }) {
  const [hidden, setHidden] = useState(skippedThisVisit);
  const { phase, left, done, running, reduced, scale, duration, start, stop } = useBreathing();

  if (hidden) return null;

  const skip = () => {
    skippedThisVisit = true;
    stop();
    setHidden(true);
    onSkip?.();
  };

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {!reduced && (
        <div
          aria-hidden="true"
          className="flex size-28 shrink-0 items-center justify-center self-center"
        >
          <div
            className="size-28 rounded-full bg-blush"
            style={{
              scale: String(scale),
              transition: `scale ${duration}s ease-in-out`,
            }}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          <Wind aria-hidden="true" className="size-5" />
          {t('checkin.breath.title')}
        </h2>
        <p className="min-h-6 text-base text-ink">
          {/* Only the step name is announced (not every second of the countdown). */}
          <span role="status">
            {phase ? t(`checkin.breath.${phase.key}`) : done ? t('checkin.breath.done') : ''}
          </span>
          {phase && reduced && (
            <span aria-hidden="true" className="ml-2 font-semibold tabular-nums">
              {left}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <Button variant="outline" onClick={stop}>
              {t('checkin.breath.stop')}
            </Button>
          ) : (
            <Button variant="outline" onClick={start}>
              {t('checkin.breath.start')}
            </Button>
          )}
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-11 items-center rounded-control px-2 text-[15px] font-semibold text-ink underline"
          >
            {t('checkin.breath.skip')}
          </button>
        </div>
      </div>
    </Card>
  );
}
