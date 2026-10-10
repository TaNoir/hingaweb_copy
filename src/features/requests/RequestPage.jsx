// Fig 16 + Fig 17 · ask the guidance office (2.1.5.1.6, 2.1.6.4.5, 2.1.6.4.7, 2.1.7.3;
// D-10, D-11, D-12, D-13, D-20, D-23; P07-D1..D8).
// The student sees exactly what will be shared, with the real values, before anything is sent.
// Sending goes through submit-support-request, which computes the triage decision on the server.
// The note lives only in this page's memory and survives a failed send.
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  CircleCheck,
  EyeOff,
  Eye,
  Lock,
  PauseCircle,
  RotateCw,
  ArrowRight,
  Info,
} from 'lucide-react';
import { t } from '../../copy/index.js';
import { SITE } from '../../config/site.js';
import { ANSWER_SCALE, CONCERN_TYPES, labelFor } from '../../config/vocabulary.js';
import { CHECKIN_ITEMS, tappedValue } from '../../config/checkin-items.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { formatDate } from '../../lib/format.js';
import { firstSchoolDayFor, formatSchoolDate, officeStatus } from '../../lib/time.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  ErrorState,
  Field,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { HotlineList } from '../public/HotlineList.jsx';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';
import { useRequestPreview } from './useRequestPreview.js';
import { usePageTitle } from '../../lib/usePageTitle.js';

