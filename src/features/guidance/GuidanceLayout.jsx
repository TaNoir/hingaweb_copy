// Every guidance screen: the Phase 02 staff header with the live crisis count, and an alert that
// appears on ANY guidance screen the moment a crisis event is raised (2.1.3.8; 2.1.6.1.6).
import { Link } from 'react-router';
import { Siren } from 'lucide-react';
import { t } from '../../copy/index.js';
import { StaffLayout } from '../../components/layout/StaffLayout.jsx';
import { buttonClasses } from '../../components/ui/index.js';
import { CrisisFeedContext, useCrisisFeedSource } from './crisisFeed.js';

export function GuidanceLayout() {
  const feed = useCrisisFeedSource();
  return (
    <CrisisFeedContext.Provider value={feed}>
      <div role="alert" aria-live="assertive">
        {feed.alert && (
          <div className="flex flex-col gap-3 border-b-2 border-ink bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Siren aria-hidden="true" className="size-5" />
              {t('guidance.crisis.newAlert')}
            </p>
            <div className="flex gap-2">
              <Link
                to="/staff/crisis"
                onClick={feed.dismissAlert}
                className={buttonClasses('primary', 'md')}
              >
                {t('guidance.crisis.newAlertOpen')}
              </Link>
              <button
                type="button"
                onClick={feed.dismissAlert}
                className={buttonClasses('ghost', 'md')}
              >
                {t('guidance.crisis.dismiss')}
              </button>
            </div>
          </div>
        )}
      </div>
      <StaffLayout crisisCount={feed.activeCount} />
    </CrisisFeedContext.Provider>
  );
}
