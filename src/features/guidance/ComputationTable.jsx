// Fig 23 "How this priority was computed" (2.1.5.2.2; Table 10; N-06; P08-D7).
// Reads the stored score, band, and rule set (triage_decisions.guardrails) and the ratings in the
// disclosed copy. It recomputes nothing: SAW never runs in the browser (00 Section 5.3).
import { t } from '../../copy/index.js';
import { ANSWER_SCALE, CRITERIA, labelFor } from '../../config/vocabulary.js';
import { itemFor, tappedValue } from '../../config/checkin-items.js';
import { BandBadge } from './BandBadge.jsx';

export function ComputationTable({ disclosed, triage }) {
  const rule = triage?.guardrails ?? {};
  const noCheckin = disclosed?.c1 == null;
  if (noCheckin) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[15px] text-ink">{t('guidance.detail.computed.noCheckin')}</p>
        <p className="flex items-center gap-2 text-[14px] text-ink">
          {t('guidance.detail.computed.band')}: <BandBadge band={triage?.band ?? 'FR'} />
        </p>
        <p className="text-[13px] text-ink-muted">{t('guidance.detail.computed.retained')}</p>
      </div>
    );
  }
  const gray = rule.grayZoneHalfWidth;
  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-x-auto rounded-card border border-line"
        tabIndex={0}
        role="region"
        aria-label={t('guidance.detail.computed.caption')}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
          <caption className="sr-only">{t('guidance.detail.computed.caption')}</caption>
          <thead className="bg-canvas text-[13px] text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-2">
                {t('guidance.detail.computed.criterion')}
              </th>
              <th scope="col" className="px-4 py-2">
                {t('guidance.detail.computed.answer')}
              </th>
              <th scope="col" className="px-4 py-2 text-right">
                {t('guidance.detail.computed.rating')}
              </th>
              <th scope="col" className="px-4 py-2 text-right">
                {t('guidance.detail.computed.weight')}
              </th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c.key} className="border-t border-line">
                <th scope="row" className="px-4 py-2 font-normal text-ink">
                  {c.key.toUpperCase()} · {c.staffLabel}
                </th>
                <td className="px-4 py-2 text-ink">
                  {labelFor(ANSWER_SCALE, tappedValue(itemFor(c.key), disclosed[c.key]))}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-ink">{disclosed[c.key]}</td>
                <td className="px-4 py-2 text-right text-ink">{rule.weights?.[c.key] ?? ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas">
              <th scope="row" colSpan={3} className="px-4 py-2 text-right font-semibold text-ink">
                {t('guidance.detail.computed.score')}
              </th>
              <td className="px-4 py-2 text-right font-semibold text-ink">{triage?.score ?? ''}</td>
            </tr>
            <tr className="border-t border-line bg-canvas">
              <th scope="row" colSpan={3} className="px-4 py-2 text-right font-semibold text-ink">
                {t('guidance.detail.computed.band')}
              </th>
              <td className="px-4 py-2 text-right">
                <BandBadge band={triage?.band} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <ul className="flex flex-col gap-1 text-[13px] text-ink-muted">
        <li>{t('guidance.detail.computed.c4Note')}</li>
        {rule.thresholds && (
          <li>
            {t('guidance.detail.computed.thresholds', {
              p2: rule.thresholds.P2_MIN,
              p1: rule.thresholds.P1_MIN,
              gray,
            })}
          </li>
        )}
        {triage?.band === 'FR' && (
          <li className="font-semibold text-ink">
            {t('guidance.detail.computed.grayZone', { gray })}
          </li>
        )}
        {(rule.fired ?? []).map((f) => (
          <li key={f} className="text-ink">
            {t(`guidance.detail.computed.fired.${f}`)}
          </li>
        ))}
        {rule.provisional && <li>{t('guidance.detail.computed.provisional')}</li>}
        <li>{t('guidance.detail.computed.retained')}</li>
      </ul>
    </div>
  );
}
