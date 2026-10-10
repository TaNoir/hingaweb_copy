import { useNavigate } from 'react-router';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { Button } from '../ui/Button.jsx';

/** Fig 22 (2.1.6.2.9). Rendered INSTEAD of the staff screen, so no student data stays on the page. */
export function SessionTimeoutOverlay() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="timeout-title"
        aria-describedby="timeout-body"
        className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-xl"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-card bg-blush"
        >
          <Lock className="size-6 text-ink" />
        </span>
        <h1 id="timeout-title" className="mt-4 text-[24px] font-semibold text-ink">
          {t('staff.timeout.title')}
        </h1>
        <p id="timeout-body" className="mt-2 text-[15px] text-ink-muted">
          {t('staff.timeout.body')}
        </p>
        <Button
          size="lg"
          className="mt-6 w-full"
          autoFocus
          iconLeft={<LogIn aria-hidden="true" className="size-5" />}
          onClick={() => {
            timeoutFlag.clear();
            navigate('/staff/login', { replace: true });
          }}
        >
          {t('staff.timeout.action')}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-muted">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('staff.timeout.note')}
        </p>
      </div>
    </div>
  );
}
