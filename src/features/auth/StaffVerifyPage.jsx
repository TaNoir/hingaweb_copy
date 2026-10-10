// Fig 20 · requirement 2.1.6.2.9 (TOTP second factor).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { SITE } from '../../config/site.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { Button, Chip, Field, Skeleton, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalHeading, StaffPortalNotes } from './StaffPortalNotes.jsx';
import { totpSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { completeStaffSignIn } from './completeStaffSignIn.js';

export function StaffVerifyPage() {
  const navigate = useNavigate();
  const { account, session, refresh, signOut } = useAuth();
  const { bind, errors, validate } = useForm({ code: '' });
  const [factorId, setFactorId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      const factor = !error ? data?.totp?.[0] : null; // data.totp holds verified TOTP factors only
      if (factor) setFactorId(factor.id);
      else navigate('/staff/setup', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(totpSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: v.code });
    if (error) {
      setSubmitting(false);
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    await completeStaffSignIn({ refresh, navigate });
  };

  const backToSignIn = async () => {
    await signOut();
    navigate('/staff/login', { replace: true });
  };

  return (
    <AuthCard above={<StaffPortalHeading />} below={<StaffPortalNotes />}>
      <Chip tone="ink">{t('staff.verify.badge')}</Chip>
      <h2 className="mt-4 text-[22px] font-semibold text-ink">{t('staff.verify.title')}</h2>
      <p className="mt-1 text-[15px] text-ink-muted">{t('staff.verify.lead')}</p>
      <p className="mt-4 flex flex-wrap items-center gap-2 rounded-control bg-blush px-4 py-3 text-[14px] text-ink">
        <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
        <span className="font-semibold">{account?.display_name}</span>
        <span className="font-mono text-[13px]">{session?.user?.email}</span>
      </p>
      {!factorId ? (
        <div className="mt-6">
          <Skeleton lines={2} />
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <FormMessage>{formError}</FormMessage>
          <Field
            id="code"
            label={t('staff.verify.codeLabel')}
            error={errors.code && t(errors.code)}
          >
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              className="text-center font-mono text-[24px] tracking-[0.5em]"
              {...bind('code')}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {t('staff.verify.submit')}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={backToSignIn}>
            {t('staff.verify.back')}
          </Button>
        </form>
      )}
      <hr className="my-6 border-line" />
      <p className="text-center text-[14px] text-ink-muted">
        {t('staff.verify.lost', { contact: SITE.staffSupportContact })}
      </p>
    </AuthCard>
  );
}
