import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

const NAV = [
  {
    label: 'Platform',
    links: [
      { to: '/super-admin', icon: '◉', label: 'Dashboard', end: true },
    ]
  }
];

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      
      <Sidebar 
        items={NAV} 
        restaurantName="Platform Admin" 
        isOpen={sidebarOpen} 
        isHidden={sidebarHidden}
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="main-wrapper">
        <header className="layout-header">
          <button className="layout-toggle" onClick={() => {
            if (window.innerWidth <= 1024) setSidebarOpen(true);
            else setSidebarHidden(!sidebarHidden);
          }}>
            ☰
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>RestaurantOS</div>
          <div style={{ width: 40 }} />
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}
