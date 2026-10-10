// Phase 06 copy: trends (Fig 12) and suggested resources (Fig 13). D-20 and D-25 rewrites.
export const trendsCopy = {
  chip: 'Private to your account • Only you can see this',
  title: 'Your check-ins over time',
  lead: 'Only you can see this. A quiet view of what you have noted down.',
  rangeLabel: 'Time range',
  range: { days30: 'Last 30 days', months3: 'Last 3 months', all: 'All time' },
  sectionTitle: 'Each area, over time',
  sectionLead:
    'What you answered on each check-in, shown as you answered it. Nothing here is worked out for you.',
  names: { mood: 'Mood', stress: 'Stress' },
  chartSummary:
    '{name}: {count} check-ins from {from} to {to}. Every answer is in the table below the charts.',
  chartSummaryOne: '{name}: 1 check-in on {date}. Every answer is in the table below the charts.',
  tooltip: '{date}: {answer}',
  tableShow: 'Show my answers as a table',
  tableHide: 'Hide the table',
  tableCaption: 'Your answers on each check-in',
  tableDate: 'Date',
  noAnswer: '—',
  empty: {
    title: 'No check-ins yet',
    body: 'Your answers will show here after your first check-in.',
    action: 'Start a check-in',
  },
  emptyRange: {
    title: 'No check-ins in this time range',
    body: 'Choose All time to see every check-in.',
    action: 'Show all time',
  },
  talk: {
    title: 'Want to talk to someone?',
    body: 'You do not have to carry heavy things on your own. If you would like support, you can ask the guidance office. You will see exactly what is shared before anything is sent.',
    action: 'Ask the guidance office for support',
  },
  footer: 'Your check-ins can be opened only from your own account.',
};

export const resourcesCopy = {
  chip: 'Private to your account • Only you can see this',
  title: 'Suggested for you',
  lead: 'Chosen by matching your latest check-in to the topics of each guide. You are never compared to other students.',
  filterLabel: 'Show guides about',
  all: 'All',
  noCheckin: {
    title: 'Do a check-in first',
    body: 'Suggestions are matched to your latest check-in. Until then, you can browse every guide.',
    checkin: 'Start a check-in',
    guides: 'Browse all guides',
  },
  emptyLibrary: {
    title: 'No guides have been published yet',
    body: 'The guidance office adds guides here after checking them.',
  },
  emptyFilter: {
    title: 'No suggested guides on this topic',
    body: 'Choose All to see every suggested guide.',
  },
  talk: {
    title: 'Want to talk about what you are reading?',
    body: 'You can ask the guidance office for support. You will see exactly what is shared before anything is sent.',
    action: 'Ask the guidance office for support',
  },
};