const CRITERION_ITEMS = CHECKIN_ITEMS.slice(0, 4); // c1..c4: the only answers that are shared
export const SEND_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: null, error: { timeout: true } }), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function RequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, account } = useAuth();
  const owner = session.user.id;
  const preview = useRequestPreview(owner);
  const [concern, setConcern] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | sending | failed | stale | notAllowed
  usePageTitle(t('request.title'));
  const prompt = location.state?.promptCheckinId ? location.state : null;

  const now = new Date();
  const closedNow = officeStatus(now) === 'closed';
  const ready = preview.status === 'ready';
  const checkin = preview.checkin;
  const canSend = ready && concern !== '' && ack && phase !== 'sending' && phase !== 'notAllowed';

  const onSend = async () => {
    if (!canSend && phase !== 'failed') return;
    setPhase('sending');
    const body = {
      checkin_id: checkin?.id ?? null,
      concern_type: concern,
      note: note.trim() === '' ? null : note,
    };
    const { data, error } = await withTimeout(
      supabase.functions.invoke('submit-support-request', { body }),
      SEND_TIMEOUT_MS,
    );
    if (!error && data?.request_id) {
      if (prompt) {
        // The prompt led to a request (Table 19). Owner-only; never shown to staff.
        supabase
          .from('prompt_events')
          .insert({
            student_id: owner,
            checkin_id: prompt.promptCheckinId,
            type: prompt.promptType,
            outcome: 'request_sent',
          })
          .then(({ error: e }) => {
            if (e && import.meta.env.DEV) console.error('prompt_events insert failed');
          });
      }
      navigate('/request/sent', {
        replace: true,
        state: { requestId: data.request_id, createdAt: data.created_at },
      });
      return;
    }
    const status = error?.context?.status;
    if (status === 409) {
      setAck(false);
      preview.reload();
      setPhase('stale');
    } else if (status === 403) {
      setPhase('notAllowed');
    } else {
      setPhase('failed');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip tone="strong" className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('request.chip', { school: SITE.schoolName })}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('request.title')}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">{t('request.lead')}</p>
      </header>

      {phase === 'failed' && <FailureNotice onRetry={onSend} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card aria-labelledby="will-see" className="flex flex-col gap-3">
          <h2 id="will-see" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <Eye aria-hidden="true" className="size-5" />
            {t('request.will.title')}
          </h2>
          {preview.status === 'loading' && <Skeleton lines={6} />}
          {preview.status === 'error' && (
            <ErrorState body={t('request.loadError')} onRetry={preview.reload} />
          )}
          {ready && <WillSee account={account} checkin={checkin} />}
        </Card>
        <Card aria-labelledby="wont-see" className="flex flex-col gap-3 bg-surface-muted">
          <h2 id="wont-see" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <EyeOff aria-hidden="true" className="size-5" />
            {t('request.wont.title')}
          </h2>
          <ul className="flex flex-col gap-2 text-[15px] text-ink">
            <li className="flex gap-2">
              <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
              {t('request.wont.checkins')}
            </li>
            <li className="flex gap-2">
              <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
              {t('request.wont.trends')}
            </li>
          </ul>
          <p className="rounded-control bg-surface p-3 text-[14px] text-ink-muted">
            {t('request.wont.footer')}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-5">
        <Field id="concern" label={t('request.concern.label')} hint={t('request.concern.hint')}>
          <Select
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder={t('request.concern.placeholder')}
            options={CONCERN_TYPES}
            required
          />
        </Field>
        <Field id="request-note" label={t('request.note.label')} hint={t('request.note.hint')}>
          <Textarea
            value={note}
            placeholder={t('request.note.placeholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1 rounded-control bg-blush p-3 text-[14px] text-ink">
          <p className="flex gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('request.hours.general')}
              {closedNow && (
                <>
                  {' '}
                  {t('request.hours.closedNow', {
                    date: formatSchoolDate(firstSchoolDayFor(now)),
                  })}
                </>
              )}
            </span>
          </p>
        </div>

        {phase === 'stale' && <FormMessage>{t('request.stale')}</FormMessage>}
        {phase === 'notAllowed' && <FormMessage>{t('request.notAllowed')}</FormMessage>}

        <div className="rounded-control bg-surface-muted px-3">
          <Checkbox
            id="ack"
            label={checkin ? t('request.ack.withAnswers') : t('request.ack.withoutAnswers')}
            checked={ack}
            onChange={setAck}
            disabled={!ready}
          />
        </div>
        {!(concern && ack) && <p className="text-[14px] text-ink-muted">{t('request.toSend')}</p>}
        {phase === 'failed' && (
          <p className="text-[13px] text-ink-muted">{t('request.failure.kept')}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            size="lg"
            onClick={onSend}
            disabled={!canSend}
            loading={phase === 'sending'}
            iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
          >
            {phase === 'failed' ? t('request.failure.retry') : t('request.send')}
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('request.cancel')}
          </Button>
        </div>
      </Card>

      {phase === 'failed' && (
        <Card as="aside" aria-labelledby="urgent" className="flex flex-col gap-3 bg-surface-muted">
          <h2 id="urgent" className="text-[17px] font-semibold text-ink">
            {t('request.urgent.title')}
          </h2>
          <p className="text-[14px] text-ink-muted">{t('request.urgent.body')}</p>
          <HotlineList />
        </Card>
      )}
      <EmergencyNotice />
    </div>
  );
}

function WillSee({ account, checkin }) {
  const rows = [
    [t('request.will.name'), account.full_name],
    [t('request.will.grade'), t('request.will.gradeValue', { grade: account.grade_level })],
    [t('request.will.section'), account.section],
    [t('request.will.adviser'), account.class_adviser],
  ];
  return (
    <div className="flex flex-col gap-3 text-[15px] text-ink">
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-2">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
              {label}:
            </dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="flex items-center gap-2 text-ink-muted">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
          {checkin
            ? t('request.will.answers', { date: formatDate(checkin.created_at) })
            : t('request.will.noAnswers')}
        </p>
        {checkin && (
          <ul className="mt-2 flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-[14px]">
            {CRITERION_ITEMS.map((item) => (
              <li key={item.column}>
                {t(item.textKey)}{' '}
                <strong>{labelFor(ANSWER_SCALE, tappedValue(item, checkin[item.column]))}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="flex flex-col gap-2 text-ink-muted">
        {['request.will.concern', 'request.will.note', 'request.will.when'].map((k) => (
          <li key={k} className="flex items-center gap-2">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-ink" />
            {t(k)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FailureNotice({ onRetry }) {
  return (
    <section role="alert" className="overflow-hidden rounded-card border-2 border-ink bg-surface">
      <p className="bg-action px-4 py-2 text-[13px] font-semibold uppercase tracking-wide text-action-ink">
        {t('request.failure.strip')}
      </p>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <PauseCircle aria-hidden="true" className="size-6 shrink-0 text-ink" />
        <div className="flex-1">
          <p className="font-semibold text-ink">{t('request.failure.title')}</p>
          <p className="mt-1 text-[15px] text-ink">{t('request.failure.body')}</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            {t('request.failure.where', {
              location: SITE.officeLocation,
              hours: SITE.officeHoursText,
            })}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRetry}
          iconLeft={<RotateCw aria-hidden="true" className="size-4" />}
        >
          {t('request.failure.retry')}
        </Button>
      </div>
    </section>
  );
}
