// One small chart: one area over time (Fig 12; 2.1.5.1.4; D-08, D-09, D-25).
// Shows only what the student answered, on the answer scale. No trend line, average, forecast,
// or summary phrase. Single series: the title names it, so there is no legend.
// Ink line (2px) and markers (9px) with a surface ring; light grid; hover shows date and answer.
import { useId, useRef, useState } from 'react';
import { t } from '../../copy/index.js';
import { shortDate } from './chartDates.js';

const W = 320;
const H = 196;
const PAD = { left: 76, right: 14, top: 12, bottom: 30 };

/**
 * @param {{ title: string, levels: {value:number,label:string}[],
 *   points: {at: string, value: number}[] }} props  value 1..5 as the student tapped it
 */
export function TrendChart({ title, levels, points }) {
  const titleId = useId();
  const svg = useRef(null);
  const [hover, setHover] = useState(null);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const times = points.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (ms) => (t1 === t0 ? PAD.left + plotW / 2 : PAD.left + ((ms - t0) / (t1 - t0)) * plotW);
  const y = (v) => PAD.top + ((5 - v) / 4) * plotH;
  const xy = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }));
  const label = (v) => levels.find((l) => l.value === v)?.label ?? '';
  const ticks =
    xy.length <= 1
      ? xy
      : xy.length === 2
        ? [xy[0], xy[1]]
        : [xy[0], xy[Math.floor(xy.length / 2)], xy[xy.length - 1]];

  const summary =
    points.length === 1
      ? t('trends.chartSummaryOne', { name: title, date: shortDate(points[0].at) })
      : t('trends.chartSummary', {
          name: title,
          count: points.length,
          from: shortDate(points[0].at),
          to: shortDate(points[points.length - 1].at),
        });

  const onMove = (e) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0 || xy.length === 0) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = xy[0];
    for (const p of xy) if (Math.abs(p.cx - px) < Math.abs(best.cx - px)) best = p;
    setHover(best);
  };

  return (
    <figure className="flex flex-col gap-2 rounded-card border border-line bg-surface-muted p-4">
      <figcaption id={titleId} className="text-[15px] font-semibold text-ink">
        {title}
      </figcaption>
      <div className="relative">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-desc`}
          className="block h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <desc id={`${titleId}-desc`}>{summary}</desc>
          {levels.map((l) => (
            <g key={l.value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(l.value)}
                y2={y(l.value)}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(l.value)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--color-ink-muted)"
              >
                {l.label}
              </text>
            </g>
          ))}
          {ticks.map((p, i) => (
            <text
              key={`tick-${i}`}
              x={p.cx}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink-muted)"
            >
              {shortDate(p.at)}
            </text>
          ))}
          {hover && (
            <line
              x1={hover.cx}
              x2={hover.cx}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--color-ink-muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
          {xy.length > 1 && (
            <polyline
              points={xy.map((p) => `${p.cx},${p.cy}`).join(' ')}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {xy.map((p, i) => (
            <circle
              key={`pt-${i}`}
              data-testid="trend-point"
              cx={p.cx}
              cy={p.cy}
              r={hover === p ? 5.5 : 4}
              fill="var(--color-ink)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          ))}
        </svg>
        {hover && (
          <div
            aria-hidden="true"
            data-testid="trend-tooltip"
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-surface px-2 py-1 text-[13px] text-ink shadow"
            style={{ left: `${Math.min(80, Math.max(20, (hover.cx / W) * 100))}%` }}
          >
            {t('trends.tooltip', { date: shortDate(hover.at), answer: label(hover.value) })}
          </div>
        )}
      </div>
    </figure>
  );
}
