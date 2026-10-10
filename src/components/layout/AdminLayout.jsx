import { t } from '../../copy/index.js';
import { Chip } from '../ui/Chip.jsx';
import { StaffShell } from './StaffShell.jsx';

export function AdminLayout() {
  const items = [
    { to: '/admin/accounts', label: t('nav.admin.accounts') },
    { to: '/admin/consent', label: t('nav.admin.consent') },
    { to: '/admin/reference', label: t('nav.admin.reference') },
    { to: '/admin/resources', label: t('nav.admin.resources') },
    { to: '/admin/audit', label: t('nav.admin.audit') },
  ];
  return (
    <StaffShell
      logoTo="/admin/accounts"
      navLabel={t('nav.admin.label')}
      items={items}
      // The chip hides on phones so the header fits at 390 px (Phase 09).
      chip={
        <span className="hidden sm:inline">
          <Chip>{t('nav.admin.console')}</Chip>
        </span>
      }
      accountLabel={t('nav.admin.account')}
      signOutLabel={t('nav.admin.signOut')}
    />
  );
}
