// The breathing timer shared by the check-in "Take a breath" card and the landing page's Breathe
// section: breathe in 4 s, hold 4 s, breathe out 6 s, three times, then done. Page memory only.
import { useEffect, useState } from 'react';

export const PHASES = [
  { key: 'in', seconds: 4, scale: 1 },
  { key: 'hold', seconds: 4, scale: 1 },
  { key: 'out', seconds: 6, scale: 0.55 },
];
const CYCLES = 3;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * { phase, left, done, running, start, stop, reduced, scale, duration }
 * scale/duration drive a growing shape: small at rest, grows over the in-breath, stays for the hold,
 * shrinks over the out-breath (the transition length matches each phase). reduced: true when the
 * person prefers reduced motion (show the step text and the countdown instead of a moving shape).
 */
export function useBreathing() {
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

  const phase = run ? PHASES[run.phase] : null;
  return {
    phase,
    left: run?.left ?? 0,
    done,
    running: run != null,
    reduced,
    scale: phase ? phase.scale : 0.55,
    duration: phase && phase.key !== 'hold' ? phase.seconds : 0,
    start: () => {
      setDone(false);
      setRun({ cycle: 0, phase: 0, left: PHASES[0].seconds });
    },
    stop: () => setRun(null),
  };
}
