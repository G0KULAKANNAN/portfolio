import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Portfolio from './Portfolio';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Protected Admin Dashboard Route
function ProtectedAdminRoute({ children }) {
  const { user, loading, sessionExpiredMessage, checkSession } = useAuth();
  const location = useLocation();

  // Guard against browser back-forward cache (BFCache)
  useEffect(() => {
    const handlePopState = () => {
      checkSession();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [checkSession]);

  if (loading) {
    return (
      <div className="admin-login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}></i>
          <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '700' }}>Verifying Secure Session...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectPath = sessionExpiredMessage ? '/admin/login?expired=true' : '/admin/login';
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  return children;
}

// Redirect logged in admins away from Login page
function PublicAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}></i>
          <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '700' }}>Verifying Secure Session...</h2>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/admin" replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/login" 
            element={
              <PublicAdminRoute>
                <AdminLogin />
              </PublicAdminRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
