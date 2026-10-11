// 00 Section 10.3. Exact sentences exempt from scripts/check-copy.js.
// Add a sentence ONLY in the phase that the plan names for it.
export const ALLOWLIST = [
  // Phase 03 · Fig 7 hero (allowlisted sentence 1)
  'It is not a diagnosis and it is not a replacement for talking to someone.',
  // Phase 08 · Fig 21 (allowlisted sentence 2)
  "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning.",
  // Phase 08 · Fig 24 (allowlisted sentence 3)
  'Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests.',
  // ui-landing-v2 (user design decision, not a plan phase): the landing FAQ question from the design.
  // Its answer says HingaWeb is not one.
  'Is HingaWeb a diagnosis?',
];
