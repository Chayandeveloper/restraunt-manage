import { format } from 'date-fns';
import SwipeToPay from './SwipeToPay';
import { useState } from 'react';

const SOURCE_COLORS = { direct: 'badge-green', zomato: 'badge-red', swiggy: 'badge-orange' };
const STATUS_COLORS = { pending: 'badge-yellow', preparing: 'badge-blue', ready: 'badge-green', completed: 'badge-gray' };
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

  const handleSwipe = () => {
    onPaymentChange(order._id, 'paid', selectedMethod);
  };
  return (
    <div className="premium-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
              {order.tableNumber ? `Table ${order.tableNumber}` : 'Online'}
            </span>
            <span className={`badge ${SOURCE_COLORS[order.source]}`} style={{ fontSize: 10 }}>{order.source}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
            #{order._id.slice(-6).toUpperCase()} · {format(new Date(order.createdAt), 'hh:mm a')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${STATUS_COLORS[order.status]}`} style={{ padding: '6px 12px' }}>{order.status}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(order)} title="Print Receipt" style={{ width: 36, height: 36, padding: 0 }}>🖨️</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div className="flex flex-col gap-2">
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

        {order.notes && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--accent-dim2)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 500, borderLeft: '3px solid var(--accent)' }}>
            📝 Note: {order.notes}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {PAY_ICONS[order.paymentMethod]} {order.paymentMethod?.toUpperCase()}
            {order.commissionPercent > 0 && <span style={{ marginLeft: 8 }}>· {order.commissionPercent}% fee</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>₹{order.totalAmount}</div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex gap-3">
              {order.status !== 'completed' && onStatusChange && (
                <select className="status-select" style={{ flex: 1, height: 48 }} value={order.status} onChange={e => onStatusChange(order._id, e.target.value)}>
                  {order.status === 'pending' && <option value="pending">⏳ Pending</option>}
                  <option value="preparing">🔥 Preparing</option>
                  <option value="ready">✓ Ready</option>
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
}
