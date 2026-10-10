// 2.1.6.4.7 · shown only after the database has saved the request (the server answered with its
// id). Opened any other way, it sends the student back to /request.
import { Navigate, useLocation } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { formatDateTime, shortRef } from '../../lib/format.js';
import { firstSchoolDayFor, formatSchoolDate, officeStatus } from '../../lib/time.js';
import { Card, Chip, LinkButton } from '../../components/ui/index.js';
import { HotlineList } from '../public/HotlineList.jsx';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';

export function RequestSentPage() {
  const location = useLocation();
  const sent = location.state;
  usePageTitle(t('request.sent.title'));
  if (!sent?.requestId) return <Navigate to="/request" replace />;
  const closed = officeStatus(new Date(sent.createdAt)) === 'closed';
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <Chip className="self-start">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t('request.sent.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink">{t('request.sent.title')}</h1>
        <p role="status" className="text-base text-ink">
          {t('request.sent.body')}
        </p>
        {closed && (
          <p className="text-[15px] text-ink">
            {t('request.sent.closedNow', {
              date: formatSchoolDate(firstSchoolDayFor(sent.createdAt)),
            })}
          </p>
        )}
        <p className="text-[14px] text-ink-muted">
          {t('request.sent.reference', {
            ref: shortRef(sent.requestId),
            time: formatDateTime(sent.createdAt),
          })}
        </p>
        <p className="text-[14px] text-ink-muted">{t('request.sent.privacy')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/">{t('request.sent.home')}</LinkButton>
          <LinkButton to="/check-in" variant="outline">
            {t('request.sent.checkin')}
          </LinkButton>
        </div>
      </Card>
      <Card as="aside" aria-labelledby="urgent-sent" className="flex flex-col gap-3">
        <h2 id="urgent-sent" className="text-[17px] font-semibold text-ink">
          {t('request.urgent.title')}
        </h2>
        <HotlineList />
        <EmergencyNotice />
      </Card>
    </div>
  );
}
