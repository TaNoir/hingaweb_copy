// Fig 11 · private check-in (2.1.5.1.3, 2.1.5.1.4, 2.1.5.1.7, 2.1.6.2.7; D-08, D-09; N-01).
// Owner-only: the row is written with the student's own session and RLS. No score is ever shown.
// Ticking a crisis item opens /crisis at once (no server wait) and sends the event in the background.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Gauge,
  HandHeart,
  House,
  Lock,
  Shield,
  Smile,
} from 'lucide-react';
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
  Toast,
} from '../../components/ui/index.js';
import { cx } from '../../components/ui/cx.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { clearDraft, loadDraft, saveDraft } from './checkinDraft.js';
import { useCrisisItems } from './useCrisisItems.js';
import { PromptDialog } from './PromptDialog.jsx';
import { BreathCard } from './BreathCard.jsx';
import { reportCrisisItem, useCrisisReport } from '../crisis/crisisReport.js';
import { CrisisStatus } from '../crisis/CrisisStatus.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';

// One small icon per question card, a visual anchor only (aria-hidden; ui-students item 8).
const QUESTION_ICONS = {
  c1: BookOpen, // school work
  c2: House, // home and family
  c3: Compass, // future
  c4: HandHeart, // managing
  mood: Smile,
  stress: Gauge,
};

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
  const [noteFocused, setNoteFocused] = useState(false);
  const [direction, setDirection] = useState('next'); // slide direction for the step animation
  const stepHeading = useRef(null);
  const moved = useRef(false); // true after Back/Next, so focus moves only then (not on first load)
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
  // One question per screen (ui-interactive Part 2): steps 0-5 are the six questions in order,
  // step 6 is the optional note and Save. The step lives in the in-memory draft, so it survives a
  // trip to /crisis and back. Moving on is always manual (Next); nothing auto-advances.
  const LAST = CHECKIN_ITEMS.length; // the note + Save step
  const step = Math.min(Math.max(draft.step ?? 0, 0), LAST);
  const goTo = (to, dir) => {
    moved.current = true;
    setDirection(dir);
    update({ step: to });
  };
  useEffect(() => {
    if (!moved.current) return;
    // After Back/Next, move focus to the new step's heading so keyboard and screen reader users
    // start at the new question (no outline: data-route-focus).
    stepHeading.current?.focus();
  }, [step]);
  const complete = CHECKIN_ITEMS.every((i) => draft.answers[i.column] != null);
  // Only the six questions count (not the note, not the safety items). No other number is shown.
  const progress = t('checkin.progress', {
    answered: CHECKIN_ITEMS.filter((i) => draft.answers[i.column] != null).length,
  });

  // While there is an unsaved answer or note, closing or reloading the tab asks first (the
  // browser's own prompt, no custom text). In-app navigation, including ticking a safety item,
  // never unloads the page, so it never triggers this; the draft stays in page memory.
  const unsaved =
    !saved && (Object.values(draft.answers).some((v) => v != null) || draft.note !== '');
  useEffect(() => {
    if (!unsaved) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

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

  usePageTitle(saved ? t('checkin.saved.title') : t('checkin.title'));

  if (saved) return <SavedCard />;

  const item = step < LAST ? CHECKIN_ITEMS[step] : null;
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
        <StepDots step={step} answers={draft.answers} />
      </header>

      {/* Optional breathing exercise before the first question (Part 3). Skip moves focus on. */}
      {step === 0 && <BreathCard onSkip={() => stepHeading.current?.focus()} />}

      {/* The current step, keyed so it slides and fades in (reduced motion: no movement). */}
      <div
        key={step}
        className={direction === 'next' ? 'animate-step-in-next' : 'animate-step-in-back'}
      >
        {item ? (
          <Card className="max-sm:p-3">
            <p
              ref={stepHeading}
              tabIndex={-1}
              data-route-focus=""
              className="mb-3 text-[13px] font-semibold tracking-wide text-ink-muted"
            >
              {t('checkin.stepOf', { n: step + 1, total: CHECKIN_ITEMS.length })}
            </p>
            <ScaleButtons
              name={item.column}
              legend={`${step + 1}. ${t(item.textKey)}`}
              hint={item.hintKey ? t(item.hintKey) : ''}
              options={item.scale}
              value={draft.answers[item.column] ?? null}
              onChange={(v) => answer(item.column, v)}
              icon={QUESTION_ICONS[item.column]}
              markAnswered
            />
          </Card>
        ) : (
          <Card>
            <h2
              ref={stepHeading}
              tabIndex={-1}
              data-route-focus=""
              className="mb-4 text-[17px] font-semibold text-ink"
            >
              {t('checkin.note.title')}
            </h2>
            <Field id="checkin-note" label={t('checkin.note.label')} hint={t('checkin.note.hint')}>
              <Textarea
                value={draft.note}
                placeholder={t('checkin.note.placeholder')}
                onChange={(e) => update({ note: e.target.value })}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
              />
            </Field>
          </Card>
        )}
      </div>

      {/* The safety items stay on every step, exactly as before: ticking one opens /crisis at once. */}
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
      {step === LAST && !complete && (
        <p className="text-[14px] text-ink-muted">{t('checkin.required')}</p>
      )}
      {/* Below md the Back / count / Next (or Save) bar sticks to the bottom (under 80 px); the
          wrapper is display: contents there, so the bar's sticky area is the whole page column.
          Sticky (not fixed) keeps its own place after the last card. While the note has focus the
          bar stops sticking (the phone keyboard is open). From md up it is a normal row. */}
      <div className="max-md:contents md:flex md:items-center md:justify-between md:gap-3">
        <div
          className={cx(
            'checkin-savebar -mx-4 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 md:static md:mx-0 md:justify-start md:gap-4 md:border-t-0 md:bg-transparent md:p-0',
            noteFocused ? 'static' : 'sticky bottom-0 z-10',
          )}
        >
          {step > 0 ? (
            <Button
              variant="outline"
              size="lg"
              className="shrink-0"
              onClick={() => goTo(step - 1, 'back')}
              iconLeft={<ArrowLeft aria-hidden="true" className="size-5" />}
            >
              {t('checkin.back')}
            </Button>
          ) : null}
          {/* The one polite live region for the answered count. */}
          <p role="status" className="text-[14px] font-semibold text-ink">
            {progress}
          </p>
          {step < LAST ? (
            <Button
              size="lg"
              className="shrink-0"
              onClick={() => goTo(step + 1, 'next')}
              iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
            >
              {t('checkin.next')}
            </Button>
          ) : (
            <Button
              size="lg"
              className="shrink-0"
              onClick={onSave}
              disabled={!complete}
              loading={saving}
              iconLeft={<Check aria-hidden="true" className="size-5" />}
            >
              {t('checkin.save')}
            </Button>
          )}
        </div>
        <LinkButton to="/" variant="ghost" className="self-start">
          {t('checkin.cancel')}
        </LinkButton>
      </div>

      <PromptDialog open={prompt != null} busy={dismissing} onSend={onSend} onNotNow={onNotNow} />
    </div>
  );
}

