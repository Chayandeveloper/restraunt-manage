import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => {
    if (!user) navigate('/login');
    else if (user.role === 'super_admin') navigate('/super-admin');
    else if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'staff') navigate('/staff');
    else navigate('/kitchen');
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24,
      backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ fontSize: 72, lineHeight: 1 }}>🍽️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 800, color: 'var(--border)', lineHeight: 1, letterSpacing: -4 }}>404</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Table Not Found</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>
        Looks like this page walked out on its order. Let's get you back to the kitchen.
      </div>
      <button className="btn btn-primary btn-lg" onClick={goHome} style={{ marginTop: 8 }}>
        ← Back to Dashboard
      </button>
    </div>
  );
}
