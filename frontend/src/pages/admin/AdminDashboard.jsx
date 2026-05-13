import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/* ─── Design tokens ──────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --bg:        #0d0f14;
    --bg-card:   #13161e;
    --bg-raised: #1a1e2a;
    --bg-input:  #1f2333;
    --border:    rgba(255,255,255,0.07);
    --border-hi: rgba(255,255,255,0.13);

    --green:     #22c55e;
    --green-dim: rgba(34,197,94,.12);
    --blue:      #3b82f6;
    --blue-dim:  rgba(59,130,246,.12);
    --yellow:    #f59e0b;
    --yellow-dim:rgba(245,158,11,.12);
    --orange:    #f97316;
    --orange-dim:rgba(249,115,22,.12);
    --red:       #ef4444;
    --red-dim:   rgba(239,68,68,.12);
    --purple:    #a855f7;
    --purple-dim:rgba(168,85,247,.12);

    --text-hi:   #f1f5f9;
    --text-md:   #94a3b8;
    --text-lo:   #475569;

    --radius-sm: 8px;
    --radius:    12px;
    --radius-lg: 18px;

    --font: 'Sora', sans-serif;
    --mono: 'JetBrains Mono', monospace;

    --transition: 0.18s cubic-bezier(.4,0,.2,1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .db-root {
    font-family: var(--font);
    background: var(--bg);
    min-height: 100vh;
    color: var(--text-hi);
    padding: clamp(16px, 4vw, 32px);
    animation: fadeUp .35s ease both;
  }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }

  /* ── Header ─────────────────────────────────────────── */
  .db-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .db-greeting { font-size: clamp(18px, 3vw, 24px); font-weight: 700; color: var(--text-hi); }
  .db-date     { font-size: 13px; color: var(--text-md); margin-top: 2px; }
  .db-header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

  /* ── Buttons ─────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: var(--radius-sm);
    font-family: var(--font); font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; text-decoration: none;
    transition: var(--transition); white-space: nowrap;
  }
  .btn-primary  { background: var(--blue); color: #fff; }
  .btn-primary:hover { background: #2563eb; }
  .btn-secondary { background: var(--bg-raised); color: var(--text-hi); border: 1px solid var(--border-hi); }
  .btn-secondary:hover { background: var(--bg-input); }
  .btn-ghost    { background: transparent; color: var(--text-md); padding: 6px 10px; }
  .btn-ghost:hover { color: var(--text-hi); }
  .btn-active   { background: var(--blue); color: #fff !important; }

  /* ── Source filter pills ─────────────────────────────── */
  .source-bar {
    display: flex; gap: 8px; flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .src-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 99px;
    font-family: var(--font); font-size: 13px; font-weight: 600;
    cursor: pointer; border: 1px solid var(--border-hi);
    background: var(--bg-card); color: var(--text-md);
    transition: var(--transition);
  }
  .src-pill:hover { color: var(--text-hi); border-color: var(--blue); }
  .src-pill.active { background: var(--blue); border-color: var(--blue); color: #fff; }

  /* ── Card ────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .card-body { padding: 22px; }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px 0;
  }
  .card-title { font-size: 14px; font-weight: 700; color: var(--text-hi); letter-spacing: .02em; }

  /* ── Stat tile ───────────────────────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 18px 22px 22px;
  }
  .stat-tile {
    background: var(--bg-raised);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .stat-label { font-size: 11px; font-weight: 600; color: var(--text-lo); text-transform: uppercase; letter-spacing: .06em; }
  .stat-value { font-size: clamp(18px, 2.5vw, 24px); font-weight: 700; font-family: var(--mono); }

  /* ── Main layout grids ───────────────────────────────── */
  .top-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  .mid-grid {
    display: grid;
    grid-template-columns: 1fr minmax(0, 280px);
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (max-width: 900px) {
    .mid-grid { grid-template-columns: 1fr; }
  }

  /* ── Live dot ────────────────────────────────────────── */
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.5; transform:scale(.8); }
  }
  .live-badge {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600;
    color: var(--green);
  }

  /* ── Tables ──────────────────────────────────────────── */
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { border-bottom: 1px solid var(--border); }
  th {
    padding: 10px 14px; text-align: left;
    font-size: 11px; font-weight: 600; color: var(--text-lo);
    text-transform: uppercase; letter-spacing: .06em;
    white-space: nowrap;
  }
  td { padding: 11px 14px; color: var(--text-md); vertical-align: middle; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid var(--border); transition: var(--transition); }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: var(--bg-raised); }
  .td-id   { font-family: var(--mono); font-size: 11px; color: var(--text-lo); }
  .td-amt  { font-weight: 700; color: var(--text-hi); font-family: var(--mono); }
  .td-profit{ font-weight: 700; color: var(--green); font-family: var(--mono); }

  /* ── Badges ──────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 3px 9px; border-radius: 99px;
    font-size: 11px; font-weight: 600; letter-spacing: .03em;
  }
  .badge-green  { background: var(--green-dim);  color: var(--green); }
  .badge-red    { background: var(--red-dim);    color: var(--red); }
  .badge-orange { background: var(--orange-dim); color: var(--orange); }
  .badge-yellow { background: var(--yellow-dim); color: var(--yellow); }
  .badge-gray   { background: var(--bg-raised);  color: var(--text-md); }
  .badge-blue   { background: var(--blue-dim);   color: var(--blue); }

  /* ── Quick Access grid ───────────────────────────────── */
  .quick-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px 16px 16px;
  }
  .quick-tile {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    text-decoration: none; color: inherit;
    transition: var(--transition);
  }
  .quick-tile:hover {
    border-color: var(--blue);
    background: var(--bg-input);
    transform: translateY(-2px);
  }
  .quick-icon { font-size: 22px; }
  .quick-label { font-size: 12px; font-weight: 600; color: var(--text-hi); text-align: center; }

  /* ── Empty state ─────────────────────────────────────── */
  .empty-row td { text-align: center; padding: 36px; color: var(--text-lo); font-size: 13px; }

  /* ── Pay select ──────────────────────────────────────── */
  .pay-select {
    background: var(--bg-input); border: 1px solid var(--border-hi);
    color: var(--text-hi); border-radius: 6px;
    padding: 4px 8px; font-size: 12px; font-family: var(--font);
    cursor: pointer; outline: none;
  }
  .pay-select:focus { border-color: var(--blue); }

  /* ── Loading ─────────────────────────────────────────── */
  .loading-screen {
    min-height: 100vh; display: grid; place-items: center; background: var(--bg);
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border-hi);
    border-top-color: var(--blue);
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Mobile tweaks ───────────────────────────────────── */
  @media (max-width: 600px) {
    .db-header-actions .btn { flex: 1; justify-content: center; }
    .hide-mobile { display: none !important; }
    .stat-grid { grid-template-columns: 1fr 1fr; }
    th, td { padding: 9px 10px; }
  }
