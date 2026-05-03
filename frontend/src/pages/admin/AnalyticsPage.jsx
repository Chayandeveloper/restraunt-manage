import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = { direct: '#22c55e', zomato: '#ef4444', swiggy: '#f97316' };
const PIE_COLORS = ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#a855f7'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.name.toLowerCase().includes('revenue') || p.name.toLowerCase().includes('profit') ? `₹${p.value?.toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setLoading(true);
    api.get(`/analytics?startDate=${startDate}&endDate=${endDate}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data) return null;

  const s = data.summary || {};
  const chartData = data.ordersPerDay.map(d => ({
    date: d._id.slice(5),
    Revenue: Math.round(d.revenue),
    Profit: Math.round(d.profit),
    Orders: d.count,
  }));

  const sourceData = data.revenueBySource.map(d => ({
    name: d._id.charAt(0).toUpperCase() + d._id.slice(1),
    value: d.revenue,
    profit: d.profit,
    count: d.count,
  }));

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    orders: data.peakHours.find(p => p._id === h)?.count || 0,
  })).slice(8, 23);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Business performance insights</p>
        </div>
        <div className="flex gap-3 items-end flex-wrap-mobile w-full-mobile">
          <div className="flex flex-col gap-1 flex-1-mobile">
            <span className="form-label" style={{ marginBottom: 0 }}>From</span>
            <input type="date" className="form-input" style={{ height: 40 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 flex-1-mobile">
            <span className="form-label" style={{ marginBottom: 0 }}>To</span>
            <input type="date" className="form-input" style={{ height: 40 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-secondary flex-1-mobile" style={{ height: 40 }} onClick={fetchAnalytics}>Apply</button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{(s.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-label">Net Profit</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>₹{Math.round(s.totalProfit || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧾</div>
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{s.totalOrders || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-label">Avg Order</div>
            <div className="stat-value">₹{s.totalOrders ? Math.round(s.totalRevenue / s.totalOrders) : 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Margin</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              {s.totalRevenue ? Math.round((s.totalProfit / s.totalRevenue) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Revenue/Profit trend */}
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <div className="chart-title">Revenue & Profit Trend</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Revenue" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Profit" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-grid" style={{ marginBottom: 16 }}>
          {/* Source breakdown */}
          <div className="chart-card">
            <div className="chart-title">Revenue by Source</div>
            {sourceData.length === 0
              ? <div className="empty-state"><div className="empty-icon">📊</div><p>No completed orders</p></div>
              : <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12 }}>
                    {sourceData.map((s, i) => (
                      <div key={s.name} className="profit-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i] }} />
                          <span>{s.name} ({s.count} orders)</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 700 }}>₹{s.value.toLocaleString()}</span>
                          <span style={{ color: 'var(--green)', fontSize: 11, marginLeft: 8 }}>₹{Math.round(s.profit).toLocaleString()} profit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* Peak hours */}
          <div className="chart-card">
            <div className="chart-title">Peak Hours</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders per day bar */}
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <div className="chart-title">Orders Per Day</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table usage */}
        {data.tableUsage.length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Table Performance</div></div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Table</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.tableUsage.map(t => (
                    <tr key={t._id}>
                      <td><strong>Table {t._id}</strong></td>
                      <td>{t.count}</td>
                      <td>₹{t.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
