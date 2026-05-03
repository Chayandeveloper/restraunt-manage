import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SOURCE_COLORS  = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const STATUS_COLORS  = { pending: 'badge-yellow', preparing: 'badge-blue', ready: 'badge-green', completed: 'badge-gray' };

function QuickLink({ to, icon, label, color, sub }) {
  return (
    <Link to={to} className="card p-4 flex flex-col items-center gap-2" style={{ textDecoration: 'none', transition: 'var(--transition)' }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [todaySummary, setTodaySummary] = useState(null);
  const [monthAnalytics, setMonthAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState('all');

  const fetchData = () => {
    Promise.all([
      api.get('/orders/summary/today'),
      api.get('/analytics'),
      api.get('/orders?limit=6'),
      api.get('/orders?status=pending,preparing,ready&limit=20'),
    ]).then(([t, m, recent, active]) => {
      setTodaySummary(t.data);
      setMonthAnalytics(m.data);
      setRecentOrders(recent.data);
      setActiveOrders(active.data);
    }).finally(() => setLoading(false));
  };

  const updatePayment = (id, method) => {
    api.put(`/orders/${id}/payment`, { paymentStatus: 'paid', paymentMethod: method })
      .then(() => { toast.success(`Paid via ${method.toUpperCase()}`); fetchData(); })
      .catch(() => toast.error('Error updating payment'));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const getFilteredStats = (summaryData, sourceList, isToday = true) => {
    if (activeSource === 'all') return summaryData || {};
    const sourceData = sourceList?.find(s => s._id === activeSource);
    if (!sourceData) return { totalRevenue: 0, totalProfit: 0, totalOrders: 0, activeOrders: 0 };
    
    return {
      totalRevenue: sourceData.revenue || sourceData.totalRevenue || 0,
      totalProfit: sourceData.profit || sourceData.totalProfit || 0,
      totalOrders: sourceData.count || sourceData.totalOrders || 0,
      activeOrders: isToday ? activeOrders.filter(o => o.source === activeSource).length : 0
    };
  };

  const today = getFilteredStats(todaySummary?.summary, todaySummary?.bySource, true);
  const month = getFilteredStats(monthAnalytics?.summary, monthAnalytics?.revenueBySource, false);

  const filteredActiveOrders = activeSource === 'all' ? activeOrders : activeOrders.filter(o => o.source === activeSource);
  const filteredRecentOrders = activeSource === 'all' ? recentOrders : recentOrders.filter(o => o.source === activeSource);

  return (
    <div className="p-6 animate-slide-up">
      <div className="dashboard-header animate-slide-up">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-3 w-full-mobile">
          <Link to="/admin/shift" className="btn btn-secondary flex-1">📋 Shift Report</Link>
          <Link to="/admin/menu" className="btn btn-primary flex-1">🍽️ Manage Menu</Link>
        </div>
      </div>

      {/* Source Filters */}
      <div className="source-filters mb-8">
        {[
          { id: 'all', label: 'All Sources', icon: '🌍' },
          { id: 'direct', label: 'Direct', icon: '🏪' },
          { id: 'zomato', label: 'Zomato', icon: '🔴' },
          { id: 'swiggy', label: 'Swiggy', icon: '🟠' },
        ].map(s => (
          <button 
            key={s.id} 
            className={`btn ${activeSource === s.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSource(s.id)}
            style={{ borderRadius: 99, flex: 1, minWidth: '120px' }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="dashboard-main-grid mb-8">
        {/* Today's Stats */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title">Today's Performance</h2>
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }}></div>
              <span className="badge badge-green" style={{ fontSize: 10 }}>Live</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Revenue</div>
              <div className="menu-card-price" style={{ fontSize: 24 }}>₹{today.totalRevenue?.toLocaleString()}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Profit</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--green)' }}>₹{Math.round(today.totalProfit)?.toLocaleString()}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Orders</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--blue)' }}>{today.totalOrders}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Active</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--yellow)' }}>{today.activeOrders}</div>
            </div>
          </div>
        </div>

        {/* 30 Day Overview */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title">30-Day Overview</h2>
            <Link to="/admin/analytics" className="btn btn-ghost btn-sm">Insights →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Total Revenue</div>
              <div className="menu-card-price" style={{ fontSize: 24 }}>₹{month.totalRevenue?.toLocaleString()}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Total Profit</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--green)' }}>₹{Math.round(month.totalProfit)?.toLocaleString()}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Total Orders</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--purple)' }}>{month.totalOrders}</div>
            </div>
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: 'none' }}>
              <div className="form-label mb-1">Avg Ticket</div>
              <div className="menu-card-price" style={{ fontSize: 24, color: 'var(--orange)' }}>₹{month.totalOrders ? Math.round(month.totalRevenue / month.totalOrders) : 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-split-grid mb-8">
        {/* Active Orders */}
        <div className="card flex flex-col">
          <div className="card-header">
            <h2 className="card-title">⚡ Active Orders</h2>
            <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Table</th><th>Amount</th><th>Status</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {filteredActiveOrders.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>No active orders</td></tr>
                ) : (
                  filteredActiveOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{o._id.slice(-6).toUpperCase()}</td>
                      <td>{o.tableNumber || '—'}</td>
                      <td style={{ fontWeight: 700 }}>₹{o.totalAmount}</td>
                      <td><span className={`badge ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                      <td>
                        {o.paymentStatus === 'paid' ? (
                          <span className="badge badge-green">Paid</span>
                        ) : (
                          <select className="form-select" style={{ padding: '4px 8px', fontSize: 12 }} onChange={e => updatePayment(o._id, e.target.value)}>
                            <option value="">Pay...</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <h2 className="form-label">Quick Access</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <QuickLink to="/staff" icon="🧾" label="Terminal" />
            <QuickLink to="/admin/orders" icon="📋" label="All Orders" />
            <QuickLink to="/admin/tables" icon="🪑" label="Tables" />
            <QuickLink to="/kitchen" icon="👨‍🍳" label="Kitchen" />
            <QuickLink to="/admin/users" icon="👥" label="Staff" />
            <QuickLink to="/admin/analytics" icon="📊" label="Reports" />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Transactions</h2>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">Full History</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Table</th><th>Source</th><th>Items</th><th>Amount</th><th>Profit</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {filteredRecentOrders.map(o => (
                <tr key={o._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{o._id.slice(-6).toUpperCase()}</td>
                  <td>{o.tableNumber || '—'}</td>
                  <td><span className={`badge ${SOURCE_COLORS[o.source]}`}>{o.source}</span></td>
                  <td>{o.items.length} items</td>
                  <td style={{ fontWeight: 700 }}>₹{o.totalAmount}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>₹{Math.round(o.profit)}</td>
                  <td><span className={`badge ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{format(new Date(o.createdAt), 'HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
