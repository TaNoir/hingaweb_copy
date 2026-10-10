// Target of the confirmation email link (emailRedirectTo). The link may or may not sign the user in.
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, LinkButton, Skeleton } from '../../components/ui/index.js';
import { AuthCard } from './AuthCard.jsx';

export function EmailConfirmedPage() {
  const navigate = useNavigate();
  const { status, session, account, aal } = useAuth();
  if (status === 'loading')
    return (
      <AuthCard>
        <Skeleton lines={2} />
      </AuthCard>
    );
  return (
    <AuthCard>
      <h1 className="text-[28px] font-semibold text-ink">{t('auth.confirmed.title')}</h1>
      {session ? (
        <>
          <p className="mt-3 text-base text-ink">{t('auth.confirmed.bodySignedIn')}</p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => navigate(homePathFor(account, aal), { replace: true })}
          >
            {t('auth.confirmed.continue')}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 text-base text-ink">{t('auth.confirmed.bodySignedOut')}</p>
          <LinkButton to="/login" size="lg" className="mt-6 w-full">
            {t('auth.confirmed.login')}
          </LinkButton>
        </>
      )}
    </AuthCard>
  );
}
