import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page px-6 text-center">
      <Compass size={56} className="text-gold mb-6" />
      <h1 className="text-5xl font-extrabold text-heading mb-2">404</h1>
      <h2 className="text-xl font-bold text-heading mb-2">Off the syllabus</h2>
      <p className="text-sm text-muted max-w-sm mb-8">
        This page wandered off the academic calendar. Let&rsquo;s get you back to somewhere on the map.
      </p>
      <Link to={user ? `/${user.role}` : '/login'}>
        <Button>Back to {user ? 'Dashboard' : 'Sign In'}</Button>
      </Link>
    </div>
  );
}
