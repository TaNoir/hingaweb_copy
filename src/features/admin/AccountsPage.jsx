// Figs 27-28 · accounts and roles (2.1.5.3.1, 2.1.6.2.9; D-04; P09-D1..D5).
// Staff accounts only. Listing and creating go through the admin-accounts Edge Function;
// role and status changes are direct updates that RLS allows only for an administrator at aal2.
// The Phase 01 trigger blocks changing your own role or status and removing the last administrator.
import { useCallback, useEffect, useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { formatDateTime } from '../../lib/format.js';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { staffUpdateErrorKey } from './adminHelpers.js';

const ROLES = ['guidance', 'administrator'];

export function AccountsPage() {
  const { session } = useAuth();
  const me = session?.user?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', accounts: [], students: 0 });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { kind: 'role' | 'status', account }
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.functions.invoke('admin-accounts', { body: { action: 'list' } }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
    ]).then(([list, students]) => {
      if (!active) return;
      if (list.error || !Array.isArray(list.data?.accounts) || students.error) {
        setState({ attempt, status: 'error', accounts: [], students: 0 });
      } else {
        setState({
          attempt,
          status: 'ready',
          accounts: list.data.accounts,
          students: students.count ?? 0,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const accounts = state.accounts;
  const activeOf = (r) => accounts.filter((a) => a.role === r && a.is_active).length;
  const shown = accounts.filter(
    (a) =>
      (role === 'all' || a.role === role) &&
      a.display_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const done = (text) => {
    setEditing(null);
    setCreating(false);
    setMessage(text);
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
            {t('admin.accounts.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.accounts.lead')}</p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          iconLeft={<Plus aria-hidden="true" className="size-4" />}
        >
          {t('admin.accounts.create')}
        </Button>
      </header>

      <p role="status" className="font-semibold text-ink">
        {message}
      </p>

      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CountCard
              label={t('admin.accounts.counts.students')}
              value={state.students}
              note={t('admin.accounts.counts.studentsNote')}
            />
            <CountCard
              label={t('admin.accounts.counts.guidance')}
              value={activeOf('guidance')}
              note={t('admin.accounts.counts.guidanceNote')}
            />
            <CountCard
              label={t('admin.accounts.counts.admins')}
              value={activeOf('administrator')}
              note={t('admin.accounts.counts.adminsNote')}
            />
          </div>

          <Card className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <Field id="account-search" label={t('admin.accounts.search')}>
                <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
              </Field>
            </div>
            <SegmentedControl
              label={t('admin.accounts.roleFilter')}
              options={[
                { value: 'all', label: t('admin.accounts.all') },
                ...ROLES.map((r) => ({ value: r, label: t(`admin.accounts.roles.${r}`) })),
              ]}
              value={role}
              onChange={setRole}
            />
          </Card>

          {shown.length === 0 ? (
            <EmptyState title={t('admin.accounts.empty')} />
          ) : (
            <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
              <Table
                caption={t('admin.accounts.caption')}
                getRowKey={(a) => a.id}
                rows={shown}
                columns={[
                  {
                    key: 'name',
                    header: t('admin.accounts.columns.name'),
                    render: (a) => <span className="font-semibold text-ink">{a.display_name}</span>,
                  },
                  {
                    key: 'email',
                    header: t('admin.accounts.columns.email'),
                    render: (a) => a.email ?? '',
                  },
                  {
                    key: 'role',
                    header: t('admin.accounts.columns.role'),
                    render: (a) => t(`admin.accounts.roles.${a.role}`),
                  },
                  {
                    key: 'status',
                    header: t('admin.accounts.columns.status'),
                    render: (a) =>
                      a.is_active ? t('admin.accounts.active') : t('admin.accounts.inactive'),
                  },
                  {
                    key: 'last',
                    header: t('admin.accounts.columns.lastSignIn'),
                    render: (a) =>
                      a.last_sign_in_at
                        ? formatDateTime(a.last_sign_in_at)
                        : t('admin.accounts.never'),
                  },
                  {
                    key: 'actions',
                    header: t('admin.accounts.columns.actions'),
                    render: (a) =>
                      a.id === me ? (
                        <span className="text-ink-muted">{t('admin.accounts.you')}</span>
                      ) : (
                        <span className="flex flex-wrap justify-end gap-2 md:justify-start">
                          <Button
                            variant="ghost"
                            onClick={() => setEditing({ kind: 'role', account: a })}
                            aria-label={t('admin.accounts.changeRoleLabel', {
                              name: a.display_name,
                            })}
                          >
                            {t('admin.accounts.changeRole')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setEditing({ kind: 'status', account: a })}
                            aria-label={t(
                              a.is_active
                                ? 'admin.accounts.deactivateLabel'
                                : 'admin.accounts.reactivateLabel',
                              { name: a.display_name },
                            )}
                          >
                            {a.is_active
                              ? t('admin.accounts.deactivate')
                              : t('admin.accounts.reactivate')}
                          </Button>
                        </span>
                      ),
                  },
                ]}
              />
            </div>
          )}
          <p className="text-[14px] text-ink-muted">{t('admin.accounts.studentsNote')}</p>
        </>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          <Lock aria-hidden="true" className="size-4" />
          {t('admin.accounts.cannotTitle')}
        </h2>
        <ul className="list-disc pl-6 text-[15px] text-ink">
          <li>{t('admin.accounts.cannot1')}</li>
          <li>{t('admin.accounts.cannot2')}</li>
          <li>{t('admin.accounts.cannot3')}</li>
        </ul>
      </Card>

      <CreateStaffDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(email) => done(t('admin.accounts.createDialog.sent', { email }))}
      />
      {editing?.kind === 'role' && (
        <RoleDialog
          account={editing.account}
          onClose={() => setEditing(null)}
          onSaved={() => done(t('admin.accounts.saved'))}
        />
      )}
      {editing?.kind === 'status' && (
        <StatusDialog
          account={editing.account}
          onClose={() => setEditing(null)}
          onSaved={() => done(t('admin.accounts.saved'))}
        />
      )}
    </div>
  );
}

function CountCard({ label, value, note }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-[32px] font-semibold leading-10 text-ink">{value}</p>
      <p className="text-[13px] text-ink-muted">{note}</p>
    </Card>
  );
}

async function updateStaff(id, patch) {
  // .select().single() confirms the row really changed (00 must-never 16).
  return supabase
    .from('staff_accounts')
    .update(patch)
    .eq('id', id)
    .select('id, role, is_active')
    .single();
}

function RoleDialog({ account, onClose, onSaved }) {
  const [role, setRole] = useState(account.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await updateStaff(account.id, { role });
    setSaving(false);
    if (e || data?.role !== role) return setError(t(staffUpdateErrorKey(e)));
    onSaved();
  };
  return (
    <Dialog open title={t('admin.accounts.roleDialog.title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">
          {t('admin.accounts.roleDialog.lead', { name: account.display_name })}
        </p>
        <RolePicker value={role} onChange={setRole} />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} loading={saving} disabled={role === account.role}>
            {t('admin.accounts.roleDialog.save')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('admin.accounts.roleDialog.cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function StatusDialog({ account, onClose, onSaved }) {
  const deactivating = account.is_active;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await updateStaff(account.id, { is_active: !deactivating });
    setSaving(false);
    if (e || data?.is_active !== !deactivating) return setError(t(staffUpdateErrorKey(e)));
    onSaved();
  };
  const k = (x) => t(`admin.accounts.statusDialog.${x}`, { name: account.display_name });
  return (
    <Dialog
      open
      title={deactivating ? k('deactivateTitle') : k('reactivateTitle')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">
          {deactivating ? k('deactivateBody') : k('reactivateBody')}
        </p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} loading={saving}>
            {deactivating ? k('confirmDeactivate') : k('confirmReactivate')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RolePicker({ value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-semibold text-ink">
        {t('admin.accounts.createDialog.role')}
      </legend>
      {ROLES.map((r) => (
        <label key={r} className="flex cursor-pointer gap-3 rounded-control border border-line p-3">
          <input
            type="radio"
            name="staff-role"
            value={r}
            checked={value === r}
            onChange={() => onChange(r)}
            className="mt-1 size-5 shrink-0 accent-[var(--color-action)]"
          />
          <span>
            <span className="block font-semibold text-ink">
              {t(`admin.accounts.createDialog.${r}`)}
            </span>
            <span className="block text-[14px] text-ink-muted">
              {t(`admin.accounts.createDialog.${r}Body`)}
            </span>
          </span>
        </label>
      ))}
      <p className="text-[13px] text-ink-muted">{t('admin.accounts.createDialog.roleNote')}</p>
    </fieldset>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreateStaffDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const k = (x, v) => t(`admin.accounts.createDialog.${x}`, v);

  const close = () => {
    setName('');
    setEmail('');
    setRole('');
    setErrors({});
    setFormError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (name.trim().length < 2 || name.trim().length > 120) next.name = k('nameError');
    if (!EMAIL.test(email.trim())) next.email = k('emailError');
    if (!role) next.role = k('roleError');
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-accounts', {
      body: { action: 'create', email: email.trim(), display_name: name.trim(), role },
    });
    setSaving(false);
    if (error || !data?.id) {
      setFormError(error?.context?.status === 409 ? k('taken') : k('failed'));
      return;
    }
    const sentTo = email.trim();
    close();
    onCreated(sentTo);
  };

  return (
    <Dialog open={open} title={k('title')} onClose={close}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="staff-name" label={k('name')} error={errors.name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field id="staff-email" label={k('email')} error={errors.email}>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={k('emailPlaceholder')}
            autoComplete="off"
          />
        </Field>
        <RolePicker value={role} onChange={setRole} />
        {errors.role && (
          <p role="alert" className="text-[13px] font-semibold text-ink">
            {errors.role}
          </p>
        )}
        <div className="rounded-control bg-blush p-3 text-[14px] text-ink">
          <p className="font-semibold">{k('nextTitle')}</p>
          <p className="mt-1">{k('nextBody')}</p>
        </div>
        <FormMessage>{formError}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" loading={saving}>
            {k('submit')}
          </Button>
          <Button variant="outline" onClick={close}>
            {k('cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
