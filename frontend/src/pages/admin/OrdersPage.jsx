import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SOURCE_COLORS = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const STATUS_COLORS = { pending: 'badge-yellow', preparing: 'badge-blue', ready: 'badge-green', completed: 'badge-gray' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({ status: '', source: '', paymentMethod: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.source) params.append('source', filter.source);
      if (filter.paymentMethod) params.append('paymentMethod', filter.paymentMethod);
      if (filter.date) params.append('date', filter.date);
      const r = await api.get(`/orders?${params}&limit=200`);
      setOrders(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchOrders();
      toast.success('Status updated');
    } catch { toast.error('Error'); }
  };

  const updatePayment = async (id, paymentStatus, paymentMethod) => {
    try {
      await api.put(`/orders/${id}/payment`, { paymentStatus, paymentMethod });
      fetchOrders();
      toast.success(`Paid via ${paymentMethod.toUpperCase()}`);
    } catch { toast.error('Error'); }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.paymentStatus === 'paid' ? o.totalAmount : 0), 0);
  const getSourceRevenue = (src) => orders.filter(o => o.source === src && o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0);
  const getSourceCount = (src) => orders.filter(o => o.source === src).length;

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">Manage and track all restaurant transactions</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={fetchOrders}>⟳ Refresh Feed</button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid mb-8">
          {[
            { label: 'Direct Orders', revenue: getSourceRevenue('direct'), count: getSourceCount('direct'), color: 'var(--green)', icon: '🏠' },
            { label: 'Zomato Sales', revenue: getSourceRevenue('zomato'), count: getSourceCount('zomato'), color: 'var(--red)', icon: '🔴' },
            { label: 'Swiggy Sales', revenue: getSourceRevenue('swiggy'), count: getSourceCount('swiggy'), color: 'var(--orange)', icon: '🟠' },
            { label: 'Net Revenue', revenue: totalRevenue, count: orders.length, color: 'var(--accent)', icon: '💰' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="stat-label" style={{ marginBottom: 0 }}>{s.label}</div>
                <span style={{ opacity: 0.5 }}>{s.icon}</span>
              </div>
              <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>₹{s.revenue.toLocaleString()}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                {s.count} Total Orders
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header flex flex-wrap gap-4 items-center justify-between" style={{ padding: '20px 24px' }}>
            <div className="flex gap-3 flex-wrap">
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Date:</span>
                <input type="date" className="form-input" style={{ width: 'auto', height: 40 }} value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Status:</span>
                <select className="form-select" style={{ width: 'auto', height: 40 }} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="preparing">🔥 Preparing</option>
                  <option value="ready">✓ Ready</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Source:</span>
                <select className="form-select" style={{ width: 'auto', height: 40 }} value={filter.source} onChange={e => setFilter({ ...filter, source: e.target.value })}>
                  <option value="">All Sources</option>
                  <option value="direct">🏠 Direct</option>
                  <option value="zomato">🔴 Zomato</option>
                  <option value="swiggy">🟠 Swiggy</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div style={{ padding: 80, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 16, color: 'var(--text-muted)', fontWeight: 500 }}>Fetching latest orders...</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Destination</th>
                    <th>Source</th>
                    <th>Order Items</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Profit</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 80, opacity: 0.5 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                        <p style={{ fontWeight: 600 }}>No orders found for this selection</p>
                      </td>
                    </tr>
                  ) : (
                    orders.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                          #{o._id.slice(-6).toUpperCase()}
                        </td>
                        <td>
                          {o.tableNumber ? (
                            <div className="flex items-center gap-2">
                              <span style={{ fontWeight: 700 }}>Table {o.tableNumber}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Online Order</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${SOURCE_COLORS[o.source]}`} style={{ minWidth: 80, justifyContent: 'center' }}>
                            {o.source}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.4 }} title={o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                            {o.items.map((i, idx) => (
                              <span key={idx}>
                                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{i.quantity}</span>×{i.name}{idx < o.items.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 800, textAlign: 'right', fontSize: 15 }}>₹{o.totalAmount}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 800, textAlign: 'right', fontSize: 15 }}>₹{Math.round(o.profit)}</td>
                        <td>
                          {o.paymentStatus === 'paid' ? (
                            <div className="badge badge-green" style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
                              <span>✓</span> {o.paymentMethod?.toUpperCase()}
                            </div>
                          ) : (
                            <select className="status-select" style={{ padding: '6px 12px', fontSize: 11, width: '100%' }} onChange={e => updatePayment(o._id, 'paid', e.target.value)}>
                              <option value="">Mark Paid...</option>
                              <option value="cash">💵 Cash</option>
                              <option value="upi">📱 UPI</option>
                              <option value="card">💳 Card</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <select className="status-select" style={{ padding: '6px 12px', fontSize: 11, width: '100%' }} value={o.status} onChange={e => updateStatus(o._id, e.target.value)}>
                            <option value="pending">⏳ Pending</option>
                            <option value="preparing">🔥 Preparing</option>
                            <option value="ready">✓ Ready</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                          {format(new Date(o.createdAt), 'hh:mm a')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
