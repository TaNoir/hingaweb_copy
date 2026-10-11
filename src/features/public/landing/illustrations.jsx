// Simple inline illustrations for the landing page (ui-landing-v2), drawn in the design's style.
// Decorative only (aria-hidden, never focusable). Colours come from the theme tokens.
const C = {
  ink: 'var(--color-ink)',
  accent: 'var(--color-accent)',
  lavender: 'var(--color-lavender)',
  mint: 'var(--color-mint)',
  mintInk: 'var(--color-mint-ink)',
  peach: 'var(--color-peach)',
  butter: 'var(--color-butter)',
  line: 'var(--color-line)',
  white: 'var(--color-surface)',
  blushStrong: 'var(--color-blush-strong)',
};

const svgProps = { 'aria-hidden': true, focusable: 'false', role: 'presentation' };

/** "First": a checklist with a pencil. */
export function ChecklistArt({ className }) {
  return (
    <svg viewBox="0 0 240 160" className={className} {...svgProps}>
      <rect x="62" y="26" width="104" height="124" rx="12" fill={C.blushStrong} />
      <rect x="52" y="16" width="104" height="124" rx="12" fill={C.white} />
      {[34, 54, 74, 94, 114].map((y) => (
        <circle key={y} cx="52" cy={y} r="4" fill={C.blushStrong} />
      ))}
      {[40, 66].map((y) => (
        <g key={y}>
          <rect x="70" y={y} width="16" height="16" rx="4" fill={C.lavender} />
          <path
            d={`M73 ${y + 8} l4 4 l7 -8`}
            stroke={C.mintInk}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="94" y={y + 5} width="44" height="6" rx="3" fill={C.lavender} />
        </g>
      ))}
      <rect x="70" y="92" width="16" height="16" rx="4" fill={C.lavender} opacity="0.6" />
      <rect x="94" y="97" width="44" height="6" rx="3" fill={C.lavender} />
      <g transform="rotate(-38 168 104)">
        <rect x="128" y="98" width="70" height="13" rx="3" fill={C.butter} />
        <path d="M128 98 l-12 6.5 l12 6.5 z" fill={C.peach} />
        <rect x="192" y="98" width="8" height="13" rx="2" fill={C.peach} />
      </g>
    </svg>
  );
}

