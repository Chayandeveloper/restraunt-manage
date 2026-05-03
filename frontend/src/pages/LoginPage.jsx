import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@gmail.com', password: 'Spiderwoman55@', role: 'SUPER ADMIN' },
  { label: 'Restaurant Admin', email: 'ravi@spicegarden.com', password: 'admin123', role: 'ADMIN' },
  { label: 'Staff / Waiter', email: 'arjun@spicegarden.com', password: 'staff123', role: 'STAFF' },
  { label: 'Kitchen Display', email: 'kitchen@spicegarden.com', password: 'kitchen123', role: 'KITCHEN' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email.toLowerCase().trim(), password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1><span>🍽️</span> RestaurantOS</h1>
          <p>The Complete Restaurant Operations Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-group mb-4">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-input" placeholder="you@restaurant.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? '⟳ Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="demo-accounts">
          <h4>Quick Demo Access</h4>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map(acc => (
              <button key={acc.email} className="demo-btn" onClick={() => fillDemo(acc)}>
                <span>{acc.label}</span>
                <span className="role-tag">{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
