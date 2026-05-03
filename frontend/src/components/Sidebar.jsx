import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ items, restaurantName, isOpen, isHidden, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isHidden ? 'hidden' : ''}`}>
      <div className="sidebar-logo" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <div className="brand-logo">R</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>RestaurantOS</h1>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', display: 'block' }}>
          Operations Control
        </span>
      </div>

      <div style={{ padding: '20px 24px', background: 'var(--bg-elevated)', margin: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Restaurant</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{restaurantName}</div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '8px 16px', flex: 1, overflowY: 'auto' }}>
        {items.map((section, i) => (
          <div key={i} className="nav-section" style={{ marginBottom: '24px' }}>
            {section.label && (
              <div style={{ padding: '0 16px', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {section.label}
              </div>
            )}
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'var(--transition)',
                  marginBottom: '4px'
                }}
              >
                <span style={{ fontSize: '18px' }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ padding: '16px', borderTop: '1px solid var(--border-light)' }}>
        <div className="user-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div className="user-avatar" style={{ width: '36px', height: '36px', background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', transition: 'var(--transition)' }} title="Logout">
            ⏻
          </button>
        </div>
      </div>

      <style>{`
        .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .nav-item.active { background: var(--accent-dim); color: var(--accent); fontWeight: 700; }
        .sidebar.hidden { transform: translateX(-100%); }
        @media (max-width: 1024px) {
          .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; z-index: 1000; box-shadow: 20px 0 50px rgba(0,0,0,0.5); }
          .sidebar.open { left: 0; }
        }
      `}</style>
    </aside>
  );
}
