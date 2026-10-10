// Fig 30 · reference data: the crisis item set (2.1.5.3.2, 2.1.5.1.3; Table 12; D-03; P09-D9..D11).
// Items are agreed with the guidance office and only published here. An item's text, protocol
// step, and version never change; it can only be retired (Phase 01 trigger), so past crisis
// events still show what the student selected.
import { useCallback, useEffect, useState } from 'react';
import { Info, Plus, ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Skeleton,
  Table,
  TextInput,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';

export function ReferencePage() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, status: 'loading', items: [] });
  const [adding, setAdding] = useState(false);
  const [retiring, setRetiring] = useState(null);
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('crisis_items')
      .select('id, label, protocol_ref, set_version, is_active')
      .order('is_active', { ascending: false })
      .order('label', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState({ attempt, status: error ? 'error' : 'ready', items: error ? [] : (data ?? []) });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const status = state.attempt === attempt ? state.status : 'loading';
  const activeCount = state.items.filter((i) => i.is_active).length;
  const done = () => {
    setAdding(false);
    setRetiring(null);
    setMessage(t('admin.reference.saved'));
    reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('admin.reference.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-muted">{t('admin.reference.lead')}</p>
      </header>

      <Card className="flex gap-4 border-l-4 border-l-ink">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-control bg-blush"
        >
          <ShieldCheck className="size-5 text-ink" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold text-ink">
            {t('admin.reference.codesignTitle')}
          </h2>
          <p className="mt-1 text-[15px] text-ink">{t('admin.reference.codesignBody')}</p>
        </div>
      </Card>

      <p role="status" className="font-semibold text-ink">
        {message}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {status === 'ready' ? (
          <Chip className="self-start">
            {t('admin.reference.count', {
              active: activeCount,
              retired: state.items.length - activeCount,
            })}
          </Chip>
        ) : (
          <span />
        )}
        <Button
          onClick={() => setAdding(true)}
          iconLeft={<Plus aria-hidden="true" className="size-4" />}
        >
          {t('admin.reference.add')}
        </Button>
      </div>

      {status === 'loading' && <Skeleton lines={4} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' &&
        (state.items.length === 0 ? (
          <EmptyState title={t('admin.reference.empty')} />
        ) : (
          <div className="[&_td]:[overflow-wrap:break-word] [&_th]:whitespace-nowrap">
            <Table
              caption={t('admin.reference.caption')}
              getRowKey={(i) => i.id}
              rows={state.items}
              columns={[
                {
                  key: 'text',
                  header: t('admin.reference.columns.text'),
                  render: (i) => (
                    <span
                      className={
                        i.is_active ? 'font-semibold text-ink' : 'text-ink-muted line-through'
                      }
                    >
                      {i.label}
                    </span>
                  ),
                },
                {
                  key: 'protocol',
                  header: t('admin.reference.columns.protocol'),
                  render: (i) => i.protocol_ref || t('admin.reference.none'),
                },
                {
                  key: 'version',
                  header: t('admin.reference.columns.version'),
                  render: (i) => i.set_version,
                },
                {
                  key: 'status',
                  header: t('admin.reference.columns.status'),
                  render: (i) =>
                    i.is_active ? t('admin.reference.active') : t('admin.reference.retired'),
                },
                {
                  key: 'actions',
                  header: t('admin.reference.columns.actions'),
                  render: (i) =>
                    i.is_active ? (
                      <Button
                        variant="ghost"
                        onClick={() => setRetiring(i)}
                        aria-label={t('admin.reference.retireLabel', { label: i.label })}
                      >
                        {t('admin.reference.retire')}
                      </Button>
                    ) : (
                      ''
                    ),
                },
              ]}
            />
          </div>
        ))}

      <p className="flex items-start gap-2 text-[14px] text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {t('admin.reference.footer')} {t('admin.reference.noScan')}
        </span>
      </p>

      {adding && <AddItemDialog onClose={() => setAdding(false)} onSaved={done} />}
      {retiring && (
        <RetireDialog item={retiring} onClose={() => setRetiring(null)} onSaved={done} />
      )}
    </div>
  );
}

function AddItemDialog({ onClose, onSaved }) {
  const [label, setLabel] = useState('');
  const [protocol, setProtocol] = useState('');
  const [version, setVersion] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.reference.addDialog.${x}`);
  const save = async () => {
    const next = {};
    if (label.trim().length < 2 || label.trim().length > 200) next.label = k('labelError');
    if (version.trim().length < 1 || version.trim().length > 20) next.version = k('versionError');
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase
      .from('crisis_items')
      .insert({
        label: label.trim(),
        protocol_ref: protocol.trim() || null,
        set_version: version.trim(),
      })
      .select('id')
      .single();
    setSaving(false);
    if (e || !data) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field id="item-label" label={k('label')} hint={k('labelHint')} error={errors.label}>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
        </Field>
        <Field id="item-protocol" label={k('protocol')} hint={k('protocolHint')}>
          <TextInput
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field
          id="item-version"
          label={k('version')}
          hint={k('versionHint')}
          error={errors.version}
        >
          <TextInput
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Checkbox
          id="item-confirm"
          label={k('confirm')}
          checked={confirmed}
          onChange={setConfirmed}
        />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} disabled={!confirmed} loading={saving}>
            {k('save')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RetireDialog({ item, onClose, onSaved }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const k = (x) => t(`admin.reference.retireDialog.${x}`, { label: item.label });
  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await supabase
      .from('crisis_items')
      .update({ is_active: false })
      .eq('id', item.id)
      .select('id, is_active')
      .single();
    setSaving(false);
    if (e || data?.is_active !== false) return setError(k('failed'));
    onSaved();
  };
  return (
    <Dialog open title={k('title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink">{k('body')}</p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={save} loading={saving}>
            {k('confirm')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {k('cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
