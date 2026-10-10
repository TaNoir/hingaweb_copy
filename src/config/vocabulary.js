// 00 Section 2. Every fixed value used by the app. Never invent synonyms.

export const ROLES = Object.freeze({
  student: 'student',
  guidance: 'guidance',
  administrator: 'administrator',
});

export const CRITERIA = Object.freeze([
  Object.freeze({
    key: 'c1',
    staffLabel: 'Academic pressure',
    studentLabel: 'School work',
    attribute: 'school_work',
  }),
  Object.freeze({
    key: 'c2',
    staffLabel: 'Family / financial / home concerns',
    studentLabel: 'Home and family',
    attribute: 'home_family',
  }),
  Object.freeze({
    key: 'c3',
    staffLabel: 'Future / career transition concerns',
    studentLabel: 'Future',
    attribute: 'future',
  }),
  Object.freeze({
    key: 'c4',
    staffLabel: 'Manageability / coping capacity',
    studentLabel: 'Managing',
    attribute: 'managing',
  }),
]);

export const ANSWER_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: 'Not at all' }),
  Object.freeze({ value: 2, label: 'A little' }),
  Object.freeze({ value: 3, label: 'Somewhat' }),
  Object.freeze({ value: 4, label: 'Quite a lot' }),
  Object.freeze({ value: 5, label: 'Very much' }),
]);

export const MOOD_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: 'Very low' }),
  Object.freeze({ value: 2, label: 'Low' }),
  Object.freeze({ value: 3, label: 'Okay' }),
  Object.freeze({ value: 4, label: 'Good' }),
  Object.freeze({ value: 5, label: 'Very good' }),
]);

export const STRESS_SCALE = ANSWER_SCALE;

export const WORKFLOW_STATES = Object.freeze([
  Object.freeze({ value: 'pending', label: 'Pending' }),
  Object.freeze({ value: 'reviewed', label: 'Reviewed' }),
  Object.freeze({ value: 'referred', label: 'Referred' }),
  Object.freeze({ value: 'resolved', label: 'Resolved' }),
]);
export const OPEN_STATES = Object.freeze(['pending', 'reviewed', 'referred']);

export const BANDS = Object.freeze([
  Object.freeze({ value: 'P1', label: 'P1', meaning: 'See first' }),
  Object.freeze({ value: 'P2', label: 'P2', meaning: 'See within the standard response window' }),
  Object.freeze({
    value: 'P3',
    label: 'P3',
    meaning: 'See after P1 and P2, within three school days',
  }),
  Object.freeze({ value: 'FR', label: 'For Review', meaning: 'Counselor decides' }),
]);

export const CONCERN_TYPES = Object.freeze([
  Object.freeze({ value: 'academic', label: 'School work' }),
  Object.freeze({ value: 'peer', label: 'Friends and classmates' }),
  Object.freeze({ value: 'family', label: 'Home and family' }),
  Object.freeze({ value: 'wellness', label: "Something else about how I'm doing" }),
]);

// office-tags:start
export const OFFICE_TAGS = Object.freeze([
  Object.freeze({ value: 'green', label: 'Green' }),
  Object.freeze({ value: 'yellow', label: 'Yellow' }),
  Object.freeze({ value: 'red', label: 'Red' }),
]);
// office-tags:end

export const PROMPT_TYPES = Object.freeze(['max_sev', 'gray_zone']);
export const PROMPT_OUTCOMES = Object.freeze(['dismissed', 'request_sent']);

export const AUDIT_ACTIONS = Object.freeze([
  Object.freeze({ value: 'view_request', label: 'Opened support request' }),
  Object.freeze({ value: 'state_change', label: 'Changed status' }),
  Object.freeze({ value: 'referral', label: 'Marked as referred' }),
  Object.freeze({ value: 'tag', label: 'Assigned office tag' }),
  Object.freeze({ value: 'follow_up', label: 'Set follow-up date' }),
  Object.freeze({ value: 'view_crisis', label: 'Opened crisis event' }),
  Object.freeze({ value: 'crisis_acknowledged', label: 'Acknowledged crisis event' }),
  Object.freeze({ value: 'crisis_resolved', label: 'Resolved crisis event' }),
]);

/** Look up the display label for a value in one of the lists above. */
export function labelFor(list, value) {
  const hit = list.find((x) => x.value === value);
  return hit ? hit.label : value;
}
