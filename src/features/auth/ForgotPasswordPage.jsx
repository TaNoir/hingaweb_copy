// Linked from Fig 9 ("Forgot password?"). Same reply whether or not the email exists.
import { useState } from 'react';
import { Link } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { Button, Field, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { emailOnlySchema } from './schemas.js';
import { useForm } from './useForm.js';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { focusFirstError } from '../../lib/focusFirstError.js';

export function ForgotPasswordPage() {
  const { bind, errors, validate } = useForm({ email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  usePageTitle(sent ? t('auth.forgot.sentTitle') : t('auth.forgot.title'));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(emailOnlySchema);
    if (!v) {
      focusFirstError(e.currentTarget);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    const key = error ? authErrorKey(error) : null;
    if (key === 'auth.errors.rateLimited') {
      setFormError(t(key));
      return;
    }
    setSent(true);
  };

  return (
    <AuthCard>
      {sent ? (
        <>
          <h1 className="text-[28px] font-semibold text-ink">{t('auth.forgot.sentTitle')}</h1>
          <p className="mt-3 text-base text-ink">{t('auth.forgot.sentBody')}</p>
        </>
      ) : (
        <>
          <h1 className="text-[28px] font-semibold text-ink">{t('auth.forgot.title')}</h1>
          <p className="mt-2 text-base text-ink-muted">{t('auth.forgot.lead')}</p>
          <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <FormMessage>{formError}</FormMessage>
            <Field
              id="email"
              label={t('auth.forgot.email')}
              error={errors.email && t(errors.email)}
            >
              <TextInput type="email" autoComplete="email" inputMode="email" {...bind('email')} />
            </Field>
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {t('auth.forgot.submit')}
            </Button>
          </form>
        </>
      )}
      <Link
        to="/login"
        className="mt-6 inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline"
      >
        {t('auth.forgot.backToLogin')}
      </Link>
    </AuthCard>
  );
}