/**
 * A row of dots, one per question (answered = filled, current = ringed), plus "Question n of 6".
 * No percentage. On the note step it shows the answered count instead. The dots are decorative.
 */
function StepDots({ step, answers }) {
  const total = CHECKIN_ITEMS.length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ol aria-hidden="true" className="flex items-center gap-1.5">
        {CHECKIN_ITEMS.map((it, i) => (
          <li
            key={it.column}
            className={cx(
              'size-2.5 rounded-full border transition-colors duration-200',
              answers[it.column] != null ? 'border-ink bg-ink' : 'border-ink-muted bg-transparent',
              i === step && 'ring-2 ring-blush-strong ring-offset-1',
            )}
          />
        ))}
      </ol>
      <p className="text-[14px] font-semibold text-ink">
        {step < total
          ? t('checkin.stepOf', { n: step + 1, total })
          : t('checkin.progress', {
              answered: CHECKIN_ITEMS.filter((i) => answers[i.column] != null).length,
            })}
      </p>
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
  // Once saved, focus moves to the heading so screen reader and keyboard users hear the result
  // (ui-students item 11). It is a heading, not a control, so it shows no outline (data-route-focus).
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <Card className="flex flex-col gap-4">
      <Toast message={t('common.toast.saved')} />
      <Chip className="self-start">
        <Check aria-hidden="true" className="size-4" />
        {t('checkin.saved.chip')}
      </Chip>
      <h1
        ref={heading}
        tabIndex={-1}
        data-route-focus=""
        className="text-[24px] font-semibold leading-8 text-ink"
      >
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
