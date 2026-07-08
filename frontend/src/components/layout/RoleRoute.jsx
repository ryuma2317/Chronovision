import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner } from '../ui/Spinner';
import DashboardShell from './DashboardShell';

export default function RoleRoute({ role }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
