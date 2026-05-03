import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

const NAV = [
  {
    links: [
      { to: '/staff', icon: '📝', label: 'Take Order', end: true },
      { to: '/staff/tables', icon: '🪑', label: 'Tables' },
    ]
  }
];

export default function StaffLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 900,
          display: sidebarOpen ? 'block' : 'none',
          transition: 'opacity 0.3s'
        }}
      />

      <Sidebar
        items={NAV}
        restaurantName={user?.restaurantId?.name || 'Restaurant'}
        isOpen={sidebarOpen}
        isHidden={sidebarHidden}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        <header className="layout-header premium-header">
          <div className="layout-brand">
            <button className="layout-toggle" onClick={() => {
              if (window.innerWidth <= 1024) setSidebarOpen(true);
              else setSidebarHidden(!sidebarHidden);
            }}>
              {window.innerWidth <= 1024 ? '☰' : sidebarHidden ? '→' : '←'}
            </button>
            <div className="brand-logo">R</div>
            <div className="brand-name">RestaurantOS</div>
          </div>
          
          <div className="layout-actions flex items-center gap-4">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Terminal</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>● Connected</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>
        
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .layout-header {
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .main-content {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
