// Static referral directory and hotlines (00 Section 6.4; D-03; 2.1.5.1.8; 2.1.6.4.6).
// Served from the bundle and the service-worker cache, so it shows with NO backend.
// Every name, number, address, and hour is a placeholder the guidance office fills in.
// The four referral targets are fixed by manuscript Section 1.4.
import { SITE } from '../config/site.js';
import { DEMO_DIRECTORY } from './demo-content.js';

// Demo mode (docs/demo.md): with VITE_DEMO_CONTENT=true each placeholder below is swapped for the
// sample value in demo-content.js. With the flag off, D is null and that file is not bundled.
const D = import.meta.env?.VITE_DEMO_CONTENT === 'true' ? DEMO_DIRECTORY : null;

/**
 * 24/7 crisis hotlines. `dial` is digits only and becomes a tel: link.
 * `emergency: true` marks the line used in "If you are in immediate danger, call …".
 * Exactly one entry must have emergency: true.
 */
export const HOTLINES = Object.freeze([
  Object.freeze({
    id: 'hotline_mental_health',
    name: D?.hotline1.name ?? '[[GUIDANCE:hotline_1_name]]',
    number: D?.hotline1.number ?? '[[GUIDANCE:hotline_1_number]]',
    dial: D?.hotline1.dial ?? '[[GUIDANCE:hotline_1_dial_digits]]',
    note: D?.hotline1.note ?? '[[GUIDANCE:hotline_1_short_description]]',
    emergency: false,
  }),
  Object.freeze({
    id: 'hotline_emergency',
    name: D?.hotline2.name ?? '[[GUIDANCE:hotline_2_name]]',
    number: D?.hotline2.number ?? '[[GUIDANCE:hotline_2_number]]',
    dial: D?.hotline2.dial ?? '[[GUIDANCE:hotline_2_dial_digits]]',
    note: D?.hotline2.note ?? '[[GUIDANCE:hotline_2_short_description]]',
    emergency: true,
  }),
]);

/** The RMC guidance office (referral target 1). */
export const GUIDANCE_OFFICE = Object.freeze({
  id: 'guidance_office',
  personInCharge: D?.guidance.personInCharge ?? '[[GUIDANCE:guidance_person_name]]',
  roleTitle: D?.guidance.roleTitle ?? '[[GUIDANCE:guidance_person_role_title]]',
  location: SITE.officeLocation,
  hours: SITE.officeHoursText,
  phone: D?.guidance.phone ?? '[[GUIDANCE:guidance_office_phone]]',
  dial: D?.guidance.dial ?? '[[GUIDANCE:guidance_office_dial_digits]]',
});

/** Specialist services (referral targets 2 and 3). IPBM is named in KII Round 1. */
export const SPECIALISTS = Object.freeze([
  Object.freeze({
    id: 'ipbm',
    kind: 'partner',
    name: 'Institute of Psychiatric and Behavioral Medicine',
    description: D?.ipbm.description ?? '[[GUIDANCE:ipbm_description]]',
    phone: D?.ipbm.phone ?? '[[GUIDANCE:ipbm_contact_number]]',
    email: D?.ipbm.email ?? '[[GUIDANCE:ipbm_email]]',
  }),
  Object.freeze({
    id: 'external_professionals',
    kind: 'external',
    name: D?.external.name ?? '[[GUIDANCE:external_professional_name]]',
    description: D?.external.description ?? '[[GUIDANCE:external_professional_description]]',
    phone: D?.external.phone ?? '[[GUIDANCE:external_professional_contact]]',
    email: D?.external.email ?? '[[GUIDANCE:external_professional_email]]',
  }),
]);

/** The hotline used in the not-for-emergencies sentence. */
export function emergencyHotline() {
  return HOTLINES.find((h) => h.emergency);
}
