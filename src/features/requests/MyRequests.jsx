// User request 2026-10-11 ("My requests"): on the check-in page, a student sees how far along their
// own support requests are: Sent, Seen by the guidance office, Closed. Shown only when they have
// sent at least one. Nothing here is stored on the device; the office's status words, the note,
// and the follow-up date never reach this page (my_support_requests() returns only the stage).
import { Check } from 'lucide-react';
import { t } from '../../copy/index.js';
import { formatDate, shortRef } from '../../lib/format.js';
import { Button, Card, cx } from '../../components/ui/index.js';
import { useMyRequests } from './useMyRequests.js';

const STEPS = ['sent', 'seen', 'closed'];

export function MyRequests() {
  const { status, requests, reload } = useMyRequests();
  if (status === 'loading' || (status === 'ready' && requests.length === 0)) return null;
  return (
    <Card aria-labelledby="my-requests-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="my-requests-title" className="text-[17px] font-semibold text-ink">
          {t('request.mine.title')}
        </h2>
        <p className="text-[14px] text-ink-muted">{t('request.mine.lead')}</p>
      </div>
      {status === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-[14px] text-ink">
          <p>{t('request.mine.loadError')}</p>
          <Button variant="outline" onClick={reload}>
            {t('common.error.retry')}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <RequestProgress key={r.id} request={r} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RequestProgress({ request }) {
  const ref = shortRef(request.id);
  const current = Math.max(STEPS.indexOf(request.stage), 0);
  return (
    <li className="flex flex-col gap-3 rounded-control bg-canvas p-4">
      <p className="text-[14px] text-ink-muted">
        {ref} • {t('request.mine.sentOn', { date: formatDate(request.created_at) })}
      </p>
      <ol
        aria-label={t('request.mine.stepsLabel', { ref })}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0"
      >
        {STEPS.map((step, i) => {
          const reached = i <= current;
          return (
            <li
              key={step}
              aria-current={i === current ? 'step' : undefined}
              className={cx('flex items-center gap-2', i < STEPS.length - 1 && 'sm:flex-1')}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  reached ? 'border-ink bg-ink text-white' : 'border-ink-muted bg-surface',
                )}
              >
                {reached && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span
                className={cx(
                  'text-[14px] sm:whitespace-nowrap',
                  i === current
                    ? 'font-semibold text-ink'
                    : reached
                      ? 'text-ink'
                      : 'text-ink-muted',
                )}
              >
                {t(`request.mine.steps.${step}`)}{' '}
                <span className="sr-only">
                  {t(
                    i === current
                      ? 'request.mine.state.now'
                      : reached
                        ? 'request.mine.state.done'
                        : 'request.mine.state.later',
                  )}
                </span>
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cx(
                    'mx-3 hidden h-0.5 flex-1 sm:block',
                    i < current ? 'bg-ink' : 'bg-line',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-[15px] text-ink">{explain(request)}</p>
    </li>
  );
}

function explain({ stage, seen_at: seenAt, closed_at: closedAt }) {
  if (stage === 'closed')
    return closedAt
      ? t('request.mine.explain.closed', { date: formatDate(closedAt) })
      : t('request.mine.explain.closedNoDate');
  if (stage === 'seen')
    return seenAt
      ? t('request.mine.explain.seen', { date: formatDate(seenAt) })
      : t('request.mine.explain.seenNoDate');
  return t('request.mine.explain.sent');
}
