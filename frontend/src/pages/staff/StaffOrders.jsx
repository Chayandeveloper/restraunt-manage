import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import OrderCard, { printReceipt } from '../../components/OrderCard';

export default function StaffOrders() {
  const [activeTab, setActiveTab] = useState('new');
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [selTable, setSelTable] = useState(null);
  const [selCat, setSelCat] = useState('all');
  const [cart, setCart] = useState([]);
  const [source, setSource] = useState('direct');
  const [commission, setCommission] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [liveFilter, setLiveFilter] = useState('active');
  const [cartExpanded, setCartExpanded] = useState(false);

  const fetchTables = useCallback(() => api.get('/tables').then(r => setTables(r.data)), []);
  const fetchLiveOrders = useCallback(async () => {
    const paramMap = { active: 'status=pending', preparing: 'status=preparing', ready: 'status=ready', all: '' };
    const r = await api.get(`/orders?${paramMap[liveFilter] || ''}&limit=100`);
    setLiveOrders(r.data);
  }, [liveFilter]);

  useEffect(() => {
    Promise.all([
      api.get('/tables'), api.get('/categories'), api.get('/menu-items?available=true'),
    ]).then(([t, c, m]) => {
      setTables(t.data); setCategories(c.data); setMenuItems(m.data);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'live') {
      fetchLiveOrders();
      const id = setInterval(fetchLiveOrders, 10000);
      return () => clearInterval(id);
    }
  }, [activeTab, fetchLiveOrders]);

  useEffect(() => {
    if (source === 'direct') { setCommission(0); setSelTable(null); }
    else if (source === 'zomato') setCommission(20);
    else if (source === 'swiggy') setCommission(18);
  }, [source]);

  const filteredItems = menuItems.filter(i => {
    if (selCat !== 'all' && i.categoryId?._id !== selCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item) => setCart(prev => {
    const ex = prev.find(c => c.menuItemId === item._id);
    if (ex) return prev.map(c => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c);
    return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
  });

  const changeQty = (menuItemId, delta) =>
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));

  const getQty = (id) => cart.find(c => c.menuItemId === id)?.quantity || 0;
  const totalAmount = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const commissionAmt = (totalAmount * commission) / 100;
  const profit = totalAmount - commissionAmt;

  const placeOrder = async () => {
    if (!cart.length) return toast.error('Add items to the cart first');
    if (source === 'direct' && !selTable) return toast.error('Select a table for direct orders');
    setConfirming(true);
    try {
      const res = await api.post('/orders', { tableId: selTable?._id || null, source, items: cart, commissionPercent: commission, paymentMethod, notes });
      setOrderSuccess(res.data);
      setCart([]); setNotes(''); setSelTable(null);
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
    }
    catch { toast.error('Error'); }
  };

  const pendingCount = liveOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="flex flex-col h-full overflow-hidden animate-slide-up">
      {/* Page Header */}
      <div className="layout-header premium-header">
        <div className="flex items-center justify-between w-full">
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>
              <span>📝</span> Take Order {cart.length > 0 && <span className="badge badge-orange" style={{ marginLeft: 8 }}>{cart.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
              <span>⚡</span> Live Orders {pendingCount > 0 && <span className="badge badge-orange" style={{ marginLeft: 8 }}>{pendingCount}</span>}
            </button>
          </div>

          {activeTab === 'new' && (
            <div className="flex items-center gap-3">
              <div className="tabs" style={{ padding: 4 }}>
                {['direct', 'zomato', 'swiggy'].map(s => (
                  <button key={s} 
                    className={`tab-btn ${source === s ? 'active' : ''}`} 
                    onClick={() => setSource(s)}
                    style={{ fontSize: 11, padding: '6px 14px' }}
                  >
                    {s === 'direct' ? '🏠 Home' : s === 'zomato' ? '🔴 Zomato' : '🟠 Swiggy'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="order-grid">
          <div className="menu-section">
            <div className="flex flex-col flex-1 overflow-hidden h-full">
              <div className="menu-header-sticky p-4 md:p-6 pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  {/* Category Selection: Dropdown on Mobile, Pills on Desktop */}
                  <div className="category-selection-container flex-1">
                    <div className="category-pills hidden-sm">
                      <button className={`category-pill ${selCat === 'all' ? 'active' : ''}`} onClick={() => setSelCat('all')}>All Items</button>
                      {categories.map(c => <button key={c._id} className={`category-pill ${selCat === c._id ? 'active' : ''}`} onClick={() => setSelCat(c._id)}>{c.name}</button>)}
                    </div>
                    <div className="show-sm">
                      <select className="form-select mobile-dropdown" value={selCat} onChange={e => setSelCat(e.target.value)}>
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="search-container">
                    <span className="search-icon">🔍</span>
                    <input className="form-input search-input" placeholder="Search dishes..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>

                {source === 'direct' && (
                  <div className="table-selection-container mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="form-label" style={{ marginBottom: 0 }}>Select Table</div>
                      <div className="flex gap-2 hidden-sm">
                        <div className="badge badge-green">Available</div>
                        <div className="badge badge-red">Occupied</div>
                      </div>
                    </div>
                    
                    {/* Desktop Table Grid */}
                    <div className="table-grid hidden-sm">
                      {tables.map(t => (
                        <div key={t._id} className={`table-tile ${t.status} ${selTable?._id === t._id ? 'selected' : ''}`}
                          onClick={() => t.status !== 'occupied' ? setSelTable(selTable?._id === t._id ? null : t) : toast.error('Table occupied')}>
                          <div className="tile-num">{t.tableNumber}</div>
                          <div className="tile-cap">👥 {t.capacity}</div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Table Dropdown */}
                    <div className="show-sm">
                      <select 
                        className={`form-select mobile-dropdown ${selTable ? 'selected-item' : ''}`}
                        value={selTable?._id || ''} 
                        onChange={e => {
                          const t = tables.find(t => t._id === e.target.value);
                          if (t && t.status === 'occupied') return toast.error('Table occupied');
                          setSelTable(t || null);
                        }}
                      >
                        <option value="">Choose Table...</option>
                        {tables.map(t => (
                          <option key={t._id} value={t._id} disabled={t.status === 'occupied'}>
                            Table {t.tableNumber} ({t.capacity} seats) {t.status === 'occupied' ? '• Occupied' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {source !== 'direct' && (
                <div className="px-4 md:px-6 mb-6">
                  <div className="glass-card p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="form-group">
                        <label className="form-label">Commission %</label>
                        <div className="flex items-center gap-2">
                          <input type="number" className="form-input" style={{ width: 80 }} value={commission} onChange={e => setCommission(parseFloat(e.target.value) || 0)} />
                          <span className="text-muted" style={{ fontWeight: 600 }}>%</span>
                        </div>
                      </div>
                    </div>
                    {totalAmount > 0 && (
                      <div className="flex gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="form-label">Comm.</div>
                          <div className="menu-card-price" style={{ color: 'var(--red)', fontSize: 14 }}>₹{commissionAmt.toFixed(0)}</div>
                        </div>
                        <div className="text-right">
                          <div className="form-label">Profit</div>
                          <div className="menu-card-price" style={{ color: 'var(--green)', fontSize: 14 }}>₹{profit.toFixed(0)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="menu-grid flex-1 px-4 md:px-6 pb-6">
                {filteredItems.map(item => {
                  const qty = getQty(item._id);
                  return (
                    <div key={item._id} 
                      className={`menu-card premium-card ${qty > 0 ? 'selected' : ''} ${!item.isAvailable ? 'unavailable' : ''}`} 
                      onClick={() => item.isAvailable && addToCart(item)}
                    >
                      <div>
                        <div className="menu-card-title">{item.name}</div>
                        {item.description && <div className="menu-card-desc">{item.description}</div>}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="menu-card-price">₹{item.price}</div>
                        {qty > 0 ? (
                          <div className="qty-control" onClick={e => e.stopPropagation()}>
                            <button className="qty-btn" onClick={() => changeQty(item._id, -1)}>−</button>
                            <span className="qty-val">{qty}</span>
                            <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm" style={{ borderRadius: 99 }}>Add</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cart Section */}
          <div className={`cart-panel glass-card ${cartExpanded ? 'expanded' : ''}`}>
            <div className="cart-header" onClick={() => setCartExpanded(!cartExpanded)}>
              <div className="flex items-center justify-between">
                <div className="card-title flex items-center gap-2">
                  <span>🛒</span>
                  <span className="hidden-sm">{selTable ? `Table ${selTable.tableNumber}` : 'Current Order'}</span>
                  <span className="show-sm">{selTable ? `T${selTable.tableNumber}` : 'Order'}</span>
                  {cart.length > 0 && <span className="badge badge-orange">{cart.length}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="show-sm text-accent font-bold">₹{profit.toFixed(0)}</div>
                  {cart.length > 0 && <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setCart([]) }} style={{ color: 'var(--red)', fontWeight: 700 }}>Reset</button>}
                  <span className="show-sm text-xs">{cartExpanded ? '▼' : '▲'}</span>
                </div>
              </div>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-cart-msg">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🥘</div>
                  <p style={{ fontWeight: 600 }}>Empty</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="cart-item surface-card">
                      <div style={{ flex: 1 }}>
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-price">₹{item.price * item.quantity}</div>
                      </div>
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => changeQty(item.menuItemId, -1)}>−</button>
                        <span className="qty-val-sm">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => changeQty(item.menuItemId, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cart-footer">
              <div className="glass-card p-4 mb-4 hidden-sm">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span style={{ fontWeight: 700 }}>₹{totalAmount}</span>
                </div>
                {commission > 0 && (
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-muted">Commission</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>−₹{commissionAmt.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <span className="card-title">Total</span>
                  <span className="menu-card-price" style={{ fontSize: 24 }}>₹{profit.toFixed(0)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="form-label text-[10px]">Payment</label>
                  <div className="flex gap-1">
                    {['cash', 'upi', 'card'].map(m => (
                      <button key={m} 
                        className={`btn flex-1 p-2 text-[10px] ${paymentMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPaymentMethod(m)}
                      >
                        {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 show-sm">
                  <div className="flex justify-between items-center h-full pt-4">
                     <span className="menu-card-price text-xl">₹{profit.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-lg w-full" onClick={placeOrder} 
                disabled={confirming || !cart.length}
                style={{ height: 50, fontSize: 16, borderRadius: 'var(--radius)' }}
              >
                {confirming ? '...' : `Place Order`}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="p-8 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="tabs">
              {[{ id: 'active', label: '⏳ Pending' }, { id: 'preparing', label: '🔥 Preparing' }, { id: 'ready', label: '✓ Ready' }, { id: 'all', label: 'All Today' }].map(f => (
                <button key={f.id} className={`tab-btn ${liveFilter === f.id ? 'active' : ''}`} onClick={() => setLiveFilter(f.id)}>{f.label}</button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={fetchLiveOrders}>⟳ Refresh Feed</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {liveOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🥡</div>
                <h3 style={{ fontSize: 24, fontWeight: 700 }}>No orders found</h3>
                <p>When orders are placed, they will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
                {liveOrders.map(order => <OrderCard key={order._id} order={order} onStatusChange={updateOrderStatus} onPaymentChange={updatePayment} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {orderSuccess && (
        <Modal title="✅ Order Placed Successfully" onClose={() => setOrderSuccess(null)}
          footer={
            <div className="flex gap-3 w-full">
              <button className="btn btn-secondary btn-lg flex-1" onClick={() => printReceipt(orderSuccess)}>🖨️ Print Receipt</button>
              <button className="btn btn-primary btn-lg flex-1" onClick={() => setOrderSuccess(null)}>Next Order</button>
            </div>
          }>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="animate-bounce" style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <div className="card-title" style={{ fontSize: 24, marginBottom: 8 }}>Order #{orderSuccess._id.slice(-6).toUpperCase()}</div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              {orderSuccess.tableNumber ? `Table ${orderSuccess.tableNumber}` : orderSuccess.source} • {orderSuccess.items.length} Items
            </p>
          </div>
          <div className="surface-card p-6">
            <div className="flex flex-col gap-3">
              {orderSuccess.items.map((i, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span style={{ fontWeight: 500 }}>{i.quantity}× {i.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>₹{i.price * i.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="card-title" style={{ fontSize: 18 }}>Total Paid</span>
              <span className="menu-card-price" style={{ fontSize: 24 }}>₹{orderSuccess.totalAmount}</span>
            </div>
          </div>
        </Modal>
      )}
      
      <style>{`
        .w-full { width: 100%; }
        .text-right { text-align: right; }
        .flex-1 { flex: 1; }
        .animate-bounce {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-20px);}
          60% {transform: translateY(-10px);}
        }
      `}</style>
    </div>
  );
}
