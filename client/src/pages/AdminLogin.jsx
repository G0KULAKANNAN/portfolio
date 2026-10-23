import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../Admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, sessionExpiredMessage, setSessionExpiredMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpiredQuery = new URLSearchParams(location.search).get('expired') === 'true';

  useEffect(() => {
    // Clear any previous error when arriving at login
    setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError('');
    if (setSessionExpiredMessage) {
      setSessionExpiredMessage(null);
    }

    try {
      await login(email, password);
      // Use replace: true so login is removed from browser history stack
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-logo">Gokulakannan P</div>
          <div className="admin-login-subtitle">Secure Admin Access Portal</div>
        </div>

        {/* Inactivity Session Expiration Warning */}
        {(isExpiredQuery || sessionExpiredMessage) && (
          <div className="admin-warning-banner" style={{
            backgroundColor: 'rgba(217, 119, 6, 0.16)',
            border: '1px solid rgba(217, 119, 6, 0.45)',
            color: '#fbbf24',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '1.1rem' }}></i>
            <div>{sessionExpiredMessage || 'Your session has expired. Please log in again.'}</div>
          </div>
        )}

        {/* General Error Banner */}
        {error && (
          <div className="admin-error-banner">
            <i className="fa-solid fa-circle-exclamation"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-input-group">
            <label className="admin-input-label">Admin Email</label>
            <input
              type="email"
              className="admin-input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="admin-input-group">
            <label className="admin-input-label">Password</label>
            <input
              type="password"
              className="admin-input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Authenticating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-lock-open"></i> Unlock Dashboard
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link 
            to="/" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '0.9rem', 
              textDecoration: 'none', 
              transition: 'color 0.25s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }} 
            onMouseOver={(e) => e.target.style.color = 'var(--accent-gold)'} 
            onMouseOut={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.5)'}
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
