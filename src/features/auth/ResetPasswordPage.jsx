// Opened from the reset email. The link signs the user in (detectSessionInUrl); they set a new password.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Field, LinkButton, PasswordInput, Skeleton } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { newPasswordSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { usePageTitle } from '../../lib/usePageTitle.js';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { status, session, refresh } = useAuth();
  const { bind, errors, validate } = useForm({ password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  usePageTitle(
    status === 'loading'
      ? ''
      : !session
        ? t('auth.reset.invalidTitle')
        : done
          ? t('auth.reset.doneTitle')
          : t('auth.reset.title'),
  );

  if (status === 'loading')
    return (
      <AuthCard>
        <Skeleton lines={3} />
      </AuthCard>
    );

  if (!session) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.invalidTitle')}</h1>
        <p className="mt-3 text-base text-ink">{t('auth.reset.invalidBody')}</p>
        <LinkButton to="/forgot-password" className="mt-6">
          {t('auth.reset.invalidAction')}
        </LinkButton>
      </AuthCard>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(newPasswordSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: v.password });
    setSubmitting(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    setDone(true);
  };

  const onContinue = async () => {
    const loaded = await refresh();
    navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
  };

  if (done) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.doneTitle')}</h1>
        <Button size="lg" className="mt-6 w-full" onClick={onContinue}>
          {t('auth.reset.continue')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.title')}</h1>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field
          id="password"
          label={t('auth.reset.password')}
          hint={t('auth.reset.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field
          id="confirmPassword"
          label={t('auth.reset.confirmPassword')}
          error={errors.confirmPassword && t(errors.confirmPassword)}
        >
          <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
