import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'success' ? '#2d6a4f' : '#dc3545';
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: bgColor,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 9999,
      animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '0.9rem',
      fontWeight: '500'
    }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: '1.1rem' }}></i>
      <span>{message}</span>
      <button 
        onClick={onClose} 
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          padding: '0 0 0 8px',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center'
        }}
        onMouseEnter={(e) => e.target.style.color = '#fff'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
