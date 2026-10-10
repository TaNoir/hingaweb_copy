// Fig 32 · add or edit a resource and its attribute tags (2.1.5.3.3, 2.2.2.4; Table 16; D-07;
// P09-D12..D14). The four values are the resource vector used by rank-resources (Phase 06).
// Publishing means naming who verified it: verified_by is set and the database stamps verified_at.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Select,
  Skeleton,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { validAttributes } from './adminHelpers.js';

const LEVELS = [0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));
const EMPTY = {
  title: '',
  url: '',
  attributes: { school_work: 0, home_family: 0, future: 0, managing: 0 },
  verified_by: null,
};

export function ResourceEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const key = `${id ?? 'new'}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', staff: [] });
  const [form, setForm] = useState(EMPTY);
  const [publish, setPublish] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('staff_accounts')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name', { ascending: true }),
      isNew
        ? Promise.resolve({ data: EMPTY, error: null })
        : supabase
            .from('resources')
            .select('id, title, url, attributes, verified_by')
            .eq('id', id)
            .maybeSingle(),
    ]).then(([staff, res]) => {
      if (!active) return;
      if (staff.error || res.error) return setState({ key, status: 'error', staff: [] });
      if (!res.data) return setState({ key, status: 'notFound', staff: [] });
      setForm({ ...EMPTY, ...res.data, url: res.data.url ?? '' });
      setPublish(Boolean(res.data.verified_by));
      setConfirmed(Boolean(res.data.verified_by));
      setState({ key, status: 'ready', staff: staff.data ?? [] });
    });
    return () => {
      active = false;
    };
  }, [id, isNew, key]);

  const status = state.key === key ? state.status : 'loading';
  const k = (x, v) => t(`admin.resourceEdit.${x}`, v);
  const setAttr = (attr, value) =>
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [attr]: value } }));

  const save = async () => {
    const next = {};
    const title = form.title.trim();
    const url = form.url.trim();
    if (title.length < 2 || title.length > 160) next.title = k('titleError');
    if ((publish || url) && !/^https:\/\/\S+$/i.test(url)) next.url = k('urlError');
    if (!validAttributes(form.attributes)) next.attributes = k('attributesError');
    if (publish && !form.verified_by) next.verifiedBy = k('verifiedByError');
    if (publish && !confirmed) next.confirm = k('confirmError');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError('');
    const row = {
      title,
      url: url || null,
      attributes: form.attributes,
      verified_by: publish ? form.verified_by : null,
    };
    const q = isNew
      ? supabase.from('resources').insert(row)
      : supabase.from('resources').update(row).eq('id', id);
    const { data, error: e } = await q.select('id').single();
    setSaving(false);
    if (e || !data) return setError(k('failed'));
    navigate('/admin/resources', { replace: true });
  };

  const back = (
    <Link
      to="/admin/resources"
      className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {k('back')}
    </Link>
  );
  if (status === 'loading')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Skeleton lines={8} />
      </div>
    );
  if (status === 'error')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  if (status === 'notFound')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={k('notFound')} />
      </div>
    );

  const vector = CRITERIA.map((c) => form.attributes[c.attribute]).join(', ');
  return (
    <div className="mx-auto flex w-full max-w-[840px] flex-col gap-6">
      {back}
      <h1 className="text-[28px] font-semibold leading-9 text-ink">
        {isNew ? k('newTitle') : k('editTitle')}
      </h1>

      <Card className="flex flex-col gap-4">
        <Field id="res-title" label={k('title')} error={errors.title}>
          <TextInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field id="res-url" label={k('url')} hint={k('urlHint')} error={errors.url}>
          <TextInput
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{k('attributesTitle')}</h2>
          <p className="mt-1 text-[14px] text-ink-muted">{k('attributesLead')}</p>
        </div>
        {CRITERIA.map((c) => (
          <div
            key={c.attribute}
            className="flex flex-col gap-2 rounded-control bg-surface-muted p-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p id={`attr-${c.attribute}`} className="font-semibold text-ink">
                {c.studentLabel}
              </p>
              <p className="text-[13px] text-ink-muted">{k(`attributeHints.${c.attribute}`)}</p>
            </div>
            <SegmentedControl
              label={c.studentLabel}
              options={LEVELS}
              value={form.attributes[c.attribute]}
              onChange={(v) => setAttr(c.attribute, v)}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1 text-[13px] text-ink-muted sm:flex-row sm:justify-between">
          <span className="font-semibold text-ink">{k('vector', { values: vector })}</span>
          <span>{k('scale')}</span>
        </div>
        {errors.attributes && (
          <p role="alert" className="text-[13px] font-semibold text-ink">
            {errors.attributes}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[17px] font-semibold text-ink">{k('statusTitle')}</h2>
          <SegmentedControl
            label={k('statusLabel')}
            options={[
              { value: 'draft', label: k('draft') },
              { value: 'published', label: k('published') },
            ]}
            value={publish ? 'published' : 'draft'}
            onChange={(v) => setPublish(v === 'published')}
          />
        </div>
        {publish && (
          <>
            <Field id="res-verifier" label={k('verifiedBy')} error={errors.verifiedBy}>
              <Select
                value={form.verified_by ?? ''}
                placeholder={k('verifiedByPlaceholder')}
                options={state.staff.map((s) => ({ value: s.id, label: s.display_name }))}
                onChange={(e) => setForm((f) => ({ ...f, verified_by: e.target.value || null }))}
              />
            </Field>
            <Checkbox
              id="res-confirm"
              label={k('confirm')}
              checked={confirmed}
              onChange={setConfirmed}
            />
            {errors.confirm && (
              <p role="alert" className="text-[13px] font-semibold text-ink">
                {errors.confirm}
              </p>
            )}
          </>
        )}
        <p className="text-[13px] text-ink-muted">{k('publishNote')}</p>
      </Card>

      <FormMessage>{error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={save} loading={saving}>
            {k('save')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/resources')}>
            {k('cancel')}
          </Button>
        </div>
        {!isNew && (
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            {k('delete')}
          </Button>
        )}
      </div>
      <p className="flex items-start gap-2 rounded-control bg-blush p-3 text-[14px] text-ink">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {k('rankNote')}
      </p>

      {deleting && (
        <DeleteDialog
          id={id}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/admin/resources', { replace: true })}
        />
      )}
    </div>
  );
}

function DeleteDialog({ id, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.resourceEdit.${x}`);
  const remove = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase.from('resources').delete().eq('id', id).select('id');
    setSaving(false);
    if (e || !data?.length) return setError(k('deleteFailed'));
    onDeleted();
  };
  return (
    <Dialog open title={k('deleteTitle')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('deleteBody')}</p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={remove} loading={saving}>
            {k('deleteConfirm')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('deleteCancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