`;

/* ─── Constants ──────────────────────────────────────────────────── */
const SOURCE_BADGE = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const STATUS_BADGE = { pending: 'badge-yellow', completed: 'badge-gray' };

const SOURCES = [
  { id: 'all', label: 'All', icon: '🌍' },
  { id: 'direct', label: 'Direct', icon: '🏪' },
  { id: 'zomato', label: 'Zomato', icon: '🔴' },
  { id: 'swiggy', label: 'Swiggy', icon: '🟠' },
];

const QUICK_LINKS = [
  { to: '/staff', icon: '🧾', label: 'Terminal' },
  { to: '/admin/orders', icon: '📋', label: 'Orders' },
  { to: '/admin/tables', icon: '🪑', label: 'Tables' },
  { to: '/kitchen', icon: '👨‍🍳', label: 'Kitchen' },
  { to: '/admin/users', icon: '👥', label: 'Staff' },
  { to: '/admin/analytics', icon: '📊', label: 'Reports' },
];

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatTile({ label, value, color }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-hi)' }}>{value}</div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
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
      api.get('/orders?status=pending&limit=20'),
    ]).then(([t, m, recent, active]) => {
      setTodaySummary(t.data);
      setMonthAnalytics(m.data);
      setRecentOrders(recent.data.orders || []);
      setActiveOrders(active.data.orders || []);
    }).finally(() => setLoading(false));
  };

  const updatePayment = (id, method) => {
    if (!method) return;
    api.put(`/orders/${id}/payment`, { paymentStatus: 'paid', paymentMethod: method })
      .then(() => { toast.success(`Paid via ${method.toUpperCase()}`); fetchData(); })
      .catch(() => toast.error('Error updating payment'));
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <style>{styles}</style>
      <div className="spinner" />
    </div>
  );

  const getFilteredStats = (summaryData, sourceList, isToday = true) => {
    if (activeSource === 'all') return summaryData || {};
    const src = sourceList?.find(s => s._id === activeSource);
    if (!src) return { totalRevenue: 0, totalProfit: 0, totalOrders: 0, activeOrders: 0 };
    return {
      totalRevenue: src.revenue || src.totalRevenue || 0,
      totalProfit: src.profit || src.totalProfit || 0,
      totalOrders: src.count || src.totalOrders || 0,
      activeOrders: isToday ? activeOrders.filter(o => o.source === activeSource).length : 0,
    };
  };

  const today = getFilteredStats(todaySummary?.summary, todaySummary?.bySource, true);
  const month = getFilteredStats(monthAnalytics?.summary, monthAnalytics?.revenueBySource, false);

  const filteredActive = activeSource === 'all' ? activeOrders : activeOrders.filter(o => o.source === activeSource);
  const filteredRecent = activeSource === 'all' ? recentOrders : recentOrders.filter(o => o.source === activeSource);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const avgTicket = month.totalOrders ? Math.round(month.totalRevenue / month.totalOrders) : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="db-root">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="db-header">
          <div>
            <div className="db-greeting">{greeting}, {user?.name?.split(' ')[0]} 👋</div>
            <div className="db-date">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
          </div>
          <div className="db-header-actions">
            <Link to="/admin/shift" className="btn btn-secondary">📋 Shift Report</Link>
            <Link to="/admin/menu" className="btn btn-primary">🍽️ Manage Menu</Link>
          </div>
        </div>

        {/* ── Source pills ────────────────────────────────── */}
        <div className="source-bar">
          {SOURCES.map(s => (
            <button
              key={s.id}
              className={`src-pill${activeSource === s.id ? ' active' : ''}`}
              onClick={() => setActiveSource(s.id)}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* ── Top stats ───────────────────────────────────── */}
        <div className="top-grid">

          {/* Today */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Today's Performance</span>
              <span className="live-badge"><span className="live-dot" />Live</span>
            </div>
            <div className="stat-grid">
              <StatTile label="Revenue" value={`₹${fmt(today.totalRevenue)}`} />
              <StatTile label="Profit" value={`₹${fmt(Math.round(today.totalProfit))}`} color="var(--green)" />
              <StatTile label="Orders" value={today.totalOrders} color="var(--blue)" />
              <StatTile label="Active Now" value={today.activeOrders} color="var(--yellow)" />
            </div>
          </div>

          {/* 30-day */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">30-Day Overview</span>
              <Link to="/admin/analytics" className="btn btn-ghost">Insights →</Link>
            </div>
            <div className="stat-grid">
              <StatTile label="Revenue" value={`₹${fmt(month.totalRevenue)}`} />
              <StatTile label="Profit" value={`₹${fmt(Math.round(month.totalProfit))}`} color="var(--green)" />
              <StatTile label="Orders" value={month.totalOrders} color="var(--purple)" />
              <StatTile label="Avg Ticket" value={`₹${fmt(avgTicket)}`} color="var(--orange)" />
            </div>
          </div>

        </div>

        {/* ── Middle row ──────────────────────────────────── */}
        <div className="mid-grid">

          {/* Active orders table */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 14 }}>
              <span className="card-title">⚡ Active Orders</span>
              <Link to="/admin/orders" className="btn btn-ghost">View All</Link>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Table</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.length === 0 ? (
                    <tr className="empty-row"><td colSpan={6}>No active orders right now</td></tr>
                  ) : filteredActive.map(o => (
                    <tr key={o._id}>
                      <td className="td-id">#{o._id.slice(-6).toUpperCase()}</td>
                      <td>{o.tableNumber || '—'}</td>
                      <td><span className={`badge ${SOURCE_BADGE[o.source]}`}>{o.source}</span></td>
                      <td className="td-amt">₹{o.totalAmount}</td>
                      <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                      <td>
                        {o.paymentStatus === 'paid' ? (
                          <span className="badge badge-green">Paid</span>
                        ) : (
                          <select className="pay-select" defaultValue="" onChange={e => updatePayment(o._id, e.target.value)}>
                            <option value="" disabled>Pay…</option>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick access */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <span className="card-title">Quick Access</span>
            </div>
            <div className="quick-grid">
              {QUICK_LINKS.map(q => (
                <Link key={q.to} to={q.to} className="quick-tile">
                  <span className="quick-icon">{q.icon}</span>
                  <span className="quick-label">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* ── Recent transactions ──────────────────────────── */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 14 }}>
            <span className="card-title">Recent Transactions</span>
            <Link to="/admin/orders" className="btn btn-ghost">Full History</Link>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Table</th>
                  <th>Source</th>
                  <th className="hide-mobile">Items</th>
                  <th>Amount</th>
                  <th>Profit</th>
                  <th className="hide-mobile">Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.length === 0 ? (
                  <tr className="empty-row"><td colSpan={8}>No recent transactions</td></tr>
                ) : filteredRecent.map(o => (
                  <tr key={o._id}>
                    <td className="td-id">#{o._id.slice(-6).toUpperCase()}</td>
                    <td>{o.tableNumber || '—'}</td>
                    <td><span className={`badge ${SOURCE_BADGE[o.source]}`}>{o.source}</span></td>
                    <td className="hide-mobile">{o.items.length} items</td>
                    <td className="td-amt">₹{o.totalAmount}</td>
                    <td className="td-profit">₹{Math.round(o.profit)}</td>
                    <td className="hide-mobile"><span className={`badge ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td style={{ color: 'var(--text-lo)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {format(new Date(o.createdAt), 'HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}