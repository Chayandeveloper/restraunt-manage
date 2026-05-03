import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { printReceipt } from '../../components/OrderCard';

const SOURCE_COLORS = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const SOURCE_CHART_COLORS = { direct: '#22c55e', zomato: '#ef4444', swiggy: '#f97316' };

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: color || 'var(--text-primary)', letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function ShiftSummaryPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/orders/summary/today'),
      api.get(`/orders?date=${date}&limit=500`),
    ]).then(([s, o]) => {
      setData(s.data);
      setOrders(o.data);
    }).finally(() => setLoading(false));
  }, [date]);

  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = data?.hourly?.find(x => x._id === h);
    return { hour: `${String(h).padStart(2, '0')}:00`, orders: found?.count || 0, revenue: found?.revenue || 0 };
  }).filter(h => {
    const hr = parseInt(h.hour);
    return hr >= 8 && hr <= 23;
  });

  const unpaidOrders = orders.filter(o => o.paymentStatus === 'pending' && o.status !== 'completed');

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const s = data?.summary || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Shift Summary</div>
          <div className="page-subtitle">Daily operational report</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))}>← Prev</button>
          <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
          <button className="btn btn-secondary btn-sm" onClick={() => setDate(format(new Date(new Date(date).getTime() + 86400000), 'yyyy-MM-dd'))} disabled={date >= format(new Date(), 'yyyy-MM-dd')}>Next →</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 Summary</button>
          <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            🧾 All Orders ({orders.length})
          </button>
          {unpaidOrders.length > 0 && (
            <button className={`tab-btn ${activeTab === 'unpaid' ? 'active' : ''}`} onClick={() => setActiveTab('unpaid')}>
              ⚠️ Unpaid ({unpaidOrders.length})
            </button>
          )}
        </div>

        {activeTab === 'summary' && (
          <>
            {/* Top KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatBox label="Total Revenue" value={`₹${(s.totalRevenue || 0).toLocaleString()}`} sub={`${s.totalOrders || 0} orders`} color="var(--accent)" />
              <StatBox label="Net Profit" value={`₹${Math.round(s.totalProfit || 0).toLocaleString()}`} sub={s.totalRevenue ? `${Math.round((s.totalProfit / s.totalRevenue) * 100)}% margin` : '—'} color="var(--green)" />
              <StatBox label="Avg Order" value={`₹${Math.round(s.avgOrderValue || 0)}`} sub="Per transaction" />
              <StatBox label="Completed" value={s.completedOrders || 0} sub={`${s.activeOrders || 0} still active`} color="var(--blue)" />
              <StatBox label="Paid" value={s.paidOrders || 0} sub={`${s.unpaidOrders || 0} pending payment`} color="var(--green)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* By source */}
              <div className="card">
                <div className="card-header"><div className="card-title">Revenue by Source</div></div>
                <div className="card-body">
                  {(data?.bySource || []).length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No completed orders</div>
                    : data.bySource.map(s => (
                      <div key={s._id} className="profit-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${SOURCE_COLORS[s._id] || 'badge-gray'}`}>{s._id}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.count} orders</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 700 }}>₹{s.revenue.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 8 }}>₹{Math.round(s.profit).toLocaleString()} profit</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* By payment method */}
              <div className="card">
                <div className="card-header"><div className="card-title">Payment Methods</div></div>
                <div className="card-body">
                  {(data?.byPayment || []).length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payments</div>
                    : data.byPayment.map(p => (
                      <div key={p._id} className="profit-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{p._id === 'cash' ? '💵' : p._id === 'upi' ? '📱' : '💳'}</span>
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{p._id}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.count} orders</span>
                        </div>
                        <div style={{ fontWeight: 700 }}>₹{p.amount.toLocaleString()}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Hourly chart */}
            <div className="chart-card">
              <div className="chart-title">Hourly Activity</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => n === 'revenue' ? `₹${v}` : v}
                  />
                  <Bar yAxisId="left" dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} name="orders" />
                  <Bar yAxisId="right" dataKey="revenue" fill="var(--blue)" radius={[4, 4, 0, 0]} opacity={0.6} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} />Orders</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue)', opacity: 0.6 }} />Revenue</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>#</th><th>Table</th><th>Source</th><th>Items</th><th>Amount</th><th>Profit</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">🧾</div><p>No orders for this date</p></div></td></tr>}
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{format(new Date(o.createdAt), 'HH:mm')}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>#{o._id.slice(-5).toUpperCase()}</td>
                    <td style={{ fontWeight: 500 }}>{o.tableNumber || '—'}</td>
                    <td><span className={`badge ${SOURCE_COLORS[o.source]}`}>{o.source}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.items.map(i => `${i.quantity}×${i.name}`).join(', ')}</td>
                    <td><strong>₹{o.totalAmount}</strong></td>
                    <td style={{ color: 'var(--green)' }}>₹{Math.round(o.profit)}</td>
                    <td>
                      <span className={`badge ${o.paymentStatus === 'paid' ? 'badge-green' : 'badge-red'}`}>{o.paymentStatus}</span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{o.paymentMethod}</div>
                    </td>
                    <td>
                      <span className={`badge ${o.status === 'completed' ? 'badge-gray' : o.status === 'ready' ? 'badge-green' : o.status === 'preparing' ? 'badge-blue' : 'badge-yellow'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Print Receipt" onClick={() => printReceipt(o)}>🖨️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'unpaid' && (
          <div>
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
              ⚠️ {unpaidOrders.length} active order{unpaidOrders.length !== 1 ? 's' : ''} with pending payment totalling ₹{unpaidOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {unpaidOrders.map(o => (
                <div key={o._id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', background: 'var(--red-dim)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.tableNumber ? `Table ${o.tableNumber}` : o.source}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{o._id.slice(-6).toUpperCase()} · {format(new Date(o.createdAt), 'HH:mm')}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>₹{o.totalAmount}</div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    {o.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13, padding: '3px 0', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.quantity}× {item.name}</span><span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={() => printReceipt(o)}>🖨️ Print Bill</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
