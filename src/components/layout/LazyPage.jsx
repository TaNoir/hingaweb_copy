// Phase 10 · wraps a lazily loaded screen: a skeleton while its code downloads, and a plain
// message with a reload button if the download fails (offline, or a new version was deployed).
// The crisis screen, check-in, hotlines, and directory are NOT lazy (Phase 05 must-never 14).
import { Component, Suspense } from 'react';
import { t } from '../../copy/index.js';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

class ChunkBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorState
          title={t('common.error.title')}
          body={t('common.error.body')}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

export function LazyPage({ children }) {
  return (
    <ChunkBoundary>
      <Suspense
        fallback={
          <div>
            <p className="sr-only">{t('common.loading')}</p>
            <Skeleton lines={6} />
          </div>
        }
      >
        {children}
      </Suspense>
    </ChunkBoundary>
  );
}
