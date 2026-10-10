import { useAuth } from '../../lib/auth/useAuth.js';
import { PublicLayout } from './PublicLayout.jsx';
import { StudentLayout } from './StudentLayout.jsx';

/** "/", "/guides", "/help": a signed-in student keeps the student header; everyone else sees the public one. */
export function PublicOrStudentLayout({ width = 'reading' }) {
  const { account } = useAuth();
  return account.kind === 'student' ? (
    <StudentLayout width={width} />
  ) : (
    <PublicLayout width={width} />
  );
}
