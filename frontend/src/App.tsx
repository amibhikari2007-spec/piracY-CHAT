import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AuthPage from './components/Auth/AuthPage';
import AppLayout from './components/Chat/AppLayout';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();

    // Handle forced logout from token interceptor
    const handleLogout = () => {
      useAuthStore.getState().logout();
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-wa-bg dark:bg-wa-bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-wa-green/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-wa-green border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-wa-secondary dark:text-wa-secondary-dark">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
