import { t } from '../../copy/index.js';
import { StaffShell } from './StaffShell.jsx';

/**
 * Guidance header (00 Section 8.5). crisisCount is wired to the crisis channel in Phase 08;
 * until then it stays 0 and no badge shows.
 */
export function StaffLayout({ crisisCount = 0 }) {
  const items = [
    { to: '/staff/queue', label: t('nav.staff.queue') },
    {
      to: '/staff/crisis',
      label: t('nav.staff.crisis'),
      badge: crisisCount > 0 ? String(crisisCount) : null,
      badgeLabel: t('nav.staff.crisisBadge', { count: crisisCount }),
    },
    { to: '/staff/referrals', label: t('nav.staff.referrals') },
  ];
  return (
    <StaffShell
      logoTo="/staff/queue"
      navLabel={t('nav.staff.label')}
      items={items}
      accountLabel={t('nav.staff.account')}
      signOutLabel={t('nav.staff.signOut')}
    />
  );
}
