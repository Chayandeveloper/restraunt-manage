import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import OrderCard, { printReceipt } from '../../components/OrderCard';

/* ─────────────────────────────────────────
   STAFF ORDERS  –  Premium Responsive UI
   ───────────────────────────────────────── */
export default function StaffOrders() {
  const [activeTab, setActiveTab]       = useState('new');
  const [tables, setTables]             = useState([]);
  const [categories, setCategories]     = useState([]);
  const [menuItems, setMenuItems]       = useState([]);
  const [liveOrders, setLiveOrders]     = useState([]);
  const [selTable, setSelTable]         = useState(null);
  const [selCat, setSelCat]             = useState('all');
  const [cart, setCart]                 = useState([]);
  const [source, setSource]             = useState('direct');
  const [commission, setCommission]     = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes]               = useState('');
  const [search, setSearch]             = useState('');
  const [confirming, setConfirming]     = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [liveFilter, setLiveFilter]     = useState('active');
  const [cartOpen, setCartOpen]         = useState(false);
  const [showAllLive, setShowAllLive]   = useState(false);

  /* ── Data fetchers ── */
  const fetchTables     = useCallback(() => api.get('/tables').then(r => setTables(r.data)), []);
  const fetchLiveOrders = useCallback(async () => {
    const map = { active: 'status=pending', preparing: 'status=preparing', ready: 'status=ready', all: '' };
    const r   = await api.get(`/orders?${map[liveFilter] || ''}&limit=100`);
    setLiveOrders(r.data);
  }, [liveFilter]);

  useEffect(() => {
    Promise.all([
      api.get('/tables'), api.get('/categories'), api.get('/menu-items?available=true'),
    ]).then(([t, c, m]) => { setTables(t.data); setCategories(c.data); setMenuItems(m.data); });
  }, []);

  useEffect(() => {
    if (activeTab === 'live') {
      fetchLiveOrders();
      const id = setInterval(fetchLiveOrders, 10000);
      return () => clearInterval(id);
    }
  }, [activeTab, fetchLiveOrders]);

  useEffect(() => {
    if (source === 'direct')  { setCommission(0);  setSelTable(null); }
    else if (source === 'zomato') setCommission(20);
    else if (source === 'swiggy') setCommission(18);
  }, [source]);

  /* ── Derived values ── */
  const filteredItems  = menuItems.filter(i => {
    if (selCat !== 'all' && i.categoryId?._id !== selCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const getQty         = id => cart.find(c => c.menuItemId === id)?.quantity || 0;
  const totalAmount    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const commissionAmt  = (totalAmount * commission) / 100;
  const profit         = totalAmount - commissionAmt;
  const pendingCount   = liveOrders.filter(o => o.status === 'pending').length;

  /* ── Cart helpers ── */
  const addToCart = item => setCart(prev => {
    const ex = prev.find(c => c.menuItemId === item._id);
    if (ex) return prev.map(c => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c);
    return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
  });
  const changeQty = (menuItemId, delta) =>
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));

  /* ── Actions ── */
  const placeOrder = async () => {
    if (!cart.length) return toast.error('Add items to the cart first');
    if (source === 'direct' && !selTable) return toast.error('Select a table for direct orders');
    setConfirming(true);
    try {
      const res = await api.post('/orders', {
        tableId: selTable?._id || null, source, items: cart,
        commissionPercent: commission, paymentMethod, notes,
      });
      setOrderSuccess(res.data);
      setCart([]); setNotes(''); setSelTable(null); setCartOpen(false);
      fetchTables();
      toast.success('Order sent to kitchen!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to place order');
    } finally { setConfirming(false); }
  };

  const updateOrderStatus = async (id, status) => {
    try { await api.put(`/orders/${id}/status`, { status }); fetchLiveOrders(); }
    catch { toast.error('Error updating status'); }
  };
  const updatePayment = async (id, paymentStatus, paymentMethod) => {
    try {
      await api.put(`/orders/${id}/payment`, { paymentStatus, paymentMethod });
      fetchLiveOrders();
      toast.success(`Paid via ${paymentMethod.toUpperCase()}`);
    } catch { toast.error('Error'); }
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>

      <div className="so-root">

        {/* ── Top Nav Bar ── */}
        <header className="so-header">
          <div className="so-tabs">
            <button
              className={`so-tab ${activeTab === 'new' ? 'so-tab--active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <span className="so-tab-icon">📝</span>
              <span>Take Order</span>
              {cart.length > 0 && <span className="so-badge so-badge--orange">{cart.length}</span>}
            </button>
            <button
              className={`so-tab ${activeTab === 'live' ? 'so-tab--active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              <span className="so-tab-icon">⚡</span>
              <span>Live</span>
              {pendingCount > 0 && <span className="so-badge so-badge--red">{pendingCount}</span>}
            </button>
          </div>

          {activeTab === 'new' && (
            <div className="so-source-tabs">
              {[
                { id: 'direct', label: '🏠', full: 'Dine-in' },
                { id: 'zomato', label: '🔴', full: 'Zomato' },
                { id: 'swiggy', label: '🟠', full: 'Swiggy' },
              ].map(s => (
                <button
                  key={s.id}
                  className={`so-source-btn ${source === s.id ? 'so-source-btn--active' : ''}`}
                  onClick={() => setSource(s.id)}
                >
                  {s.label} <span className="so-source-label">{s.full}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* ══════════════ NEW ORDER TAB ══════════════ */}
        {activeTab === 'new' && (
          <div className="so-body">

            {/* ── Left: Menu ── */}
            <section className="so-menu-col">

              {/* Category + Search */}
              <div className="so-menu-controls">
                <div className="so-cat-scroll">
                  <button
                    className={`so-cat-pill ${selCat === 'all' ? 'so-cat-pill--active' : ''}`}
                    onClick={() => setSelCat('all')}
                  >All</button>
                  {categories.map(c => (
                    <button
                      key={c._id}
                      className={`so-cat-pill ${selCat === c._id ? 'so-cat-pill--active' : ''}`}
                      onClick={() => setSelCat(c._id)}
                    >{c.name}</button>
                  ))}
                </div>
                <div className="so-search-wrap">
                  <span className="so-search-icon">🔍</span>
                  <input
                    className="so-search"
                    placeholder="Search dishes…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="so-search-clear" onClick={() => setSearch('')}>✕</button>
                  )}
                </div>
              </div>

              {/* Table picker - Dropdown Only */}
              {source === 'direct' && (
                <div className="so-table-section">
                  <div className="so-table-header">
                    <span className="so-section-label">Select Table</span>
                  </div>
                  <select
                    className={`so-table-select ${selTable ? 'so-table-select--active' : ''}`}
                    value={selTable?._id || ''}
                    onChange={e => {
                      const t = tables.find(t => t._id === e.target.value);
                      if (t && t.status === 'occupied') return toast.error('Table is occupied');
                      setSelTable(t || null);
                    }}
                  >
                    <option value="">Choose Table...</option>
                    {tables.map(t => (
                      <option key={t._id} value={t._id} disabled={t.status === 'occupied'}>
                        Table {t.tableNumber} ({t.capacity} seats) {t.status === 'occupied' ? '• Occupied' : '• Available'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Commission bar (Zomato/Swiggy) */}
              {source !== 'direct' && (
                <div className="so-commission-bar">
                  <div className="so-commission-field">
                    <label className="so-field-label">Commission %</label>
                    <div className="so-commission-input-wrap">
                      <input
                        type="number"
                        className="so-commission-input"
                        value={commission}
                        onChange={e => setCommission(parseFloat(e.target.value) || 0)}
                      />
                      <span className="so-pct">%</span>
                    </div>
                  </div>
                  {totalAmount > 0 && (
                    <div className="so-commission-stats">
                      <div className="so-stat so-stat--red">
                        <span>Commission</span>
                        <strong>−₹{commissionAmt.toFixed(0)}</strong>
                      </div>
                      <div className="so-stat so-stat--green">
                        <span>Profit</span>
                        <strong>₹{profit.toFixed(0)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Menu grid */}
              <div className="so-menu-grid">
                {filteredItems.length === 0 && (
                  <div className="so-empty">
                    <div className="so-empty-icon">🍽️</div>
                    <p>No items found</p>
                  </div>
                )}
                {filteredItems.map(item => {
                  const qty = getQty(item._id);
                  return (
                    <div
                      key={item._id}
                      className={`so-menu-card ${qty > 0 ? 'so-menu-card--sel' : ''} ${!item.isAvailable ? 'so-menu-card--unavail' : ''}`}
                      onClick={() => item.isAvailable && addToCart(item)}
                    >
                      <div className="so-menu-card-top">
                        <span className="so-menu-name">{item.name}</span>
                        {item.description && <span className="so-menu-desc">{item.description}</span>}
                      </div>
                      <div className="so-menu-card-bottom">
                        <span className="so-menu-price">₹{item.price}</span>
                        {qty > 0 ? (
                          <div className="so-qty" onClick={e => e.stopPropagation()}>
                            <button className="so-qty-btn" onClick={() => changeQty(item._id, -1)}>−</button>
                            <span className="so-qty-val">{qty}</span>
                            <button className="so-qty-btn" onClick={() => addToCart(item)}>+</button>
                          </div>
                        ) : (
                          <button className="so-add-btn">+ Add</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Right: Cart ── */}
            <aside className={`so-cart ${cartOpen ? 'so-cart--open' : ''}`}>
              <div className="so-cart-header" onClick={() => setCartOpen(v => !v)}>
                <div className="so-cart-title">
                  <span className="so-cart-icon">🛒</span>
                  <span>{selTable ? `Table ${selTable.tableNumber}` : 'Order'}</span>
                  {cart.length > 0 && <span className="so-badge so-badge--orange">{cart.length}</span>}
                </div>
                <div className="so-cart-header-right">
                  <span className="so-cart-total-sm">₹{profit.toFixed(0)}</span>
                  {cart.length > 0 && (
                    <button
                      className="so-clear-btn"
                      onClick={e => { e.stopPropagation(); setCart([]); }}
                    >Clear</button>
                  )}
                  <span className="so-close-icon-mob">✕</span>
                  <span className="so-chevron">{cartOpen ? '▼' : '▲'}</span>
                </div>
              </div>

              <div className="so-cart-body">
                {cart.length === 0 ? (
                  <div className="so-cart-empty">
                    <span style={{ fontSize: 36 }}>🥘</span>
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  <div className="so-cart-list">
                    {cart.map(item => (
                      <div key={item.menuItemId} className="so-cart-item">
                        <div className="so-cart-item-info">
                          <span className="so-cart-item-name">{item.name}</span>
                          <span className="so-cart-item-price">₹{item.price * item.quantity}</span>
                        </div>
                        <div className="so-qty">
                          <button className="so-qty-btn" onClick={() => changeQty(item.menuItemId, -1)}>−</button>
                          <span className="so-qty-val">{item.quantity}</span>
                          <button className="so-qty-btn" onClick={() => changeQty(item.menuItemId, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="so-cart-footer">
                {/* Totals */}
                <div className="so-totals">
                  <div className="so-total-row">
                    <span>Subtotal</span>
                    <span>₹{totalAmount}</span>
                  </div>
                  {commission > 0 && (
                    <div className="so-total-row so-total-row--red">
                      <span>Commission ({commission}%)</span>
                      <span>−₹{commissionAmt.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="so-total-row so-total-row--big">
                    <span>Total</span>
                    <span>₹{profit.toFixed(0)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="so-payment-section">
                  <span className="so-field-label">Payment Method</span>
                  <div className="so-payment-btns">
                    {[
                      { id: 'cash', icon: '💵', label: 'Cash' },
                      { id: 'upi',  icon: '📱', label: 'UPI'  },
                      { id: 'card', icon: '💳', label: 'Card' },
                    ].map(m => (
                      <button
                        key={m.id}
                        className={`so-pay-btn ${paymentMethod === m.id ? 'so-pay-btn--active' : ''}`}
                        onClick={() => setPaymentMethod(m.id)}
                      >
                        <span>{m.icon}</span>
                        <span className="so-pay-label">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="so-place-btn"
                  onClick={placeOrder}
                  disabled={confirming || !cart.length}
                >
                  {confirming ? '⏳ Placing…' : `🚀 Place Order · ₹${profit.toFixed(0)}`}
                </button>
              </div>
            </aside>

            {/* Mobile cart toggle FAB */}
            {/* Mobile Actions Bar */}
            <div className="so-mobile-actions">
              <button
                className="so-action-btn so-action-btn--cart"
                onClick={() => setCartOpen(v => !v)}
              >
                <span className="so-action-icon">🛒</span>
                <div className="so-action-text">
                  <span className="so-action-label">Cart</span>
                  <span className="so-action-val">{cart.length} Items</span>
                </div>
              </button>
              
              <button
                className="so-action-btn so-action-btn--place"
                onClick={placeOrder}
                disabled={confirming || !cart.length}
              >
                <div className="so-action-text">
                  <span className="so-action-label">{confirming ? 'Placing...' : 'Place Order'}</span>
                  <span className="so-action-val">₹{profit.toFixed(0)}</span>
                </div>
                <span className="so-action-icon">🚀</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ LIVE ORDERS TAB ══════════════ */}
        {activeTab === 'live' && (
          <div className="so-live">
            <div className="so-live-controls">
              <div className="so-live-filters">
                {[
                  { id: 'active',    label: '⏳', full: 'Pending'   },
                  { id: 'preparing', label: '🔥', full: 'Preparing' },
                  { id: 'ready',     label: '✅', full: 'Ready'     },
                  { id: 'all',       label: '📋', full: 'All Today' },
                ].map(f => (
                  <button
                    key={f.id}
                    className={`so-filter-btn ${liveFilter === f.id ? 'so-filter-btn--active' : ''}`}
                    onClick={() => setLiveFilter(f.id)}
                  >
                    <span>{f.label}</span>
                    <span className="so-filter-label">{f.full}</span>
                  </button>
                ))}
              </div>
              <button className="so-refresh-btn" onClick={fetchLiveOrders}>⟳ Refresh</button>
            </div>

            <div className="so-live-grid">
              {liveOrders.length === 0 ? (
                <div className="so-empty so-empty--live">
                  <span className="so-empty-icon">🥡</span>
                  <p>No orders yet</p>
                  <span>Orders will appear here when placed</span>
                </div>
              ) : (
                <>
                  {liveOrders
                    .slice(0, !showAllLive && typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : liveOrders.length)
                    .map(order => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onStatusChange={updateOrderStatus}
                        onPaymentChange={updatePayment}
                      />
                    ))}
                  {!showAllLive && liveOrders.length > 3 && (
                    <button className="so-show-all-btn" onClick={() => setShowAllLive(true)}>
                      Show all {liveOrders.length} orders ↓
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ ORDER SUCCESS MODAL ══════════════ */}
        {orderSuccess && (
          <Modal
            title="✅ Order Placed!"
            onClose={() => setOrderSuccess(null)}
            footer={
              <div className="so-modal-footer">
                <button className="so-modal-btn so-modal-btn--sec" onClick={() => printReceipt(orderSuccess)}>
                  🖨️ Print Receipt
                </button>
                <button className="so-modal-btn so-modal-btn--pri" onClick={() => setOrderSuccess(null)}>
                  Next Order →
                </button>
              </div>
            }
          >
            <div className="so-success-body">
              <div className="so-success-emoji">🎉</div>
              <div className="so-success-id">
                Order #{orderSuccess._id.slice(-6).toUpperCase()}
              </div>
              <p className="so-success-meta">
                {orderSuccess.tableNumber ? `Table ${orderSuccess.tableNumber}` : orderSuccess.source}
                {' · '}{orderSuccess.items.length} item{orderSuccess.items.length !== 1 ? 's' : ''}
              </p>
              <div className="so-success-items">
                {orderSuccess.items.map((i, idx) => (
                  <div key={idx} className="so-success-item">
                    <span>{i.quantity}× {i.name}</span>
                    <span>₹{i.price * i.quantity}</span>
                  </div>
                ))}
                <div className="so-success-total">
                  <span>Total Paid</span>
                  <strong>₹{orderSuccess.totalAmount}</strong>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const CSS = `
  /* ── Tokens ── */
  :root {
    --so-bg:         #0f1117;
    --so-surface:    #181c27;
    --so-card:       #1e2334;
    --so-border:     rgba(255,255,255,0.07);
    --so-accent:     #f97316;
    --so-accent2:    #fb923c;
    --so-green:      #22c55e;
    --so-red:        #ef4444;
    --so-blue:       #3b82f6;
    --so-text:       #f1f5f9;
    --so-muted:      #64748b;
    --so-muted2:     #94a3b8;
    --so-radius:     14px;
    --so-radius-sm:  8px;
    --so-shadow:     0 4px 24px rgba(0,0,0,0.4);
    --so-font:       'DM Sans', system-ui, sans-serif;
  }

  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  /* ── Root layout ── */
  .so-root {
    font-family: var(--so-font);
    background: var(--so-bg);
    color: var(--so-text);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  .so-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: var(--so-surface);
    border-bottom: 1px solid var(--so-border);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .so-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 4px; }

  .so-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; border: none;
    background: transparent; color: var(--so-muted2);
    font-family: var(--so-font); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .2s;
  }
  .so-tab-icon { font-size: 15px; }
  .so-tab:hover { color: var(--so-text); background: rgba(255,255,255,0.06); }
  .so-tab--active { background: var(--so-accent) !important; color: #fff !important; }

  .so-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; border-radius: 99px;
    font-size: 11px; font-weight: 700; padding: 0 6px;
  }
  .so-badge--orange { background: var(--so-accent); color: #fff; }
  .so-badge--red    { background: var(--so-red);    color: #fff; }

  .so-source-tabs { display: flex; gap: 4px; }
  .so-source-btn {
    display: flex; align-items: center; gap: 4px;
    padding: 7px 12px; border-radius: 8px; border: 1px solid var(--so-border);
    background: var(--so-card); color: var(--so-muted2);
    font-family: var(--so-font); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .2s;
  }
  .so-source-btn:hover { border-color: var(--so-accent); color: var(--so-text); }
  .so-source-btn--active { background: var(--so-accent); border-color: var(--so-accent); color: #fff; }
  .so-source-label { display: inline; }

  /* ── Body: new order layout ── */
  .so-body {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }

  /* ── Menu column ── */
  .so-menu-col {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--so-border);
  }

  .so-menu-controls {
    padding: 14px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }

  /* Categories */
  .so-cat-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .so-cat-scroll::-webkit-scrollbar { display: none; }
  .so-cat-pill {
    flex-shrink: 0; padding: 6px 14px;
    border-radius: 99px; border: 1px solid var(--so-border);
    background: var(--so-card); color: var(--so-muted2);
    font-family: var(--so-font); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .so-cat-pill:hover { border-color: var(--so-accent); color: var(--so-text); }
  .so-cat-pill--active { background: var(--so-accent); border-color: var(--so-accent); color: #fff; }

  /* Search */
  .so-search-wrap {
    position: relative; display: flex; align-items: center;
  }
  .so-search-icon { position: absolute; left: 12px; font-size: 14px; pointer-events: none; }
  .so-search {
    width: 100%; padding: 9px 36px 9px 36px;
    border-radius: var(--so-radius-sm); border: 1px solid var(--so-border);
    background: var(--so-card); color: var(--so-text);
    font-family: var(--so-font); font-size: 13px;
    outline: none; transition: border .2s;
  }
  .so-search:focus { border-color: var(--so-accent); }
  .so-search::placeholder { color: var(--so-muted); }
  .so-search-clear {
    position: absolute; right: 10px;
    background: none; border: none; color: var(--so-muted); cursor: pointer; font-size: 12px;
    padding: 4px;
  }

  /* Table section */
  .so-table-section {
    margin: 12px 16px 0;
    background: var(--so-card);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius);
    padding: 12px 14px;
    flex-shrink: 0;
  }
  .so-table-header {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .so-section-label { font-size: 11px; font-weight: 700; color: var(--so-muted2); text-transform: uppercase; letter-spacing: .06em; }
  .so-table-select {
    width: 100%;
    padding: 10px 14px;
    background: var(--so-surface);
    border: 1.5px solid var(--so-border);
    border-radius: var(--so-radius-sm);
    color: var(--so-text);
    font-family: var(--so-font);
    font-size: 14px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    transition: all .2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
  }
  .so-table-select:focus { border-color: var(--so-accent); }
  .so-table-select--active { border-color: var(--so-accent); background-color: rgba(249,115,22,0.05); }

  /* Commission bar */
  .so-commission-bar {
    margin: 12px 16px 0;
    background: var(--so-card);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius);
    padding: 12px 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    flex-shrink: 0;
  }
  .so-commission-field { display: flex; flex-direction: column; gap: 4px; }
  .so-field-label { font-size: 10px; font-weight: 700; color: var(--so-muted2); text-transform: uppercase; letter-spacing: .06em; }
  .so-commission-input-wrap { display: flex; align-items: center; gap: 6px; }
  .so-commission-input {
    width: 72px; padding: 7px 10px;
    border-radius: var(--so-radius-sm); border: 1px solid var(--so-border);
    background: var(--so-surface); color: var(--so-text);
    font-family: var(--so-font); font-size: 14px; font-weight: 700;
    outline: none; text-align: center;
  }
  .so-pct { font-weight: 700; color: var(--so-muted2); }
  .so-commission-stats { display: flex; gap: 20px; }
  .so-stat { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; }
  .so-stat span { color: var(--so-muted); }
  .so-stat strong { font-size: 15px; font-weight: 800; }
  .so-stat--red strong { color: var(--so-red); }
  .so-stat--green strong { color: var(--so-green); }

  /* Menu grid */
  .so-menu-grid {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px 80px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    align-content: start;
  }
  .so-menu-grid::-webkit-scrollbar { width: 4px; }
  .so-menu-grid::-webkit-scrollbar-track { background: transparent; }
  .so-menu-grid::-webkit-scrollbar-thumb { background: var(--so-border); border-radius: 99px; }

  .so-menu-card {
    background: var(--so-card);
    border: 1.5px solid var(--so-border);
    border-radius: var(--so-radius);
    padding: 12px;
    cursor: pointer;
    transition: all .18s;
    display: flex; flex-direction: column; justify-content: space-between;
    min-height: 90px;
  }
  .so-menu-card:hover:not(.so-menu-card--unavail) { border-color: var(--so-accent); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,.12); }
  .so-menu-card--sel { border-color: var(--so-accent); background: rgba(249,115,22,.07); }
  .so-menu-card--unavail { opacity: .4; cursor: not-allowed; }
  .so-menu-card-top { display: flex; flex-direction: column; gap: 3px; }
  .so-menu-name { font-size: 13px; font-weight: 700; color: var(--so-text); line-height: 1.3; }
  .so-menu-desc { font-size: 11px; color: var(--so-muted); line-height: 1.3; }
  .so-menu-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
  .so-menu-price { font-size: 15px; font-weight: 800; color: var(--so-accent); }
  .so-add-btn {
    padding: 5px 12px; border-radius: 99px;
    border: 1px solid var(--so-accent); color: var(--so-accent);
    background: transparent; font-family: var(--so-font); font-size: 11px; font-weight: 700;
    cursor: pointer; transition: all .15s;
  }
  .so-add-btn:hover { background: var(--so-accent); color: #fff; }

  /* Qty control */
  .so-qty {
    display: flex; align-items: center; gap: 2px;
    background: rgba(249,115,22,.12); border-radius: 99px; padding: 2px;
  }
  .so-qty-btn {
    width: 26px; height: 26px; border-radius: 99px; border: none;
    background: var(--so-accent); color: #fff;
    font-size: 16px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s; line-height: 1;
  }
  .so-qty-btn:hover { background: var(--so-accent2); transform: scale(1.08); }
  .so-qty-val { font-size: 13px; font-weight: 800; color: var(--so-accent); min-width: 22px; text-align: center; }

  /* ── Cart panel ── */
  .so-cart {
    display: flex; flex-direction: column;
    background: var(--so-surface);
    overflow: hidden;
  }
  .so-cart-header {
    padding: 14px 16px;
    border-bottom: 1px solid var(--so-border);
    cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .so-cart-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; }
  .so-cart-icon { font-size: 18px; }
  .so-cart-header-right { display: flex; align-items: center; gap: 8px; }
  .so-cart-total-sm { font-size: 16px; font-weight: 800; color: var(--so-accent); }
  .so-clear-btn {
    background: none; border: none; color: var(--so-red);
    font-family: var(--so-font); font-size: 12px; font-weight: 700;
    cursor: pointer; padding: 4px 8px; border-radius: 6px;
    transition: background .15s;
  }
  .so-clear-btn:hover { background: rgba(239,68,68,.1); }
  .so-chevron { font-size: 10px; color: var(--so-muted); display: none; }
  .so-close-icon-mob { display: none; font-size: 18px; color: var(--so-muted2); font-weight: 700; padding: 4px; }

  .so-cart-body { flex: 1; overflow-y: auto; padding: 12px; }
  .so-cart-body::-webkit-scrollbar { width: 3px; }
  .so-cart-body::-webkit-scrollbar-thumb { background: var(--so-border); border-radius: 99px; }
  .so-cart-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; height: 120px; color: var(--so-muted); font-size: 13px;
  }
  .so-cart-list { display: flex; flex-direction: column; gap: 6px; }
  .so-cart-item {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--so-card); border-radius: var(--so-radius-sm);
    padding: 10px 12px; gap: 8px;
  }
  .so-cart-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .so-cart-item-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .so-cart-item-price { font-size: 13px; font-weight: 700; color: var(--so-accent); }

  .so-cart-footer {
    padding: 12px;
    border-top: 1px solid var(--so-border);
    flex-shrink: 0;
  }

  .so-totals { background: var(--so-card); border-radius: var(--so-radius-sm); padding: 12px; margin-bottom: 12px; }
  .so-total-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: var(--so-muted2); padding: 3px 0;
  }
  .so-total-row--red span { color: var(--so-red); }
  .so-total-row--red { color: var(--so-red); }
  .so-total-row--big {
    font-size: 16px; font-weight: 800; color: var(--so-text);
    border-top: 1px solid var(--so-border); margin-top: 8px; padding-top: 8px;
  }
  .so-total-row--big span:last-child { color: var(--so-accent); font-size: 20px; }

  .so-payment-section { margin-bottom: 12px; }
  .so-payment-btns { display: flex; gap: 6px; margin-top: 6px; }
  .so-pay-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 8px 6px; border-radius: var(--so-radius-sm);
    border: 1.5px solid var(--so-border); background: var(--so-card);
    color: var(--so-muted2); font-family: var(--so-font); font-size: 16px;
    cursor: pointer; transition: all .18s;
  }
  .so-pay-btn:hover { border-color: var(--so-accent); color: var(--so-text); }
  .so-pay-btn--active { border-color: var(--so-accent); background: rgba(249,115,22,.12); color: var(--so-accent); }
  .so-pay-label { font-size: 10px; font-weight: 700; }

  .so-place-btn {
    width: 100%; padding: 14px;
    border-radius: var(--so-radius); border: none;
    background: var(--so-accent);
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: #fff; font-family: var(--so-font); font-size: 14px; font-weight: 800;
    cursor: pointer; transition: all .2s;
    box-shadow: 0 4px 16px rgba(249,115,22,.35);
  }
  .so-place-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(249,115,22,.5); }
  .so-place-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Mobile Actions Bar */
  .so-mobile-actions {
    display: none;
    position: fixed; bottom: 16px; left: 12px; right: 12px; z-index: 50;
    gap: 10px;
  }
  .so-action-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px; border-radius: 16px; border: none;
    font-family: var(--so-font); cursor: pointer; transition: all .2s;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .so-action-btn:active { transform: scale(0.96); }
  .so-action-btn--cart { background: var(--so-card); border: 1.5px solid var(--so-border); color: var(--so-text); }
  .so-action-btn--place { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
  .so-action-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  
  .so-action-icon { font-size: 20px; }
  .so-action-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1; }
  .so-action-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; opacity: .8; }
  .so-action-val { font-size: 15px; font-weight: 800; }
  .so-action-btn--place .so-action-text { align-items: flex-end; }

  /* ── Live tab ── */
  .so-live {
    flex: 1; overflow: hidden;
    display: flex; flex-direction: column;
    padding: 16px;
    gap: 16px;
  }
  .so-live-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
  .so-live-filters { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .so-live-filters::-webkit-scrollbar { display: none; }
  .so-filter-btn {
    display: flex; align-items: center; gap: 5px; flex-shrink: 0;
    padding: 8px 14px; border-radius: var(--so-radius-sm);
    border: 1px solid var(--so-border); background: var(--so-card);
    color: var(--so-muted2); font-family: var(--so-font); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .18s;
  }
  .so-filter-btn:hover { border-color: var(--so-accent); color: var(--so-text); }
  .so-filter-btn--active { background: var(--so-accent); border-color: var(--so-accent); color: #fff; }
  .so-filter-label { display: inline; }

  .so-refresh-btn {
    padding: 8px 16px; border-radius: var(--so-radius-sm);
    border: 1px solid var(--so-border); background: var(--so-card);
    color: var(--so-muted2); font-family: var(--so-font); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .18s; flex-shrink: 0;
  }
  .so-refresh-btn:hover { border-color: var(--so-blue); color: var(--so-text); }

  .so-live-grid {
    flex: 1; overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
    align-content: start;
    padding-right: 4px;
  }
  .so-live-grid::-webkit-scrollbar { width: 4px; }
  .so-live-grid::-webkit-scrollbar-thumb { background: var(--so-border); border-radius: 99px; }

  .so-show-all-btn {
    grid-column: 1 / -1;
    padding: 14px; border-radius: var(--so-radius);
    border: 1px dashed var(--so-border); background: none;
    color: var(--so-muted2); font-family: var(--so-font); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .18s;
  }
  .so-show-all-btn:hover { border-color: var(--so-accent); color: var(--so-accent); }

  /* Empty states */
  .so-empty {
    grid-column: 1 / -1;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 60px 0; color: var(--so-muted);
  }
  .so-empty-icon { font-size: 48px; }
  .so-empty p { font-size: 16px; font-weight: 700; color: var(--so-muted2); margin: 0; }
  .so-empty span { font-size: 13px; }
  .so-empty--live p { font-size: 20px; }

  /* Success modal */
  .so-success-body { display: flex; flex-direction: column; align-items: center; padding: 24px 0 0; }
  .so-success-emoji { font-size: 60px; animation: soBounce 1.5s infinite; }
  @keyframes soBounce {
    0%,100% { transform: translateY(0); }
    40%      { transform: translateY(-14px); }
    70%      { transform: translateY(-6px); }
  }
  .so-success-id { font-size: 22px; font-weight: 800; margin: 12px 0 4px; }
  .so-success-meta { font-size: 13px; color: var(--so-muted2); margin: 0 0 20px; }
  .so-success-items {
    width: 100%; background: var(--so-card);
    border-radius: var(--so-radius); padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .so-success-item { display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; }
  .so-success-total {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid var(--so-border); padding-top: 12px;
    margin-top: 4px; font-size: 15px; font-weight: 700;
  }
  .so-success-total strong { font-size: 22px; color: var(--so-accent); }

  .so-modal-footer { display: flex; gap: 10px; width: 100%; }
  .so-modal-btn {
    flex: 1; padding: 13px; border-radius: var(--so-radius); border: none;
    font-family: var(--so-font); font-size: 14px; font-weight: 700; cursor: pointer; transition: all .18s;
  }
  .so-modal-btn--sec { background: var(--so-card); border: 1px solid var(--so-border); color: var(--so-text); }
  .so-modal-btn--sec:hover { border-color: var(--so-accent); }
  .so-modal-btn--pri { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; box-shadow: 0 4px 14px rgba(249,115,22,.35); }
  .so-modal-btn--pri:hover { box-shadow: 0 6px 20px rgba(249,115,22,.5); transform: translateY(-1px); }

  /* ════════════════════════════════════════
     RESPONSIVE — md screens (≤ 900px)
  ════════════════════════════════════════ */
  @media (max-width: 900px) {
    .so-body { grid-template-columns: 1fr; }
    .so-menu-col { border-right: none; }
    .so-menu-grid { padding-bottom: 100px; }

    /* Cart becomes a bottom sheet on md */
    .so-cart {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
      max-height: 80vh; border-radius: 18px 18px 0 0;
      border-top: 1px solid var(--so-border);
      box-shadow: 0 -8px 40px rgba(0,0,0,.5);
      transform: translateY(calc(100% - 60px));
      transition: transform .32s cubic-bezier(.32,1,.5,1);
    }
    .so-cart--open { transform: translateY(0); }
    .so-cart-header { border-radius: 18px 18px 0 0; }
    .so-chevron { display: inline !important; }
    .so-cart-total-sm { display: inline; }
    .so-cart-fab { display: none !important; } /* sheet handles it */
  }

  /* ════════════════════════════════════════
     RESPONSIVE — sm screens (≤ 640px)
  ════════════════════════════════════════ */
  @media (max-width: 640px) {
    .so-header { padding: 8px 12px; gap: 8px; }
    .so-tab { padding: 6px 10px; font-size: 12px; }
    .so-tab-icon { font-size: 14px; }
    .so-source-label { display: none; } /* show only emoji on tiny screens */
    .so-source-btn { padding: 6px 10px; font-size: 14px; }

    .so-menu-controls { padding: 10px 12px 0; gap: 8px; }
    .so-menu-grid {
      grid-template-columns: 1fr 1fr;
      padding: 10px 12px 110px;
      gap: 8px;
    }
    .so-menu-card { padding: 10px; min-height: 80px; }
    .so-menu-name { font-size: 12px; }

    .so-table-section { margin: 10px 12px 0; padding: 10px 12px; }
    .so-table-tile { width: 52px; height: 52px; }
    .so-tile-num { font-size: 14px; }

    .so-commission-bar { margin: 10px 12px 0; flex-wrap: wrap; }

    /* On very small screens, use the actions bar but allow cart to open as fixed overlay */
    .so-cart { 
      display: none; 
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 100; max-height: 100vh; border-radius: 0;
    }
    .so-cart--open { display: flex !important; transform: none !important; }
    .so-close-icon-mob { display: inline !important; }
    .so-mobile-actions { display: flex !important; }

    /* Live tab */
    .so-live { padding: 12px; gap: 12px; }
    .so-live-grid { grid-template-columns: 1fr; }
    .so-filter-label { display: none; }
    .so-filter-btn { padding: 8px 10px; font-size: 16px; }
  }
`;
