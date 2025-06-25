
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ContestDashboard from '@/components/admin/ContestDashboard';

const AdminDashboard = () => {
  const { user } = useAuth();

  // For now, we'll allow any authenticated user to access admin
  // In production, you'd check for admin role here
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <ContestDashboard />;
};

export default AdminDashboard;
