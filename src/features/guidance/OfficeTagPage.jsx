// Fig 25 · assign office tag (2.1.3.4, 2.1.5.2.5; Table 13; D-06, D-33).
// The three tags are offered with NONE selected. Nothing on this page reads the band, the score,
// or the ratings, so nothing can hint at a tag. Each save adds a row; earlier tags stay.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { OFFICE_TAGS } from '../../config/vocabulary.js';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime } from '../../lib/format.js';
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import './office-tag.css';

export function OfficeTagPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, status: 'loading', request: null, latest: null });
  const [choice, setChoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const key = `${id}|${attempt}`;

  useEffect(() => {
    let active = true;
    // Header facts come from the queue view (no note, no audit row); the latest tag from office_tags.
    Promise.all([
      supabase
        .from('support_queue')
        .select('id, full_name, grade_level, section')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('office_tags')
        .select('tag, assigned_at, staff_accounts(display_name)')
        .eq('request_id', id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([req, tag]) => {
      if (!active) return;
      if (req.error || tag.error) setState({ key, status: 'error', request: null, latest: null });
      else if (!req.data) setState({ key, status: 'notFound', request: null, latest: null });
      else setState({ key, status: 'ready', request: req.data, latest: tag.data });
    });
    return () => {
      active = false;
    };
  }, [id, key]);

  const status = state.key === key ? state.status : 'loading';
  const backTo = `/staff/requests/${id}`;

  const onSave = async () => {
    setSaving(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('office_tags')
      .insert({ request_id: id, tag: choice })
      .select('id')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(t('guidance.tag.saveError'));
      return;
    }
    navigate(backTo, { replace: true, state: { message: 'tagSaved' } });
  };

  const back = (
    <Link to={backTo} className="inline-flex min-h-11 items-center gap-1 text-[15px] text-ink">
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t('guidance.tag.back')}
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {back}
      {status === 'loading' && <Skeleton lines={6} />}
      {status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {status === 'notFound' && <EmptyState title={t('guidance.detail.notFound')} />}
      {status === 'ready' && (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold leading-8 text-ink">
                {t('guidance.tag.title')}
              </h1>
              <p className="mt-1 text-[15px] text-ink-muted">{t('guidance.tag.lead')}</p>
              <p className="mt-2 text-[15px] font-semibold text-ink">
                {state.request.full_name} •{' '}
                {t('guidance.gradeSection', {
                  grade: state.request.grade_level,
                  section: state.request.section,
                })}
              </p>
            </div>
            <Chip className="self-start uppercase">{t('guidance.tag.chip')}</Chip>
          </div>
          <p className="text-[14px] text-ink">
            {state.latest
              ? t('guidance.tag.current', {
                  tag:
                    OFFICE_TAGS.find((x) => x.value === state.latest.tag)?.label ??
                    state.latest.tag,
                  name: state.latest.staff_accounts?.display_name ?? '',
                  time: formatDateTime(state.latest.assigned_at),
                })
              : t('guidance.tag.none')}
          </p>
          <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
            <legend className="mb-2 text-[15px] font-semibold text-ink">
              {t('guidance.tag.legend')}
            </legend>
            {OFFICE_TAGS.map((o) => (
              <label
                key={o.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line px-4"
              >
                <input
                  type="radio"
                  name="office-tag"
                  value={o.value}
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                  className="size-5 accent-[var(--color-action)]"
                />
                <span aria-hidden="true" className="office-tag-dot" data-tag={o.value} />
                <span className="text-[15px] text-ink">{o.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-[13px] text-ink-muted">{t('guidance.tag.history')}</p>
          <FormMessage>{error}</FormMessage>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onSave} disabled={!choice} loading={saving}>
              {t('guidance.tag.save')}
            </Button>
            <Button variant="outline" onClick={() => navigate(backTo)}>
              {t('guidance.tag.cancel')}
            </Button>
          </div>
          <p className="flex items-center gap-2 border-t border-line pt-4 text-[13px] text-ink-muted">
            <Lock aria-hidden="true" className="size-4" />
            {t('guidance.tag.footer')}
          </p>
        </Card>
      )}
    </div>
  );
}
