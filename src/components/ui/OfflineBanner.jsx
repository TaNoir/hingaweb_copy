import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { t } from '../../copy/index.js';

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-ink bg-surface px-4 py-2 text-[14px] text-ink"
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span>{t('common.offline')}</span>
    </div>
  );
}
