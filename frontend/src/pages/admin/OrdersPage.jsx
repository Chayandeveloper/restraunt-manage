import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Modal from '../../components/Modal';

const SOURCE_COLORS = {
  direct: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', label: 'Direct' },
  zomato: { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)', label: 'Zomato' },
  swiggy: { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', label: 'Swiggy' },
};

const STATUS_CONFIG = {
  pending:   { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', icon: '⏳', label: 'Pending' },
  preparing: { bg: 'var(--color-background-info)',    color: 'var(--color-text-info)',    icon: '🔥', label: 'Preparing' },
  ready:     { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', icon: '✓', label: 'Ready' },
  completed: { bg: 'var(--color-background-secondary)',color: 'var(--color-text-secondary)',icon: '✅',label: 'Completed' },
};

export function printReceipt(order, restaurantName = 'Spice Garden') {
  const w = window.open('', '_blank', 'width=400,height=600');
  const items = order.items.map(i =>
    `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${i.price * i.quantity}</td></tr>`
  ).join('');
  w.document.write(`
    <!DOCTYPE html><html><head>
    <title>Receipt #${order._id.slice(-6).toUpperCase()}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Courier New',monospace; font-size:13px; padding:20px; max-width:320px; }
      h1 { text-align:center; font-size:18px; margin-bottom:4px; }
      .center { text-align:center; }
      .divider { border-top:1px dashed #000; margin:10px 0; }
      table { width:100%; border-collapse:collapse; }
      th { font-weight:bold; border-bottom:1px solid #000; padding:4px 0; }
      td { padding:3px 0; }
      .total { font-size:16px; font-weight:bold; }
      .footer { text-align:center; margin-top:16px; font-size:11px; }
    </style></head><body>
    <h1>${restaurantName}</h1>
    <div class="center" style="font-size:11px;color:#666;margin-bottom:8px">${format(new Date(order.createdAt),'dd MMM yyyy, hh:mm a')}</div>
    <div class="divider"></div>
    <div style="font-size:12px;margin-bottom:6px">
      <div>Order: #${order._id.slice(-6).toUpperCase()}</div>
      <div>${order.tableNumber ? `Table: ${order.tableNumber}` : `Source: ${order.source}`}</div>
      <div>Payment: ${order.paymentMethod?.toUpperCase()} · ${order.paymentStatus}</div>
    </div>
    <div class="divider"></div>
    <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amt</th></tr></thead><tbody>${items}</tbody></table>
    <div class="divider"></div>
    <table>
      <tr><td>Subtotal</td><td style="text-align:right">₹${order.totalAmount}</td></tr>
      <tr class="total"><td>TOTAL</td><td style="text-align:right">₹${order.totalAmount}</td></tr>
    </table>
    <div class="footer">Thank you for dining with us! 🙏</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>
  `);
  w.document.close();
}

function Badge({ text, bg, color, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: bg, color, letterSpacing: '0.02em', ...style
    }}>
      {text}
    </span>
  );
}

function StatCard({ label, revenue, count, accent, icon }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1.1rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: 6,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: accent, lineHeight: 1.1 }}>
        ₹{revenue.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {count} order{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function FilterBar({ filter, setFilter }) {
  const inputStyle = {
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 'var(--border-radius-md)',
    padding: '6px 12px', fontSize: 13,
    color: 'var(--color-text-primary)',
    height: 36, outline: 'none',
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
      padding: '14px 20px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Date</label>
        <input type="date" value={filter.date} style={inputStyle}
          onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Status</label>
        <select value={filter.status} style={inputStyle}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Source</label>
        <select value={filter.source} style={inputStyle}
          onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}>
          <option value="">All</option>
          <option value="direct">Direct</option>
          <option value="zomato">Zomato</option>
          <option value="swiggy">Swiggy</option>
        </select>
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, updateStatus, updatePayment }) {
  const src = SOURCE_COLORS[order.source] || {};
  const st = STATUS_CONFIG[order.status] || {};

  return (
    <div
      onClick={() => onClick(order)}
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-primary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 3 }}>
            #{order._id.slice(-6).toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {order.tableNumber ? `Table ${order.tableNumber}` : 'Online'}
            {' · '}
            {format(new Date(order.createdAt), 'hh:mm a')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <Badge text={src.label} bg={src.bg} color={src.color} />
          <Badge text={st.label} bg={st.bg} color={st.color} />
        </div>
      </div>

      {/* Items */}
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {order.items.map((i, idx) => (
          <span key={idx}>
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{i.quantity}×</span>
            {i.name}{idx < order.items.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>
          ₹{order.totalAmount}
        </div>
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
          {order.paymentStatus === 'paid' ? (
            <Badge
              text={`✓ ${order.paymentMethod?.toUpperCase()}`}
              bg="var(--color-background-success)"
              color="var(--color-text-success)"
            />
          ) : (
            <select
              style={{
                fontSize: 11, padding: '4px 8px', height: 28,
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-primary)',
              }}
              onChange={e => e.target.value && updatePayment(order._id, 'paid', e.target.value)}
            >
              <option value="">Mark paid</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          )}
          <select
            style={{
              fontSize: 11, padding: '4px 8px', height: 28,
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-tertiary)',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)',
            }}
            value={order.status}
            onClick={e => e.stopPropagation()}
            onChange={e => updateStatus(order._id, e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function OrderTable({ orders, onSelect, updateStatus, updatePayment }) {
  if (orders.length === 0) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <p style={{ fontWeight: 500 }}>No orders found for this selection</p>
      </div>
    );
  }

  const thStyle = {
    padding: '10px 16px', fontSize: 11, fontWeight: 500,
    color: 'var(--color-text-secondary)', textAlign: 'left',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    whiteSpace: 'nowrap', background: 'var(--color-background-secondary)',
  };

  const tdStyle = {
    padding: '11px 16px', fontSize: 13,
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 680 }}>
        <colgroup>
          <col style={{ width: 100 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: '1fr', minWidth: 150 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 75 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>Order</th>
            <th style={thStyle}>Dest</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Items</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Payment</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const src = SOURCE_COLORS[o.source] || {};
            return (
              <tr
                key={o._id}
                onClick={() => onSelect(o)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  #{o._id.slice(-6).toUpperCase()}
                </td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>
                  {o.tableNumber ? `T${o.tableNumber}` : <span style={{ color: 'var(--color-text-secondary)' }}>Online</span>}
                </td>
                <td style={tdStyle}>
                  <Badge text={src.label} bg={src.bg} color={src.color} />
                </td>
                <td style={{ ...tdStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                  {o.items.map((i, idx) => (
                    <span key={idx}>
                      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{i.quantity}×</span>
                      {i.name}{idx < o.items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>₹{o.totalAmount}</td>
                <td onClick={e => e.stopPropagation()} style={{ ...tdStyle, textAlign: 'center' }}>
                  {o.paymentStatus === 'paid' ? (
                    <Badge
                      text={`✓ ${o.paymentMethod?.toUpperCase()}`}
                      bg="var(--color-background-success)"
                      color="var(--color-text-success)"
                    />
                  ) : (
                    <select
                      style={{
                        fontSize: 11, padding: '4px 8px', width: '100%', height: 28,
                        borderRadius: 'var(--border-radius-md)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)',
                      }}
                      onChange={e => e.target.value && updatePayment(o._id, 'paid', e.target.value)}
                    >
                      <option value="">Mark paid…</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                    </select>
                  )}
                </td>
                <td onClick={e => e.stopPropagation()} style={{ ...tdStyle, textAlign: 'center' }}>
                  <select
                    style={{
                      fontSize: 11, padding: '4px 8px', width: '100%', height: 28,
                      borderRadius: 'var(--border-radius-md)',
                      border: '0.5px solid var(--color-border-tertiary)',
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                    value={o.status}
                    onChange={e => updateStatus(o._id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {format(new Date(o.createdAt), 'hh:mm a')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailModal({ order, updateStatus, updatePayment, onClose }) {
  const src = SOURCE_COLORS[order.source] || {};
  const st = STATUS_CONFIG[order.status] || {};

  const fieldStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)',
    fontSize: 13,
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 32 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <button
            onClick={() => printReceipt(order)}
            style={{
              fontSize: 12, padding: '5px 12px',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            🖨 Print receipt
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Meta row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)', padding: '14px 16px',
        }}>
          {[
            { label: 'Status', el: <Badge text={st.label} bg={st.bg} color={st.color} /> },
            { label: 'Source', el: <Badge text={src.label} bg={src.bg} color={src.color} /> },
            { label: 'Time', el: <span style={{ fontWeight: 500, fontSize: 13 }}>{format(new Date(order.createdAt), 'hh:mm a')}</span> },
          ].map(({ label, el }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              {el}
            </div>
          ))}
        </div>

        {/* Items */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Items · {order.items.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {order.items.map((item, i) => (
              <div key={i} style={fieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: 'var(--color-background-info)', color: 'var(--color-text-info)',
                    borderRadius: 'var(--border-radius-md)', width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 500, flexShrink: 0,
                  }}>
                    {item.quantity}
                  </span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0 0', marginTop: 4,
          }}>
            <span style={{ fontWeight: 500, fontSize: 15 }}>Total</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1 }}>₹{order.totalAmount}</div>
              {order.paymentMethod && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                  via {order.paymentMethod.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'grid', gridTemplateColumns: order.paymentStatus !== 'paid' ? '1fr 1fr' : '1fr',
          gap: 10,
          paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Update status</label>
            <select
              value={order.status}
              onChange={e => updateStatus(order._id, e.target.value)}
              style={{
                height: 40, fontSize: 13, padding: '0 12px',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {order.paymentStatus !== 'paid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Mark payment</label>
              <select
                onChange={e => e.target.value && updatePayment(order._id, 'paid', e.target.value)}
                style={{
                  height: 40, fontSize: 13, padding: '0 12px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Choose method…</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const BREAKPOINT_SM = 480;
const BREAKPOINT_MD = 768;

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({
    status: '', source: '', paymentMethod: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const width = useWindowWidth();
  const isMobile = width < BREAKPOINT_MD;

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
      if (selectedOrder?._id === id) setSelectedOrder(prev => ({ ...prev, status }));
      toast.success('Status updated');
    } catch { toast.error('Error'); }
  };

  const updatePayment = async (id, paymentStatus, paymentMethod) => {
    try {
      await api.put(`/orders/${id}/payment`, { paymentStatus, paymentMethod });
      fetchOrders();
      if (selectedOrder?._id === id) setSelectedOrder(prev => ({ ...prev, paymentStatus, paymentMethod }));
      toast.success(`Paid via ${paymentMethod.toUpperCase()}`);
    } catch { toast.error('Error'); }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.paymentStatus === 'paid' ? o.totalAmount : 0), 0);
  const sourceStats = ['direct', 'zomato', 'swiggy'].map(src => ({
    src,
    revenue: orders.filter(o => o.source === src && o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0),
    count: orders.filter(o => o.source === src).length,
  }));

  const statCards = [
    { label: 'Direct orders', revenue: sourceStats[0].revenue, count: sourceStats[0].count, accent: 'var(--color-text-success)', icon: '🏠' },
    { label: 'Zomato sales', revenue: sourceStats[1].revenue, count: sourceStats[1].count, accent: 'var(--color-text-danger)', icon: '🔴' },
    { label: 'Swiggy sales', revenue: sourceStats[2].revenue, count: sourceStats[2].count, accent: 'var(--color-text-warning)', icon: '🟠' },
    { label: 'Net revenue', revenue: totalRevenue, count: orders.length, accent: 'var(--color-text-info)', icon: '💰' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: isMobile ? '16px' : '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
            Order history
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage and track all restaurant transactions
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, padding: '7px 14px', height: 36,
            borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(2, minmax(0, 1fr))'
          : 'repeat(4, minmax(0, 1fr))',
        gap: 10,
      }}>
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Main panel */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
      }}>
        <FilterBar filter={filter} setFilter={setFilter} />

        {loading ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: 13, marginTop: 12, fontWeight: 500 }}>Fetching orders…</div>
          </div>
        ) : isMobile ? (
          /* Mobile: card list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px' }}>
            {orders.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 36 }}>📋</div>
                <p style={{ marginTop: 12, fontWeight: 500 }}>No orders found</p>
              </div>
            ) : orders.map(o => (
              <OrderCard
                key={o._id}
                order={o}
                onClick={setSelectedOrder}
                updateStatus={updateStatus}
                updatePayment={updatePayment}
              />
            ))}
          </div>
        ) : (
          /* Desktop: table */
          <OrderTable
            orders={orders}
            onSelect={setSelectedOrder}
            updateStatus={updateStatus}
            updatePayment={updatePayment}
          />
        )}

        {/* Footer */}
        {orders.length > 0 && (
          <div style={{
            padding: '10px 20px',
            borderTop: '0.5px solid var(--color-border-tertiary)',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} · ₹{totalRevenue.toLocaleString()} collected
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          updateStatus={updateStatus}
          updatePayment={updatePayment}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}