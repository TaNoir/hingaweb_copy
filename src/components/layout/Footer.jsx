import { t } from '../../copy/index.js';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-canvas-alt px-4 py-6 text-center text-[13px] text-ink-muted">
      {t('common.footer')}
    </footer>
  );
}
