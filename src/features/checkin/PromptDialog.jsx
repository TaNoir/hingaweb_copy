// Fig 15 · student-mediated prompt (2.1.5.1.7; D-13; P05-D2, P05-D3).
// The two buttons have equal weight (same size, side by side). Not dismissible by Escape or a
// close button: the student answers with one of the two buttons.
import { Check, MessageCircleMore } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Button, Chip, Dialog } from '../../components/ui/index.js';

export function PromptDialog({ open, busy = false, onSend, onNotNow }) {
  return (
    <Dialog open={open} title={t('checkin.prompt.title')} dismissible={false}>
      <div className="flex flex-col gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-blush"
        >
          <MessageCircleMore className="size-6 text-ink" />
        </span>
        <Chip className="self-start">
          <Check aria-hidden="true" className="size-4" />
          {t('checkin.prompt.chip')}
        </Chip>
        <p className="text-base text-ink-muted">{t('checkin.prompt.body')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={onSend} disabled={busy}>
            {t('checkin.prompt.send')}
          </Button>
          <Button size="lg" variant="outline" onClick={onNotNow} loading={busy}>
            {t('checkin.prompt.notNow')}
          </Button>
        </div>
        <p className="text-center text-[13px] text-ink-muted">{t('checkin.prompt.footer')}</p>
      </div>
    </Dialog>
  );
}
