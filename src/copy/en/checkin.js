// Phase 05 copy: private check-in (Fig 11), the prompt (Fig 15), and the crisis screen (Fig 18).
// The crisis keys also exist in ceb.js and tl.js as team placeholders (00 Section 10.2).
export const checkinCopy = {
  chip: 'Private to your account • Staff cannot browse your check-ins',
  title: 'How have things been?',
  lead: 'Only you can see this. Take a quiet breath and answer however feels true today.',
  items: {
    c1: 'School work and academic pressure has been affecting me.',
    c2: 'Things at home, family, or money have been affecting me.',
    c3: 'Worries about graduating, college, or my future have been affecting me.',
    c4: 'I have been able to manage what I am carrying.',
    c4Hint: 'Answer honestly. There is no right answer here.',
    mood: 'How has your mood been today?',
    stress: 'How stressed have you felt today?',
  },
  note: {
    title: 'Anything you want to write down?',
    label: 'Optional note',
    placeholder: 'Write anything on your mind...',
    hint: 'This is stored as you write it. Nothing reads it or analyses it.',
  },
  safety: {
    title: 'Please tell us if any of these apply',
    body: 'If you tick any of these, we will show you help right away and let the guidance office know.',
    loadError: 'These could not load.',
    loadErrorHelp: 'If you need help now, open Where to get help.',
    helpLink: 'Where to get help',
    empty: 'If you need help now, the hotlines are on Where to get help.',
  },
  required: 'Answer questions 1 to 6 to save. The note is optional.',
  progress: '{answered} of 6 answered', // ui-students item 7 (the one new line)
  save: 'Save check-in',
  cancel: 'Cancel and return',
  // ui-interactive Part 2: one question per screen
  next: 'Next',
  back: 'Back',
  stepOf: 'Question {n} of {total}',
  // ui-interactive Part 3: optional breathing card above the first question
  breath: {
    title: 'Take a breath',
    start: 'Start',
    stop: 'Stop',
    skip: 'Skip',
    in: 'Breathe in…',
    hold: 'Hold…',
    out: 'Breathe out…',
    done: 'Nice. Ready when you are.',
  },
  saveError:
    'Your check-in was not saved. Check your connection and try again. Your answers are still here.',
  saved: {
    chip: 'Check-in saved privately',
    title: 'Your check-in is saved',
    body: 'Only you can see it. Nothing was sent to the guidance office.',
    trends: 'See my check-ins over time',
    resources: 'See suggested guides',
    request: 'Ask the guidance office for support',
    home: 'Back to home',
  },
  prompt: {
    chip: 'Check-in saved privately',
    title: 'Would you like to send this to the guidance office?',
    body: 'If you would like support, you can ask the guidance office. Nothing is sent unless you choose to send it, and you will see exactly what is shared first.',
    send: 'Continue to send a request',
    notNow: 'Not now',
    footer: 'If you choose Not now, nobody is told. Only you can see that you chose it.',
  },
};

export const crisisCopy = {
  notice: 'This service is not for emergencies. If you are in immediate danger, call this number:',
  chip: 'Guidance safety response • {school}',
  languageLabel: 'Language',
  title: 'Help is available right now',
  lead: 'Thank you for telling us. You do not have to handle this on your own.',
  hotlinesHeading: 'People you can call now',
  call: 'Call {number}',
  callLabel: 'Call {name} at {number}',
  officeTitle: 'Your school guidance office',
  officeCall: 'Call guidance',
  officeCallLabel: 'Call the guidance office at {number}',
  nextTitle: 'What happens next',
  nextBody:
    'Because you told us about this, the guidance office will be told so that someone can check in with you. This is the one thing HingaWeb shares without asking first, and you were told about it before you started.',
  statusSending: 'Letting the guidance office know…',
  statusSent: 'The guidance office has been told.',
  statusRetrying:
    'We could not reach the guidance office yet. Keep this page open and we will keep trying. You can also call them with the button above.',
  statusOffline:
    "You're offline. We will tell the guidance office as soon as you're back online. The hotlines above work now.",
  statusFailed:
    'We could not tell the guidance office through HingaWeb. Please call them now with the button above.',
  back: 'Back to my check-in',
};
