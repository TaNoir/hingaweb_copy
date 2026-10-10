// First sign-in for invited staff (Fig 28 note): set a password, then enrol a TOTP authenticator.
// Staff arriving from the sign-in page (password already set) start at step 2.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import {
  Button,
  Chip,
  Field,
  PasswordInput,
  Skeleton,
  TextInput,
} from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalNotes } from './StaffPortalNotes.jsx';
import { newPasswordSchema, totpSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { completeStaffSignIn } from './completeStaffSignIn.js';

function PasswordStep({ onDone }) {
  const { bind, errors, validate } = useForm({ password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(newPasswordSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: v.password });
    setSubmitting(false);
    if (error && error.code !== 'same_password') {
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    onDone();
  };
  return (
    <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <FormMessage>{formError}</FormMessage>
      <Field
        id="password"
        label={t('staff.setup.password')}
        hint={t('staff.setup.passwordHint')}
        error={errors.password && t(errors.password)}
      >
        <PasswordInput autoComplete="new-password" {...bind('password')} />
      </Field>
      <Field
        id="confirmPassword"
        label={t('staff.setup.confirmPassword')}
        error={errors.confirmPassword && t(errors.confirmPassword)}
      >
        <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
      </Field>
      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {t('staff.setup.savePassword')}
      </Button>
    </form>
  );
}

function AuthenticatorStep() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { bind, errors, validate } = useForm({ code: '' });
  const [enrolment, setEnrolment] = useState(null); // { id, qr, secret }
  const [loadError, setLoadError] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) return active && setLoadError(true);
      if (list.totp.length > 0) return navigate('/staff/verify', { replace: true });
      // Remove half-finished enrolments so a fresh one can start.
      for (const f of list.all.filter(
        (x) => x.factor_type === 'totp' && x.status === 'unverified',
      )) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'HingaWeb',
        issuer: 'HingaWeb',
      });
      if (!active) return undefined;
      if (error) return setLoadError(true);
      setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      return undefined;
    })();
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
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.id,
      code: v.code,
    });
    if (error) {
      setSubmitting(false);
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    await completeStaffSignIn({ refresh, navigate });
  };

  if (loadError) return <FormMessage>{t('staff.errors.generic')}</FormMessage>;
  if (!enrolment)
    return (
      <div className="mt-6">
        <Skeleton lines={4} />
      </div>
    );
  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-[15px] text-ink">{t('staff.setup.scan')}</p>
      <img
        src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrolment.qr)}`}
        alt={t('staff.setup.qrAlt')}
        className="mx-auto size-48 rounded-control border border-line bg-white p-2"
      />
      <p className="text-[14px] text-ink-muted">{t('staff.setup.manual')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-control bg-surface-muted px-3 py-2 font-mono text-[14px]">
          {showKey ? enrolment.secret : '•'.repeat(16)}
        </code>
        <Button variant="ghost" onClick={() => setShowKey((s) => !s)}>
          {showKey ? t('staff.setup.hideKey') : t('staff.setup.showKey')}
        </Button>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field id="code" label={t('staff.setup.codeLabel')} error={errors.code && t(errors.code)}>
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
          {t('staff.setup.finish')}
        </Button>
      </form>
    </div>
  );
}

export function StaffSetupPage() {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.fromLogin ? 2 : 1);
  return (
    <AuthCard below={<StaffPortalNotes />}>
      <Chip tone="strong">{step === 1 ? t('staff.setup.step1') : t('staff.setup.step2')}</Chip>
      <h1 className="mt-4 text-[26px] font-semibold text-ink">{t('staff.setup.title')}</h1>
      {step === 1 ? <PasswordStep onDone={() => setStep(2)} /> : <AuthenticatorStep />}
    </AuthCard>
  );
}
