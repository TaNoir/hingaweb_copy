// Fig 10 · layered assent walkthrough (2.1.5.1.1; 2.1.6.3.1; 2.1.6.3.6; D-26, D-31, D-32, P04-D1).
// Records the student's own assent in consent_records. Parental consent is recorded by the
// administrator (Phase 09). Tier 2 opens only when both exist (D-27).
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ArrowRight, ChevronDown, Lock, Send, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { LANGUAGES, assentInstrumentVersion } from '../../config/consent.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Card, Checkbox, Chip, SegmentedControl } from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';

const CARDS = [
  { icon: Lock, title: 'card1Title', body: 'card1Body', highlight: false },
  { icon: Send, title: 'card2Title', body: 'card2Body', highlight: false },
  { icon: Shield, title: 'card3Title', body: 'card3Body', highlight: true },
];

const DETAILS = [
  ['detailsSaved', 'detailsSavedBody'],
  ['detailsShared', 'detailsSharedBody'],
  ['detailsException', 'detailsExceptionBody'],
  ['detailsWho', 'detailsWhoBody'],
  ['detailsNot', 'detailsNotBody'],
  ['detailsParent', 'detailsParentBody'],
  ['detailsKept', 'detailsKeptBody'],
  ['detailsStop', 'detailsStopBody'],
];

export function AssentPage() {
  const navigate = useNavigate();
  const { account, aal, session, refresh } = useAuth();
  const [lang, setLang] = useState('en');
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const a = (key) => t(`assent.${key}`, {}, lang);

  // Already assented: this screen is not for them.
  if (account.assent === 'granted') return <Navigate to={homePathFor(account, aal)} replace />;

  const onContinue = async () => {
    setError('');
    setSaving(true);
    const { error: insertError } = await supabase.from('consent_records').insert({
      student_id: session.user.id,
      type: 'assent',
      instrument_version: assentInstrumentVersion(lang),
    });
    if (insertError) {
      setSaving(false);
      setError(a('saveError'));
      return;
    }
    const loaded = await refresh();
    navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
  };

  return (
    <Card className="mx-auto flex max-w-[720px] flex-col gap-6" lang={lang}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Chip tone="strong">
          <Shield aria-hidden="true" className="size-4" />
          {a('step')}
        </Chip>
        <SegmentedControl
          label={a('languageLabel')}
          options={LANGUAGES}
          value={lang}
          onChange={setLang}
        />
      </div>

      <div>
        <h1 className="text-[24px] font-semibold leading-8 text-ink">{a('title')}</h1>
        <p className="mt-2 text-base text-ink-muted">{a('lead')}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {CARDS.map(({ icon: Icon, title, body, highlight }) => (
          <li
            key={title}
            className={`flex gap-4 rounded-card p-4 ${highlight ? 'border border-line bg-canvas' : 'bg-surface-muted'}`}
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
            >
              <Icon className="size-5 text-ink" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">{a(title)}</h2>
              <p className="mt-1 text-[15px] text-ink">{a(body)}</p>
            </div>
          </li>
        ))}
      </ul>

      <details className="group rounded-card border border-line p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-ink">
          {a('detailsToggle')}
          <ChevronDown
            aria-hidden="true"
            className="size-5 transition-transform group-open:rotate-180"
          />
        </summary>
        <dl className="mt-3 flex flex-col gap-4">
          {DETAILS.map(([term, body]) => (
            <div key={term}>
              <dt className="font-semibold text-ink">{a(term)}</dt>
              <dd className="mt-1 text-[15px] text-ink">{a(body)}</dd>
            </div>
          ))}
        </dl>
      </details>

      <FormMessage>{error}</FormMessage>
      <Checkbox
        id="understood"
        label={a('understand')}
        checked={understood}
        onChange={setUnderstood}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="lg"
          disabled={!understood}
          loading={saving}
          onClick={onContinue}
          iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
        >
          {a('continue')}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
          {a('notNow')}
        </Button>
      </div>

      <p className="text-center text-[13px] text-ink-muted">{a('footer')}</p>
    </Card>
  );
}
