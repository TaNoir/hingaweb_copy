// Phase 07 copy: ask the guidance office (Fig 16), failure state (Fig 17), and sent (2.1.6.4.7).
// D-10, D-11, D-12, D-20, D-23 rewrites.
export const requestCopy = {
  chip: 'Voluntary request • {school}',
  title: 'Ask the guidance office for support',
  lead: 'Reaching out is always your choice. Here is exactly what is shared before you send anything.',
  will: {
    title: 'What the guidance office will see',
    name: 'Your name',
    grade: 'Your grade level',
    gradeValue: 'Grade {grade}',
    section: 'Your section',
    adviser: 'Your class adviser',
    answers: 'Your four answers from your latest check-in on {date}',
    noAnswers: 'You have no check-in yet, so no answers are shared.',
    concern: 'The kind of concern you choose below',
    note: 'Anything you write in the note below',
    when: 'That you asked for support, and when you sent it',
  },
  wont: {
    title: 'What they will not see',
    checkins:
      'Your private check-ins on other days, your mood and stress answers, and your check-in notes.',
    trends: 'Your trends and the guides you opened.',
    footer: 'Your check-ins stay private to you. Staff cannot browse them.',
  },
  concern: {
    label: 'What is this mostly about?',
    placeholder: 'Choose one',
    hint: 'This helps the guidance office know what to expect. It does not decide anything.',
    required: 'Choose what this is mostly about.',
  },
  note: {
    label: 'Is there anything you want them to know? (optional)',
    placeholder: 'You can write a short note here, or leave this blank. Take your time...',
    hint: 'The guidance office will read this when they open your request. It is stored as you write it and never analysed.',
  },
  hours: {
    general:
      'Requests sent outside school hours, on weekends, or during school breaks wait for the next school day.',
    closedNow: 'The guidance office is closed right now. Your request will be seen from {date}.',
  },
  ack: {
    withAnswers:
      'I understand that my name, grade level, section, class adviser, my four latest check-in answers, the kind of concern, and my note will be shared with the guidance office.',
    withoutAnswers:
      'I understand that my name, grade level, section, class adviser, the kind of concern, and my note will be shared with the guidance office.',
  },
  toSend: 'To send, choose what this is mostly about and tick the box above.',
  send: 'Send request',
  cancel: 'Cancel',
  loadError: 'We could not load what will be shared, so nothing can be sent yet.',
  stale:
    'Your latest check-in changed since this page opened. Look at what will be shared again, then tick the box and send.',
  notAllowed:
    'This account cannot send a support request. If you need help now, use Where to get help.',
  failure: {
    strip: 'Not sent',
    title: 'We could not send your request. Nothing was sent.',
    body: 'Your note is still here on this page. You can try sending it again, or visit the guidance office in person.',
    where: 'Guidance office: {location} • {hours}',
    retry: 'Try sending again',
    kept: 'Your note stays on this page until you send it or leave. It is not saved on this device.',
  },
  urgent: {
    title: 'Need help right now?',
    body: 'You do not need to wait for this form.',
  },
  sent: {
    chip: 'Request sent',
    title: 'Your request was sent',
    body: 'The guidance office can now see your request. Someone from the office will follow up with you at school.',
    reference: '{ref} • Sent {time}',
    closedNow: 'The office is closed right now, so your request will be seen from {date}.',
    privacy: 'Your check-ins stay private. Only what was listed on the request screen was shared.',
    home: 'Back to home',
    checkin: 'Go to my check-in',
  },
  // User request 2026-10-11 ("My requests"): the student follows their own requests on the check-in
  // page. Three plain steps only; the office's own status words are never shown.
  mine: {
    title: 'My requests to the guidance office',
    lead: 'When you sent each request and whether the guidance office has seen it. Your note is not shown here.',
    sentOn: 'Sent {date}',
    stepsLabel: 'Progress of {ref}',
    steps: {
      sent: 'Sent',
      seen: 'Seen by the guidance office',
      closed: 'Closed',
    },
    state: {
      done: '(done)',
      now: '(now)',
      later: '(not yet)',
    },
    explain: {
      sent: 'The guidance office has not opened it yet. Someone from the office will follow up with you at school.',
      seen: 'The guidance office opened your request on {date}. Someone from the office will follow up with you at school.',
      seenNoDate:
        'The guidance office has opened your request. Someone from the office will follow up with you at school.',
      closed:
        'The guidance office closed this request on {date}. If you want to talk to them again, you can send a new request.',
      closedNoDate:
        'The guidance office closed this request. If you want to talk to them again, you can send a new request.',
    },
    loadError: 'We could not load your requests right now.',
  },
};
