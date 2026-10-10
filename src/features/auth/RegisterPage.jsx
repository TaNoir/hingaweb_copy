// Fig 8 · requirement 2.1.5.1.1 · D-01 (section and adviser added) · D-22 (12 characters) · D-32
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import {
  Button,
  Chip,
  Field,
  PasswordInput,
  Select,
  TextInput,
} from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { registerSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { usePageTitle } from '../../lib/usePageTitle.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { bind, errors, validate } = useForm({
    fullName: '',
    email: '',
    gradeLevel: '',
    section: '',
    classAdviser: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(registerSchema);
    if (!v) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: {
          account_type: 'student',
          full_name: v.fullName,
          grade_level: Number(v.gradeLevel),
          section: v.section,
          class_adviser: v.classAdviser,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    if (data.session) {
      // Only when email confirmation is off (never in the pilot): go straight to the walkthrough.
      await refresh();
      navigate('/welcome', { replace: true });
      return;
    }
    // Same message whether or not the email was already registered (no account enumeration).
    setSentTo(v.email);
  };

  usePageTitle(sentTo ? t('auth.register.sentTitle') : t('auth.register.title'));

  if (sentTo) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.register.sentTitle')}</h1>
        <p className="mt-3 text-base text-ink">{t('auth.register.sentBody', { email: sentTo })}</p>
        <p className="mt-2 text-[14px] text-ink-muted">{t('auth.register.sentNote')}</p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-ink underline"
        >
          {t('auth.register.login')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      above={
        <div className="flex justify-end">
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('auth.register.backToLogin')}
          </Link>
        </div>
      }
      below={
        <p className="flex items-center justify-center gap-2 rounded-card bg-blush px-4 py-3 text-center text-[13px] text-ink">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t('auth.register.trust')}
        </p>
      }
    >
      <Chip tone="strong">{t('auth.register.step')}</Chip>
      <h1 className="mt-4 text-[28px] font-semibold leading-9 text-ink">
        {t('auth.register.title')}
      </h1>
      <p className="mt-2 text-base text-ink-muted">{t('auth.register.lead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field
          id="fullName"
          label={t('auth.register.fullName')}
          error={errors.fullName && t(errors.fullName)}
        >
          <TextInput
            autoComplete="name"
            placeholder={t('auth.register.fullNamePlaceholder')}
            {...bind('fullName')}
          />
        </Field>
        <Field id="email" label={t('auth.register.email')} error={errors.email && t(errors.email)}>
          <TextInput
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('auth.register.emailPlaceholder')}
            {...bind('email')}
          />
        </Field>
        <Field
          id="gradeLevel"
          label={t('auth.register.gradeLevel')}
          error={errors.gradeLevel && t(errors.gradeLevel)}
        >
          <Select
            placeholder={t('auth.register.gradePlaceholder')}
            options={[
              { value: '11', label: t('auth.register.grade11') },
              { value: '12', label: t('auth.register.grade12') },
            ]}
            {...bind('gradeLevel')}
          />
        </Field>
        <Field
          id="section"
          label={t('auth.register.section')}
          error={errors.section && t(errors.section)}
        >
          <TextInput autoComplete="off" {...bind('section')} />
        </Field>
        <Field
          id="classAdviser"
          label={t('auth.register.adviser')}
          hint={t('auth.register.adviserHint')}
          error={errors.classAdviser && t(errors.classAdviser)}
        >
          <TextInput autoComplete="off" {...bind('classAdviser')} />
        </Field>
        <Field
          id="password"
          label={t('auth.register.password')}
          hint={t('auth.register.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field
          id="confirmPassword"
          label={t('auth.register.confirmPassword')}
          error={errors.confirmPassword && t(errors.confirmPassword)}
        >
          <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {t('auth.register.submit')}
        </Button>
        <p className="text-center text-[14px] text-ink-muted">{t('auth.register.next')}</p>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-semibold underline">
          {t('auth.register.login')}
        </Link>
      </p>
    </AuthCard>
  );
}
