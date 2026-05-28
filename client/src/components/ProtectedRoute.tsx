import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/api';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Carregando...</p>
      </div>
    );
  }

  if (!user && !getToken()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
