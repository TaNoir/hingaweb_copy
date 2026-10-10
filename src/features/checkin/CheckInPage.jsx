// Fig 11 · private check-in (2.1.5.1.3, 2.1.5.1.4, 2.1.5.1.7, 2.1.6.2.7; D-08, D-09; N-01).
// Owner-only: the row is written with the student's own session and RLS. No score is ever shown.
// Ticking a crisis item opens /crisis at once (no server wait) and sends the event in the background.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Lock, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CHECKIN_ITEMS, storedValue } from '../../config/checkin-items.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Field,
  LinkButton,
  ScaleButtons,
  Skeleton,
  Textarea,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { clearDraft, loadDraft, saveDraft } from './checkinDraft.js';
import { useCrisisItems } from './useCrisisItems.js';
import { PromptDialog } from './PromptDialog.jsx';
import { reportCrisisItem, useCrisisReport } from '../crisis/crisisReport.js';
import { CrisisStatus } from '../crisis/CrisisStatus.jsx';

export function CheckInPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const owner = session.user.id;
  const [draft, setDraft] = useState(() => loadDraft(owner));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState(null); // { checkinId, type } while Fig 15 is open
  const [dismissing, setDismissing] = useState(false);
  const [saved, setSaved] = useState(false);
  const crisisItems = useCrisisItems();
  const report = useCrisisReport(owner);

  const update = (patch) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      saveDraft(owner, next);
      return next;
    });
  };
  const answer = (column, value) => update({ answers: { ...draft.answers, [column]: value } });
  const complete = CHECKIN_ITEMS.every((i) => draft.answers[i.column] != null);

  const onTick = (itemId) => {
    if (draft.ticked.includes(itemId)) return;
    update({ ticked: [...draft.ticked, itemId] });
    reportCrisisItem(owner, itemId); // background; never awaited (2.1.6.1.6)
    navigate('/crisis');
  };

  const onSave = async () => {
    setError('');
    setSaving(true);
    const row = { student_id: owner, note: draft.note.trim() === '' ? null : draft.note };
    for (const item of CHECKIN_ITEMS)
      row[item.column] = storedValue(item, draft.answers[item.column]);
    const { data, error: insertError } = await supabase
      .from('checkins')
      .insert(row)
      .select('id')
      .single();
    if (insertError || !data) {
      setSaving(false);
      setError(t('checkin.saveError'));
      return;
    }
    // Saved. The prompt check runs on the server; only the prompt type comes back (N-01).
    clearDraft();
    setDraft(loadDraft(owner));
    const { data: result, error: fnError } = await supabase.functions.invoke('evaluate-checkin', {
      body: { checkin_id: data.id },
    });
    setSaving(false);
    if (!fnError && (result?.prompt === 'max_sev' || result?.prompt === 'gray_zone')) {
      setPrompt({ checkinId: data.id, type: result.prompt });
    } else {
      setSaved(true);
    }
  };

  const onSend = () => {
    navigate('/request', { state: { promptCheckinId: prompt.checkinId, promptType: prompt.type } });
  };

  const onNotNow = async () => {
    setDismissing(true);
    // Owner-only record of the student's own answer (Table 19). Never shown to staff.
    const { error: dismissError } = await supabase.from('prompt_events').insert({
      student_id: owner,
      checkin_id: prompt.checkinId,
      type: prompt.type,
      outcome: 'dismissed',
    });
    if (dismissError && import.meta.env.DEV) console.error('prompt_events insert failed');
    setDismissing(false);
    setPrompt(null);
    setSaved(true);
  };

  if (saved) return <SavedCard />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('checkin.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('checkin.title')}
        </h1>
        <p className="text-base text-ink-muted">{t('checkin.lead')}</p>
      </header>

      {CHECKIN_ITEMS.map((item, i) => (
        <Card key={item.column}>
          <ScaleButtons
            name={item.column}
            legend={`${i + 1}. ${t(item.textKey)}`}
            hint={item.hintKey ? t(item.hintKey) : ''}
            options={item.scale}
            value={draft.answers[item.column] ?? null}
            onChange={(v) => answer(item.column, v)}
          />
        </Card>
      ))}

      <Card>
        <h2 className="mb-4 text-[17px] font-semibold text-ink">{t('checkin.note.title')}</h2>
        <Field id="checkin-note" label={t('checkin.note.label')} hint={t('checkin.note.hint')}>
          <Textarea
            value={draft.note}
            placeholder={t('checkin.note.placeholder')}
            onChange={(e) => update({ note: e.target.value })}
          />
        </Field>
      </Card>

      <section
        aria-labelledby="safety-title"
        className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-5 md:p-6"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-control bg-blush"
          >
            <Shield className="size-5 text-ink" />
          </span>
          <h2 id="safety-title" className="text-[17px] font-semibold text-ink">
            {t('checkin.safety.title')}
          </h2>
        </div>
        <SafetyItems crisisItems={crisisItems} ticked={draft.ticked} onTick={onTick} />
        <p className="text-[14px] text-ink-muted">{t('checkin.safety.body')}</p>
        <CrisisStatus report={report} />
      </section>

      <FormMessage>{error}</FormMessage>
      {!complete && <p className="text-[14px] text-ink-muted">{t('checkin.required')}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="lg"
          onClick={onSave}
          disabled={!complete}
          loading={saving}
          iconLeft={<Check aria-hidden="true" className="size-5" />}
        >
          {t('checkin.save')}
        </Button>
        <LinkButton to="/" variant="ghost">
          {t('checkin.cancel')}
        </LinkButton>
      </div>

      <PromptDialog open={prompt != null} busy={dismissing} onSend={onSend} onNotNow={onNotNow} />
    </div>
  );
}

