import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

const NAV = [
  {
    label: 'Overview',
    links: [
      { to: '/admin', icon: '◉', label: 'Dashboard', end: true },
      { to: '/admin/analytics', icon: '📊', label: 'Analytics' },
      { to: '/admin/shift', icon: '📋', label: 'Shift Summary' },
    ]
  },
  {
    label: 'Operations',
    links: [
      { to: '/admin/take-order', icon: '📝', label: 'Take Order' },
      { to: '/admin/orders', icon: '🧾', label: 'All Orders' },
      { to: '/admin/tables', icon: '🪑', label: 'Tables' },
    ]
  },
  {
    label: 'Menu',
    links: [
      { to: '/admin/menu', icon: '🍽️', label: 'Menu & Categories' },
    ]
  },
  {
    label: 'Team',
    links: [
      { to: '/admin/users', icon: '👥', label: 'Users' },
    ]
  }
];

export default function AdminLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const restaurantName = user?.restaurantId?.name || 'Restaurant';

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
        }}
      />

      <Sidebar
        items={NAV}
        restaurantName={restaurantName}
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
            <div className="brand-logo">A</div>
            <div className="brand-name">Admin Control</div>
          </div>
          
          <div className="layout-actions flex items-center gap-4">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>System</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{restaurantName}</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </header>
        
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
