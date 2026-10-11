// "Take a breath" (ui-interactive Part 3): an optional breathing exercise above the first check-in
// question. Breathe in 4 s, hold 4 s, breathe out 6 s, three times, then a short closing line.
// It never blocks the check-in (Skip hides it for this visit; nothing is stored in the browser).
// Reduced motion: no growing circle, only the step text and a countdown.
import { useEffect, useState } from 'react';
import { Wind } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Button, Card } from '../../components/ui/index.js';

const PHASES = [
  { key: 'in', seconds: 4, scale: 1 },
  { key: 'hold', seconds: 4, scale: 1 },
  { key: 'out', seconds: 6, scale: 0.55 },
];
const CYCLES = 3;

let skippedThisVisit = false; // page memory only

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function BreathCard({ onSkip }) {
  const [hidden, setHidden] = useState(skippedThisVisit);
  const [run, setRun] = useState(null); // { cycle, phase, left } while running
  const [done, setDone] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!run) return undefined;
    // One tick per second: count down, then move to the next phase, cycle, or finish.
    const timer = setTimeout(() => {
      if (run.left > 1) setRun({ ...run, left: run.left - 1 });
      else if (run.phase + 1 < PHASES.length)
        setRun({ ...run, phase: run.phase + 1, left: PHASES[run.phase + 1].seconds });
      else if (run.cycle + 1 < CYCLES)
        setRun({ cycle: run.cycle + 1, phase: 0, left: PHASES[0].seconds });
      else {
        setRun(null);
        setDone(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [run]);

  if (hidden) return null;

  const phase = run ? PHASES[run.phase] : null;
  const start = () => {
    setDone(false);
    setRun({ cycle: 0, phase: 0, left: PHASES[0].seconds });
  };
  const stop = () => setRun(null);
  const skip = () => {
    skippedThisVisit = true;
    setRun(null);
    setHidden(true);
    onSkip?.();
  };

  // The circle: small at rest, grows over the 4 s in-breath, stays for the hold, shrinks over the
  // 6 s out-breath. The transition length matches each phase.
  const scale = phase ? phase.scale : 0.55;
  const duration = phase && phase.key !== 'hold' ? phase.seconds : 0;

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
              {run.left}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {run ? (
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
