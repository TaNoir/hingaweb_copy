// DEMO MODE ONLY (docs/demo.md; team decision in docs/questions.md, "Demo mode").
// Sample values for local demos and screenshots. Used only when the build has
// VITE_DEMO_CONTENT=true; with the flag off, nothing in this file reaches the bundle.
// The two hotlines are real public lines; everything else is fictional (made-up names, room, and
// 000 numbers; the emails use example.org).
// Never ship a pilot build with these values (build:pilot refuses the flag).
export const DEMO_SITE = {
  officeOpens: '08:00',
  officeCloses: '17:00',
  holidays: ['2026-11-02', '2026-11-30', '2026-12-08'],
  officeLocation: 'Room 101, Senior High Building',
  officeHoursText: 'Mon–Fri, 8:00 AM–5:00 PM',
  staffSupportContact: 'the school IT office',
};

export const DEMO_DIRECTORY = {
  hotline1: {
    name: 'NCMH Crisis Hotline',
    number: '0917 899 8727 (landline: 1553)',
    dial: '09178998727',
    note: 'Free, 24/7, nationwide',
  },
  hotline2: {
    name: 'National Emergency Hotline',
    number: '911',
    dial: '911',
    note: 'Police, fire, and medical emergencies',
  },
  guidance: {
    personInCharge: 'Sample Guidance Associate',
    roleTitle: 'Guidance Associate',
    phone: '(082) 000 0000',
    dial: '0820000000',
  },
  ipbm: {
    description: 'Psychiatric and psychological services for referred students',
    phone: '(082) 000 0001',
    email: 'ipbm-sample@example.org',
  },
  external: {
    name: 'Sample Psychology Clinic',
    description: 'Private counselling and psychological assessment',
    phone: '(082) 000 0002',
    email: 'clinic-sample@example.org',
  },
};
