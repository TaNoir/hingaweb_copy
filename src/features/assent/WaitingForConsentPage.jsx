// Shown when the student has assented but Tier 2 is not open (2.1.6.2.3; D-27):
// parental consent not yet recorded, or withdrawn. Tier 1 stays open (Fig 29 caption).
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Card } from '../../components/ui/index.js';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';

export function WaitingForConsentPage() {
  const navigate = useNavigate();
  const { account, aal, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);

  const home = homePathFor(account, aal);
  if (home !== '/waiting-for-consent') return <Navigate to={home} replace />;

  const withdrawn = account.parental === 'withdrawn';
  const prefix = withdrawn ? 'waiting.withdrawn' : 'waiting.none';

  const checkAgain = async () => {
    setChecking(true);
    setStillWaiting(false);
    const loaded = await refresh();
    setChecking(false);
    const next = homePathFor(loaded.account, loaded.aal);
    if (next !== '/waiting-for-consent') navigate(next, { replace: true });
    else setStillWaiting(true);
  };

  const logOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <Card className="mx-auto flex max-w-[640px] flex-col gap-5">
      <h1 className="text-[24px] font-semibold leading-8 text-ink">{t(`${prefix}Title`)}</h1>
      <p className="text-base text-ink">{t(`${prefix}Body`)}</p>
      <p className="text-base text-ink">{t(`${prefix}Next`)}</p>

      <div>
        <p className="font-semibold text-ink">{t('waiting.meanwhile')}</p>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center font-semibold text-ink underline"
            >
              {t('waiting.readGuides')}
            </Link>
          </li>
          <li>
            <Link
              to="/help"
              className="inline-flex min-h-11 items-center font-semibold text-ink underline"
            >
              {t('waiting.getHelp')}
            </Link>
          </li>
        </ul>
      </div>

      <EmergencyNotice />

      <p role="status" aria-live="polite" className="text-[14px] text-ink">
        {stillWaiting ? t('waiting.stillWaiting') : ''}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!withdrawn && (
          <Button loading={checking} onClick={checkAgain}>
            {t('waiting.checkAgain')}
          </Button>
        )}
        <Button variant="outline" onClick={logOut}>
          {t('waiting.logOut')}
        </Button>
      </div>
    </Card>
  );
}
