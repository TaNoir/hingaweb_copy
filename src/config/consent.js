// Phase 04 · consent and assent settings (2.1.5.1.1, 2.1.6.2.3, 2.1.6.3.1, 2.1.6.3.6; D-26, D-27).

/** Version of the assent wording. Change it whenever the assent text changes. */
export const ASSENT_VERSION = 'v1';

/**
 * 2.1.6.3.6: the assent wording must be confirmed by the validator panel for a reading level
 * suitable for minors. Set to 'final' only after that confirmation. build:pilot fails until then.
 */
export const ASSENT_COPY_STATUS = 'provisional';

/** Languages offered on the assent and crisis screens (2.1.6.3.1; D-31). */
export const LANGUAGES = Object.freeze([
  Object.freeze({ value: 'en', label: 'English' }),
  Object.freeze({ value: 'ceb', label: 'Bisaya' }),
  Object.freeze({ value: 'tl', label: 'Tagalog' }),
]);

/** Stored in consent_records.instrument_version, e.g. "assent-v1-ceb". */
export function assentInstrumentVersion(lang) {
  return `assent-${ASSENT_VERSION}-${lang}`;
}
