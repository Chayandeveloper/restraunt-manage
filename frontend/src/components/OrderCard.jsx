import { format } from 'date-fns';
import SwipeToPay from './SwipeToPay';
import { useState, useEffect } from 'react';
import Modal from './Modal';

const SOURCE_COLORS = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const STATUS_COLORS = { pending: 'badge-yellow', completed: 'badge-gray' };
const PAY_ICONS = { cash: '💵', upi: '📱', card: '💳' };

export function printReceipt(order, restaurantName = 'Restaurant') {
  const w = window.open('', '_blank', 'width=400,height=600');
  const items = order.items.map(i =>
    `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${i.price * i.quantity}</td></tr>`
  ).join('');

  w.document.write(`
    <!DOCTYPE html><html><head>
    <title>Receipt #${order._id.slice(-6).toUpperCase()}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 320px; }
      h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
      .center { text-align: center; }
      .divider { border-top: 1px dashed #000; margin: 10px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { font-weight: bold; border-bottom: 1px solid #000; padding: 4px 0; }
      td { padding: 3px 0; }
      .total { font-size: 16px; font-weight: bold; }
      .footer { text-align: center; margin-top: 16px; font-size: 11px; }
    </style></head><body>
    <h1>${restaurantName}</h1>
    <div class="center" style="font-size:11px; color:#666; margin-bottom:8px">
      ${format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
    </div>
    <div class="divider"></div>
    <div style="font-size:12px; margin-bottom:6px">
      <div>Order: #${order._id.slice(-6).toUpperCase()}</div>
      <div>${order.tableNumber ? `Table: ${order.tableNumber}` : `Source: ${order.source}`}</div>
      <div>Payment: ${order.paymentMethod?.toUpperCase()} · ${order.paymentStatus}</div>
    </div>
    <div class="divider"></div>
    <table>
      <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amt</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div class="divider"></div>
    <table>
      <tr><td>Subtotal</td><td style="text-align:right">₹${order.totalAmount}</td></tr>
      ${order.commissionPercent > 0 ? `<tr><td>Commission (${order.commissionPercent}%)</td><td style="text-align:right">-₹${Math.round(order.totalAmount * order.commissionPercent / 100)}</td></tr>` : ''}
      <tr class="total"><td>TOTAL</td><td style="text-align:right">₹${order.totalAmount}</td></tr>
    </table>
    <div class="footer">Thank you for dining with us!<br>Visit again soon 🙏</div>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>
  `);
  w.document.close();
}

