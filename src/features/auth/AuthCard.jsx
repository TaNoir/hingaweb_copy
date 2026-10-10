import { Card } from '../../components/ui/Card.jsx';

/** Centered card used by every sign-in screen. */
export function AuthCard({ children, above = null, below = null }) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
      {above}
      <Card className="p-6 md:p-8">{children}</Card>
      {below}
    </div>
  );
}

export function FormMessage({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-control border-2 border-ink bg-surface px-4 py-3 text-[14px] text-ink"
    >
      {children}
    </div>
  );
}
