import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_NEXT = { pending: 'completed' };
const STATUS_LABEL = { pending: '✅ Complete & Serve' };
const STATUS_BTN_CLS = { pending: 'btn-success' };

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 550].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      o.start(ctx.currentTime + i * 0.15);
      o.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch (e) {}
}

export default function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [ticker, setTicker] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const paramMap = { active: 'status=pending', completed: 'status=completed', all: '' };
      const r = await api.get(`/orders?${paramMap[filter] || ''}&limit=60`);
      if (!mountedRef.current) return;
      const newOrders = r.data.orders || [];
      const newPending = newOrders.filter(o => o.status === 'pending').length;
      if (newPending > lastCount && lastCount >= 0) {
        beep();
        if (newPending > lastCount) toast('🆕 New order received!', { icon: '🔔', duration: 3000 });
      }
      setLastCount(newPending);
      setOrders(newOrders);
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filter, lastCount]);

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 8000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(newStatus === 'completed' ? 'Order completed!' : `Marked as ${newStatus}`);
      fetchOrders();
    } catch { toast.error('Error updating status'); }
  };

  const activeOrders = orders.filter(o => o.status === 'pending');

  const displayOrders = filter === 'active' ? activeOrders
    : orders;

  function getElapsed(createdAt) {
    const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
    return mins;
  }

  function elapsedColor(mins) {
    if (mins < 10) return 'var(--green)';
    if (mins < 20) return 'var(--yellow)';
    return 'var(--red)';
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: -0.5 }}>
              👨‍🍳 Kitchen Display
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {format(new Date(), 'EEEE · hh:mm a')} · Auto-refresh every 8s
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(234,179,8,0.3)', color: 'var(--yellow)', padding: '6px 14px', borderRadius: 99, fontSize: 14, fontWeight: 800 }}>
              ⏳ {activeOrders.length} Pending
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLastCount(-1); fetchOrders(); }}>⟳ Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/login'); }}>⏻ Exit</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        {[
          { id: 'active', label: '⏳ New Orders', count: activeOrders.length, accent: 'var(--yellow)' },
          { id: 'all', label: 'All Active', count: orders.length, accent: 'var(--text-muted)' },
        ].map(f => (
          <button key={f.id}
            className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.id)}
            style={filter === f.id ? {} : { borderColor: 'var(--border)' }}>
            {f.label}
            <span style={{ marginLeft: 8, background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)', borderRadius: 99, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {loading ? (
          <div className="flex-center" style={{ height: 300 }}><div className="spinner" /></div>
        ) : displayOrders.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>All caught up!</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>No orders in this queue right now.</div>
          </div>
        ) : (
          <div className="kitchen-grid">
            {displayOrders.map(order => {
              const mins = getElapsed(order.createdAt);
              return (
                <div key={order._id} className={`kitchen-card status-${order.status}`}
                  style={{ animation: order.status === 'pending' && mins < 1 ? 'fadeIn 0.4s ease' : 'none' }}>
                  <div className="kitchen-card-header">
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
                        {order.tableNumber
                          ? `Table ${order.tableNumber}`
                          : <span style={{ color: order.source === 'zomato' ? 'var(--red)' : 'var(--accent)' }}>
                              {order.source === 'zomato' ? '🔴' : '🟠'} {order.source.charAt(0).toUpperCase() + order.source.slice(1)}
                            </span>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        #{order._id.slice(-6).toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: elapsedColor(mins) }}>
                        {mins}m
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{format(new Date(order.createdAt), 'HH:mm')}</div>
                    </div>
                  </div>

                  <div className="kitchen-card-body">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="kitchen-item">
                        <span style={{ fontWeight: 500 }}>{item.name}</span>
                        <span className="item-qty">×{item.quantity}</span>
                      </div>
                    ))}

                    {order.notes && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--yellow-dim)', borderRadius: 6, fontSize: 12, color: 'var(--yellow)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', gap: 6 }}>
                        <span>📝</span><span>{order.notes}</span>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      {order.status !== 'completed' && (
                        <button
                          className={`btn ${STATUS_BTN_CLS[order.status]} btn-lg`}
                          style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
                          onClick={() => updateStatus(order._id, STATUS_NEXT[order.status])}
                        >
                          {STATUS_LABEL[order.status]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
