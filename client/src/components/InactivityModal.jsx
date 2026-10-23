import React from 'react';

export default function InactivityModal({ isOpen, countdown, onStayLoggedIn, onLogout }) {
  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="inactivity-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="inactivity-modal-card" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: 'fadeInScale 0.25s ease-out'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(217, 119, 6, 0.12)',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          margin: '0 auto 1.25rem'
        }}>
          <i className="fa-solid fa-clock-rotate-left"></i>
        </div>

        <h3 style={{
          fontSize: '1.35rem',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '0.6rem'
        }}>
          Session Inactivity Warning
        </h3>

        <p style={{
          fontSize: '0.95rem',
          color: '#475569',
          lineHeight: '1.6',
          marginBottom: '1.5rem'
        }}>
          Your admin session has been inactive. For security, you will be automatically logged out in:
        </p>

        <div style={{
          display: 'inline-block',
          backgroundColor: '#f8fafc',
          border: '2px solid rgba(217, 119, 6, 0.35)',
          borderRadius: '12px',
          padding: '0.75rem 1.75rem',
          marginBottom: '1.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#b45309',
          letterSpacing: '1px'
        }}>
          {formattedTime}
        </div>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          >
            Log Out Now
          </button>

          <button
            onClick={onStayLoggedIn}
            style={{
              flex: 1.2,
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <i className="fa-solid fa-shield-check" style={{ marginRight: '0.4rem' }}></i>
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