export default function OrderCard({ order, onStatusChange, onPaymentChange, showActions = true }) {
  const [selectedMethod, setSelectedMethod] = useState(order.paymentMethod || 'cash');
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMob = () => setIsMobile(window.innerWidth < 640);
    checkMob();
    window.addEventListener('resize', checkMob);
    return () => window.removeEventListener('resize', checkMob);
  }, []);

  const handleSwipe = () => {
    onPaymentChange(order._id, 'paid', selectedMethod);
  };

  const OrderSummary = () => (
    <div className="premium-card" onClick={() => isMobile && setShowDetails(true)} style={{ cursor: isMobile ? 'pointer' : 'default' }}>
      <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
              {order.tableNumber ? `Table ${order.tableNumber}` : order.source.toUpperCase()}
            </span>
            <span className={`badge ${SOURCE_COLORS[order.source]}`} style={{ fontSize: 10 }}>{order.source}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
            #{order._id.slice(-6).toUpperCase()} · {format(new Date(order.createdAt), 'hh:mm a')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${STATUS_COLORS[order.status]}`} style={{ padding: '6px 12px' }}>{order.status}</span>
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); printReceipt(order) }} title="Print Receipt" style={{ width: 36, height: 36, padding: 0 }}>🖨️</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Only show items on desktop or when not collapsed */}
        {!isMobile && (
          <div className="flex flex-col gap-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center" style={{ fontSize: 14 }}>
                <div className="flex items-center gap-3">
                  <span className="badge" style={{ background: 'var(--bg-elevated)', minWidth: 24, height: 24, justifyContent: 'center', padding: 0 }}>{item.quantity}</span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {isMobile && (
          <div className="flex items-center justify-between mb-4" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
            <span>{order.items.length} Item{order.items.length > 1 ? 's' : ''} · View Details</span>
            <span>→</span>
          </div>
        )}

        {order.notes && (!isMobile) && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--accent-dim2)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 500, borderLeft: '3px solid var(--accent)' }}>
            📝 Note: {order.notes}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-4" style={{ borderTop: !isMobile ? '1px solid var(--border)' : 'none' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {PAY_ICONS[order.paymentMethod]} {order.paymentMethod?.toUpperCase()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>₹{order.totalAmount}</div>
        </div>

        {showActions && !isMobile && (
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex gap-3">
              {order.status !== 'completed' && onStatusChange && (
                <select className="status-select" style={{ flex: 1, height: 48 }} value={order.status} onChange={e => onStatusChange(order._id, e.target.value)}>
                  <option value="pending">⏳ Pending</option>
                  <option value="completed">✅ Completed</option>
                </select>
              )}
            </div>

            {onPaymentChange && (
              <div className="w-full">
                {order.paymentStatus === 'paid' ? (
                  <div className="badge badge-green" style={{ width: '100%', height: 52, justifyContent: 'center', borderRadius: 12, fontSize: 15 }}>
                    ✓ Order Paid via {order.paymentMethod?.toUpperCase()}
                  </div>
                ) : (
                  <div>
                    <div className="payment-method-selector">
                      {['cash', 'upi', 'card'].map(m => (
                        <button 
                          key={m} 
                          className={`pay-method-btn ${selectedMethod === m ? 'active' : ''}`}
                          onClick={() => setSelectedMethod(m)}
                        >
                          {PAY_ICONS[m]} {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <SwipeToPay onSwipe={handleSwipe} label={`Swipe to Pay ₹${order.totalAmount}`} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <OrderSummary />

      {showDetails && (
        <Modal title={`Order #${order._id.slice(-6).toUpperCase()}`} onClose={() => setShowDetails(false)}>
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center p-4 surface-card">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 700 }}>{order.status.toUpperCase()}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time</div>
                <div style={{ fontWeight: 700 }}>{format(new Date(order.createdAt), 'hh:mm a')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Table</div>
                <div style={{ fontWeight: 700 }}>{order.tableNumber || 'N/A'}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>ORDER ITEMS</h4>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 surface-card" style={{ borderRadius: 12 }}>
                  <div className="flex items-center gap-3">
                    <span className="badge" style={{ background: 'var(--accent)', color: '#fff', minWidth: 28, height: 28 }}>{item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="p-4" style={{ background: 'var(--accent-dim2)', borderRadius: 12, color: 'var(--accent)', fontWeight: 600 }}>
                📝 Note: {order.notes}
              </div>
            )}

            <div className="flex justify-between items-center p-5 surface-card" style={{ borderRadius: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Total Amount</span>
              <span style={{ fontWeight: 800, fontSize: 28, color: 'var(--accent)' }}>₹{order.totalAmount}</span>
            </div>

            <div className="flex flex-col gap-4">
              <h4 style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>UPDATE STATUS</h4>
              <div className="flex gap-2">
                {['pending', 'completed'].map(s => (
                  <button 
                    key={s}
                    className={`btn flex-1 p-3 text-[10px] ${order.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { onStatusChange?.(order._id, s); setShowDetails(false); }}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {!order.paymentStatus === 'paid' && (
              <div className="flex flex-col gap-4">
                <h4 style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>PAYMENT</h4>
                <div className="flex gap-2">
                  {['cash', 'upi', 'card'].map(m => (
                    <button 
                      key={m}
                      className={`btn flex-1 p-3 ${selectedMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedMethod(m)}
                    >
                      {PAY_ICONS[m]} {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button 
                  className="btn btn-primary btn-lg w-full" 
                  onClick={() => { handleSwipe(); setShowDetails(false); }}
                >
                  Mark as Paid (₹{order.totalAmount})
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
