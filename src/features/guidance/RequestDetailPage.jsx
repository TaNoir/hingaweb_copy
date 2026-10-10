// Fig 23 · one support request (2.1.3.6, 2.1.3.7, 2.1.5.2.1, 2.1.5.2.2, 2.1.5.2.4, 2.1.5.2.5,
// 2.1.5.2.7; D-02, D-15, D-16, D-17, D-29; P08-D7..D10).
// Opening calls open_support_request(), which writes the audit row BEFORE returning the note.
// Status and follow-up changes are audited by the database (Phase 01 trigger).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ChevronLeft, Lock, Quote, Tag, BookUser } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CONCERN_TYPES, WORKFLOW_STATES, labelFor } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDate, formatDateTime, shortRef } from '../../lib/format.js';
import { manilaDate } from '../../lib/time.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  SegmentedControl,
  Skeleton,
  TextInput,
  buttonClasses,
} from '../../components/ui/index.js';
import { BandBadge } from './BandBadge.jsx';
import { ComputationTable } from './ComputationTable.jsx';
import { OfficeTagBadge } from './OfficeTagBadge.jsx';
import { followUpTimestamp } from './guidanceHelpers.js';

export function RequestDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', request: null });
  const opened = useRef(null);

  useEffect(() => {
    // One audited open per visit, even when React runs effects twice in development.
    if (opened.current === id) return;
    opened.current = id;
    supabase.rpc('open_support_request', { p_request_id: id }).then(({ data, error }) => {
      if (error) setState({ status: error.code === 'P0002' ? 'notFound' : 'error', request: null });
      else setState({ status: 'ready', request: data });
    });
  }, [id]);

  const retry = () => {
    opened.current = null;
    setState({ status: 'loading', request: null });
    supabase.rpc('open_support_request', { p_request_id: id }).then(({ data, error }) => {
      opened.current = id;
      if (error) setState({ status: error.code === 'P0002' ? 'notFound' : 'error', request: null });
      else setState({ status: 'ready', request: data });
    });
  };

  const back = (
    <Link
      to="/staff/queue"
      className="inline-flex min-h-11 items-center gap-1 text-[15px] text-ink"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t('guidance.detail.back')}
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="sr-only">{t('common.loading')}</p>
        <Skeleton lines={8} />
      </div>
    );
  }
  if (state.status === 'notFound') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={t('guidance.detail.notFound')} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  const r = state.request;
  const d = r.disclosed;
  const update = (patch) => setState((s) => ({ ...s, request: { ...s.request, ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      {back}
      <Card className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex flex-wrap items-center gap-3 text-[24px] font-semibold leading-8 text-ink md:text-[28px]">
            <span>
              {d.full_name} •{' '}
              {t('guidance.gradeSection', { grade: d.grade_level, section: d.section })}
            </span>
            <BandBadge band={r.triage?.band ?? 'FR'} />
          </h1>
          <p className="text-[15px] text-ink-muted">
            {t('guidance.detail.submitted', {
              time: formatDateTime(r.created_at),
              ref: shortRef(r.id),
            })}
          </p>
        </div>
        <StatusControl request={r} onSaved={(status) => update({ status })} />
      </Card>

      <p className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 text-[15px] text-ink">
        <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t('guidance.detail.auditNotice', { time: formatDateTime(r.viewed_at) })}
      </p>
      {location.state?.message === 'tagSaved' && (
        <p role="status" className="font-semibold text-ink">
          {t('guidance.detail.officeTagSaved')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-ink">{t('guidance.detail.sentTitle')}</h2>
          <p className="text-[14px] text-ink-muted">
            {t('guidance.detail.concern')}:{' '}
            <span className="font-semibold text-ink">
              {labelFor(CONCERN_TYPES, r.concern_type)}
            </span>
          </p>
          <h3 className="text-[14px] font-semibold text-ink-muted">{t('guidance.detail.note')}</h3>
          {r.note ? (
            <blockquote className="flex gap-2 whitespace-pre-wrap rounded-card bg-canvas p-4 text-[15px] text-ink">
              <Quote aria-hidden="true" className="size-4 shrink-0" />
              <span>{r.note}</span>
            </blockquote>
          ) : (
            <p className="text-[15px] text-ink-muted">{t('guidance.detail.noNote')}</p>
          )}
          <p className="border-t border-line pt-3 text-[13px] text-ink-muted">
            {t('guidance.detail.noteFooter')}
          </p>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2">
            <h2 className="text-[17px] font-semibold text-ink">
              {t('guidance.detail.sharedTitle')}
            </h2>
            <p className="text-[15px] text-ink">
              {t('guidance.detail.adviser')}:{' '}
              <span className="font-semibold">{d.class_adviser}</span>
            </p>
            {r.has_other_open_request && (
              <p className="font-semibold text-ink">{t('guidance.detail.otherOpen')}</p>
            )}
          </Card>
          <Card className="flex flex-col gap-2 bg-surface-muted">
            <h2 className="text-[17px] font-semibold text-ink">
              {t('guidance.detail.notAvailableTitle')}
            </h2>
            <p className="text-[15px] text-ink">{t('guidance.detail.notAvailableBody')}</p>
            <p className="text-[13px] text-ink-muted">{t('guidance.detail.notAvailableFooter')}</p>
          </Card>
        </div>
      </div>

      <Card>
        <details open className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[17px] font-semibold text-ink">
            {t('guidance.detail.computedTitle')}
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-3">
            <ComputationTable disclosed={d} triage={r.triage} />
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FollowUp request={r} onSaved={(follow_up_at) => update({ follow_up_at })} />
        <Card className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-ink">
            {t('guidance.detail.officeTagTitle')}
          </h2>
          {r.office_tag ? (
            <div className="flex flex-col gap-1">
              <OfficeTagBadge tag={r.office_tag.tag} />
              <p className="text-[13px] text-ink-muted">
                {t('guidance.detail.officeTagBy', {
                  name: r.office_tag.assigned_by,
                  time: formatDateTime(r.office_tag.assigned_at),
                })}
              </p>
            </div>
          ) : (
            <p className="text-[15px] text-ink-muted">{t('guidance.detail.officeTagNone')}</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={`/staff/requests/${r.id}/tag`} className={buttonClasses('outline', 'md')}>
              <Tag aria-hidden="true" className="size-4" />
              {t('guidance.detail.assignTag')}
            </Link>
            <Link
              to={`/staff/referrals?request=${r.id}`}
              className={buttonClasses('outline', 'md')}
            >
              <BookUser aria-hidden="true" className="size-4" />
              {t('guidance.detail.directory')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusControl({ request, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const onChange = async (status) => {
    if (status === request.status || saving) return;
    setSaving(true);
    setMessage('');
    // .select().single() confirms the row really changed (00 must-never 16).
    const { data, error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', request.id)
      .select('id, status')
      .single();
    setSaving(false);
    if (error || data?.status !== status) {
      setMessage(t('guidance.detail.statusError'));
      return;
    }
    onSaved(status);
    setMessage(t('guidance.detail.statusSaved'));
  };
  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span aria-hidden="true" className="text-[14px] text-ink-muted">
          {t('guidance.detail.statusLabel')}
        </span>
        <SegmentedControl
          label={t('guidance.detail.statusLabel')}
          options={WORKFLOW_STATES}
          value={request.status}
          onChange={onChange}
        />
      </div>
      <p role="status" className="text-[14px] font-semibold text-ink">
        {message}
      </p>
      <p className="max-w-md text-[13px] text-ink-muted lg:text-right">
        {t('guidance.detail.referralHint')}
      </p>
    </div>
  );
}

function FollowUp({ request, onSaved }) {
  const current = request.follow_up_at ? manilaDate(request.follow_up_at) : '';
  const [date, setDate] = useState(current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const save = async (value) => {
    setSaving(true);
    setMessage('');
    const { data, error } = await supabase
      .from('support_requests')
      .update({ follow_up_at: value })
      .eq('id', request.id)
      .select('id, follow_up_at')
      .single();
    setSaving(false);
    if (error || !data) {
      setMessage(t('guidance.detail.followUpError'));
      return;
    }
    onSaved(data.follow_up_at);
    setMessage(value ? t('guidance.detail.followUpSaved') : t('guidance.detail.followUpCleared'));
    if (!value) setDate('');
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold text-ink">{t('guidance.detail.followUpTitle')}</h2>
      {current && (
        <p className="text-[14px] text-ink">
          {t('guidance.detail.followUpCurrent', { date: formatDate(request.follow_up_at) })}
        </p>
      )}
      <Field
        id="follow-up"
        label={t('guidance.detail.followUpLabel')}
        hint={t('guidance.detail.followUpHint')}
      >
        <TextInput
          type="date"
          value={date}
          min={manilaDate(new Date())}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => save(followUpTimestamp(date))}
          disabled={!date || saving}
          loading={saving}
        >
          {t('guidance.detail.followUpSave')}
        </Button>
        {current && (
          <Button variant="ghost" onClick={() => save(null)} disabled={saving}>
            {t('guidance.detail.followUpClear')}
          </Button>
        )}
      </div>
      <p role="status" className="text-[14px] font-semibold text-ink">
        {message}
      </p>
    </Card>
  );
}
