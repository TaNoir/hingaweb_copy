// Fig 7 right-hand card: hotlines on the landing page, visible without an account.
import { t } from '../../copy/index.js';
import { Card, Chip } from '../../components/ui/index.js';
import { HotlineList } from './HotlineList.jsx';
import { EmergencyNotice } from './EmergencyNotice.jsx';

export function NeedHelpCard() {
  return (
    <Card as="aside" aria-labelledby="need-help-title" className="flex flex-col gap-4">
      <Chip>{t('public.hotlines.cardChip')}</Chip>
      <h2 id="need-help-title" className="text-[20px] font-semibold text-ink">
        {t('public.hotlines.cardTitle')}
      </h2>
      <p className="text-[14px] text-ink-muted">{t('public.hotlines.cardLead')}</p>
      <HotlineList />
      <EmergencyNotice />
    </Card>
  );
}
