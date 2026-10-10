// Temporary screen for routes built in later phases. Each later phase replaces its own
// <PhasePlaceholder> route element. Delete this file in Phase 10 once no route uses it.
import { t } from '../../copy/index.js';

export function PhasePlaceholder({ phase }) {
  return <p className="text-base text-ink-muted">{t('dev.placeholder', { phase })}</p>;
}
