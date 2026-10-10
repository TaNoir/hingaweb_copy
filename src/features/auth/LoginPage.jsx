// Fig 9 · student log in. Staff accounts are refused here and pointed to the staff portal; a link
// to the staff sign-in is also always shown under the form (user request).
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, KeyRound, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Chip, Field, PasswordInput, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { loginSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { focusFirstError } from '../../lib/focusFirstError.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, signOut, setAuthBusy } = useAuth();
  const { bind, errors, validate } = useForm({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  usePageTitle(t('auth.login.title'));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const v = validate(loginSchema);
    if (!v) {
      focusFirstError(e.currentTarget);
      return;
    }
    setSubmitting(true);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (error) {
        setFormError({ key: authErrorKey(error) });
        return;
      }
      const { data: account, error: accError } = await supabase.rpc('my_account');
      if (accError) {
        await signOut();
        setFormError({ key: 'auth.errors.generic' });
        return;
      }
      if (account.kind === 'guidance' || account.kind === 'administrator') {
        await signOut();
        setFormError({ key: 'auth.errors.staffOnStudentPage', staffLink: true });
        return;
      }
      if (account.kind !== 'student') {
        await signOut();
        setFormError({ key: 'auth.errors.notStudent' });
        return;
      }
      const loaded = await refresh();
      navigate(location.state?.from ?? homePathFor(loaded.account, loaded.aal), { replace: true });
    } finally {
      setSubmitting(false);
      setAuthBusy(false);
    }
  };

  return (
    <AuthCard
      above={
        <div className="flex items-center justify-between">
          <Chip>
            <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
            {t('auth.login.chip')}
          </Chip>
          <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-[14px] text-ink">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('auth.login.backHome')}
          </Link>
        </div>
      }
      below={
        <Link
          to="/help"
          className="mx-auto inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
        >
          <Shield aria-hidden="true" className="size-4" />
          {t('auth.login.needHelp')}
        </Link>
      }
    >
      <h1 className="text-[28px] font-semibold leading-9 text-ink">{t('auth.login.title')}</h1>
      <p className="mt-2 text-base text-ink-muted">{t('auth.login.lead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>
          {formError && (
            <>
              {t(formError.key)}
              {formError.staffLink && (
                <>
                  {' '}
                  <Link to="/staff/login" className="font-semibold underline">
                    {t('auth.errors.staffPortalLink')}
                  </Link>
                </>
              )}
            </>
          )}
        </FormMessage>
        <Field id="email" label={t('auth.login.email')} error={errors.email && t(errors.email)}>
          <TextInput type="email" autoComplete="email" inputMode="email" {...bind('email')} />
        </Field>
        <Field
          id="password"
          label={t('auth.login.password')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="current-password" {...bind('password')} />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-[14px] text-ink underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t('auth.login.submit')}
        </Button>
      </form>
      <hr className="my-6 border-line" />
      <p className="text-center text-[15px] text-ink-muted">
        {t('auth.login.newHere')}{' '}
        <Link to="/register" className="font-semibold text-ink underline">
          {t('auth.login.create')}
        </Link>
      </p>
      {/* Staff who arrive here from the landing page's "Log in" can go straight to their own sign-in
          (user request). The staff portal and its second factor are unchanged. */}
      <Link
        to="/staff/login"
        className="mx-auto mt-2 flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold text-ink underline"
      >
        <KeyRound aria-hidden="true" className="size-4" />
        {t('staff.login.title')}
      </Link>
    </AuthCard>
  );
}
