// ui-interactive Part 3: the optional breathing card.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BreathCard } from './BreathCard.jsx';

afterEach(() => vi.useRealTimers());

// The card schedules one 1 s timer at a time (after each render), so advance second by second.
const tick = (seconds) => {
  for (let i = 0; i < seconds; i += 1) act(() => vi.advanceTimersByTime(1000));
};

describe('BreathCard', () => {
  it('runs in 4 s, hold 4 s, out 6 s, three times, then says it is done', () => {
    vi.useFakeTimers();
    render(<BreathCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Breathe in…');
    tick(4);
    expect(status).toHaveTextContent('Hold…');
    tick(4);
    expect(status).toHaveTextContent('Breathe out…');
    tick(6);
    expect(status).toHaveTextContent('Breathe in…'); // cycle 2
    tick(14 * 2); // cycles 2 and 3
    expect(status).toHaveTextContent('Nice. Ready when you are.');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('Stop ends it at once; Skip hides the card and calls onSkip', () => {
    vi.useFakeTimers();
    const onSkip = vi.fn();
    render(<BreathCard onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByRole('status')).toHaveTextContent('');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
