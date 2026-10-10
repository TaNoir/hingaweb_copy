// Fig 19 · requirement 2.1.6.2.9 · staff accounts are provisioned by the administrator.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Chip, Field, PasswordInput, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalHeading, StaffPortalNotes } from './StaffPortalNotes.jsx';
import { loginSchema } from './schemas.js';
import { useForm } from './useForm.js';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { refresh, signOut, setAuthBusy } = useAuth();
  const { bind, errors, validate } = useForm({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(loginSchema);
    if (!v) return;
    setSubmitting(true);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (error) {
        setFormError(t(authErrorKey(error, 'staff')));
        return;
      }
      const { data: account, error: accError } = await supabase.rpc('my_account');
      if (accError) {
        await signOut();
        setFormError(t('staff.errors.generic'));
        return;
      }
      if (account.kind !== 'guidance' && account.kind !== 'administrator') {
        await signOut();
        setFormError(t('staff.errors.notStaff'));
        return;
      }
      if (!account.is_active) {
        await signOut();
        setFormError(t('staff.errors.inactive'));
        return;
      }
      const loaded = await refresh();
      navigate(homePathFor(loaded.account, loaded.aal), {
        replace: true,
        state: { fromLogin: true },
      });
    } finally {
      setSubmitting(false);
      setAuthBusy(false);
    }
  };

  return (
    <AuthCard
      above={
        <>
          <StaffPortalHeading />
          <div className="flex justify-center">
            <Chip tone="ink">{t('staff.login.badge')}</Chip>
          </div>
        </>
      }
      below={<StaffPortalNotes />}
    >
      <h2 className="text-[22px] font-semibold text-ink">{t('staff.login.cardTitle')}</h2>
      <p className="mt-1 text-[15px] text-ink-muted">{t('staff.login.cardLead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field id="email" label={t('staff.login.email')} error={errors.email && t(errors.email)}>
          <TextInput type="email" autoComplete="username" inputMode="email" {...bind('email')} />
        </Field>
        <Field
          id="password"
          label={t('staff.login.password')}
          hint={t('staff.login.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="current-password" {...bind('password')} />
        </Field>
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="w-full"
          iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
        >
          {t('staff.login.submit')}
        </Button>
      </form>
      <hr className="my-6 border-line" />
      <p className="flex items-start gap-2 text-[14px] text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t('staff.login.provisioned')}
      </p>
    </AuthCard>
  );
}