/** "Then": a week of dot-and-stem marks with M T W T F S S under it. */
export function WeekChartArt({ className, days = 'M T W T F S S' }) {
  const heights = [52, 74, 44, 82, 62, 92, 70];
  const fills = [C.peach, C.blushStrong, C.butter, C.blushStrong, C.peach, C.blushStrong, C.butter];
  const labels = days.split(' ');
  return (
    <svg viewBox="0 0 240 160" className={className} {...svgProps}>
      <line x1="34" y1="124" x2="206" y2="124" stroke={C.mintInk} strokeWidth="2" opacity="0.5" />
      {heights.map((h, i) => {
        const x = 46 + i * 25;
        return (
          <g key={i}>
            <line
              x1={x}
              y1="124"
              x2={x}
              y2={124 - h}
              stroke={C.mintInk}
              strokeWidth="2.5"
              opacity="0.6"
            />
            <circle cx={x} cy={124 - h} r="8" fill={fills[i]} />
          </g>
        );
      })}
      {labels.map((d, i) => (
        <text
          key={i}
          x={46 + i * 25}
          y="145"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={C.mintInk}
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

/** "Whenever you're ready": two chat bubbles, one with a heart. */
export function ChatHeartArt({ className }) {
  return (
    <svg viewBox="0 0 240 160" className={className} {...svgProps}>
      <path
        d="M50 30 h86 a14 14 0 0 1 14 14 v34 a14 14 0 0 1 -14 14 h-58 l-18 16 v-16 h-10 a14 14 0 0 1 -14 -14 v-34 a14 14 0 0 1 14 -14 z"
        fill={C.white}
      />
      {[74, 92, 110].map((x) => (
        <circle key={x} cx={x} cy="61" r="6" fill={C.blushStrong} />
      ))}
      <path
        d="M118 72 h70 a14 14 0 0 1 14 14 v30 a14 14 0 0 1 -14 14 h-8 v16 l-18 -16 h-44 a14 14 0 0 1 -14 -14 v-30 a14 14 0 0 1 14 -14 z"
        fill={C.mint}
      />
      <path
        d="M153 112 c-10 -7 -16 -12 -16 -19 a8 8 0 0 1 16 -2 a8 8 0 0 1 16 2 c0 7 -6 12 -16 19 z"
        fill={C.mintInk}
        opacity="0.75"
      />
    </svg>
  );
}

/** Large guide thumbnail: night sky with clouds and a moon (sleep). */
export function NightArt({ className }) {
  return (
    <svg
      viewBox="0 0 380 230"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      {...svgProps}
    >
      <rect width="380" height="230" fill={C.lavender} />
      <path
        d="M0 160 C 80 120, 170 190, 260 150 S 380 140, 380 140 V230 H0 Z"
        fill={C.blushStrong}
        opacity="0.7"
      />
      <path d="M0 190 C 100 170, 200 220, 380 185 V230 H0 Z" fill={C.accent} opacity="0.18" />
      <g fill={C.white}>
        <circle cx="96" cy="78" r="20" />
        <circle cx="122" cy="70" r="24" />
        <circle cx="146" cy="82" r="18" />
        <rect x="74" y="80" width="96" height="22" rx="11" />
        <rect x="196" y="112" width="70" height="14" rx="7" opacity="0.7" />
      </g>
      <path d="M296 44 a34 34 0 1 0 22 60 a28 28 0 1 1 -22 -60 z" fill={C.butter} />
      <path d="M70 40 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={C.white} />
      <path d="M210 42 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 z" fill={C.white} />
    </svg>
  );
}

/** Small guide thumbnail: a stack of books with a leaf (school and stress). */
export function BooksArt({ className }) {
  return (
    <svg viewBox="0 0 80 80" className={className} {...svgProps}>
      <rect width="80" height="80" rx="16" fill={C.butter} opacity="0.55" />
      <rect x="18" y="52" width="44" height="10" rx="3" fill={C.lavender} />
      <rect x="20" y="41" width="40" height="10" rx="3" fill={C.blushStrong} />
      <rect x="17" y="30" width="44" height="10" rx="3" fill={C.accent} opacity="0.55" />
      <rect x="24" y="34" width="22" height="2" rx="1" fill={C.white} />
      <path d="M44 30 c0 -9 5 -14 12 -16 c-1 8 -5 13 -12 16 z" fill={C.mintInk} opacity="0.7" />
    </svg>
  );
}

/** Small guide thumbnail: two chat bubbles (talking things through). */
export function BubblesArt({ className }) {
  return (
    <svg viewBox="0 0 80 80" className={className} {...svgProps}>
      <rect width="80" height="80" rx="16" fill={C.blushStrong} opacity="0.55" />
      <path
        d="M16 20 h30 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-18 l-8 7 v-7 h-4 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 z"
        fill={C.white}
      />
      {[26, 33, 40].map((x) => (
        <circle key={x} cx={x} cy="34" r="2.6" fill={C.peach} />
      ))}
      <path
        d="M38 40 h26 a7 7 0 0 1 7 7 v10 a7 7 0 0 1 -7 7 h-4 v7 l-8 -7 h-14 a7 7 0 0 1 -7 -7 v-10 a7 7 0 0 1 7 -7 z"
        fill={C.lavender}
      />
    </svg>
  );
}

/** Mood faces: same lavender circle and ink face for every choice (no good/bad colour). */
export function MoodFace({ mood, className }) {
  const mouths = {
    good: 'M14 23 q6 6 12 0',
    okay: 'M14.5 24 q5.5 3 11 0',
    notSure: 'M14.5 24.5 h11',
    low: 'M14.5 26 q5.5 -3 11 0',
    overwhelmed: 'M14 27 q6 -6 12 0',
  };
  return (
    <svg viewBox="0 0 40 40" className={className} {...svgProps}>
      <circle cx="20" cy="20" r="18" fill={C.lavender} />
      <circle cx="14.5" cy="16.5" r="1.8" fill={C.ink} />
      <circle cx="25.5" cy="16.5" r="1.8" fill={C.ink} />
      <path d={mouths[mood]} stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