function SafetyItems({ crisisItems, ticked, onTick }) {
  if (crisisItems.status === 'loading') return <Skeleton lines={3} />;
  if (crisisItems.status === 'error') {
    return (
      <div role="alert" className="flex flex-col gap-2 text-[14px] text-ink">
        <p className="font-semibold">{t('checkin.safety.loadError')}</p>
        <p>
          {t('checkin.safety.loadErrorHelp')}{' '}
          <Link to="/help" className="font-semibold underline">
            {t('checkin.safety.helpLink')}
          </Link>
        </p>
        <Button variant="outline" className="self-start" onClick={crisisItems.reload}>
          {t('common.error.retry')}
        </Button>
      </div>
    );
  }
  if (crisisItems.items.length === 0) {
    return (
      <p className="text-[14px] text-ink">
        {t('checkin.safety.empty')}{' '}
        <Link to="/help" className="font-semibold underline">
          {t('checkin.safety.helpLink')}
        </Link>
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {crisisItems.items.map((item) => (
        <li key={item.id} className="rounded-control bg-canvas px-3">
          <Checkbox
            id={`crisis-${item.id}`}
            label={item.label}
            checked={ticked.includes(item.id)}
            disabled={ticked.includes(item.id)}
            onChange={(on) => on && onTick(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function SavedCard() {
  return (
    <Card className="flex flex-col gap-4">
      <Chip className="self-start">
        <Check aria-hidden="true" className="size-4" />
        {t('checkin.saved.chip')}
      </Chip>
      <h1 tabIndex={-1} className="text-[24px] font-semibold leading-8 text-ink">
        {t('checkin.saved.title')}
      </h1>
      <p role="status" className="text-base text-ink-muted">
        {t('checkin.saved.body')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton to="/trends">{t('checkin.saved.trends')}</LinkButton>
        <LinkButton to="/resources" variant="outline">
          {t('checkin.saved.resources')}
        </LinkButton>
        <LinkButton to="/request" variant="outline">
          {t('checkin.saved.request')}
        </LinkButton>
      </div>
      <LinkButton to="/" variant="ghost" className="self-start">
        {t('checkin.saved.home')}
      </LinkButton>
    </Card>
  );
}
