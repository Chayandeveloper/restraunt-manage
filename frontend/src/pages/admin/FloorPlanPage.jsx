import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { printReceipt } from '../../components/OrderCard';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_META = {
  available: { label: 'Available', color: 'var(--green)', bg: 'var(--green-dim)', border: 'rgba(34,197,94,0.4)' },
  occupied:  { label: 'Occupied',  color: 'var(--red)',   bg: 'var(--red-dim)',   border: 'rgba(239,68,68,0.5)' },
  reserved:  { label: 'Reserved',  color: 'var(--yellow)',bg: 'var(--yellow-dim)',border: 'rgba(234,179,8,0.4)' },
};

function TableTile({ table, activeOrder, onClick, selected }) {
  const meta = STATUS_META[table.status];
  const elapsed = activeOrder ? Math.floor((Date.now() - new Date(activeOrder.createdAt)) / 60000) : 0;

  return (
    <div
      onClick={() => onClick(table)}
      style={{
        background: selected ? 'var(--accent-dim)' : meta.bg,
        border: `2px solid ${selected ? 'var(--accent)' : meta.border}`,
        borderRadius: 14,
        padding: '16px 12px',
        cursor: 'pointer',
        transition: 'all 0.18s',
        transform: selected ? 'scale(1.04)' : 'scale(1)',
        boxShadow: selected ? '0 0 0 3px var(--accent-dim)' : 'none',
        position: 'relative',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Status dot */}
      <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />

      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: selected ? 'var(--accent)' : meta.color, lineHeight: 1 }}>
          {table.tableNumber}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>👥 {table.capacity} seats</div>
      </div>

      {activeOrder && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
            ₹{activeOrder.totalAmount}
          </div>
          <div style={{ fontSize: 10, color: elapsed > 30 ? 'var(--red)' : elapsed > 15 ? 'var(--yellow)' : 'var(--text-muted)', marginTop: 2 }}>
            ⏱ {elapsed}m ago · {activeOrder.items.length} item{activeOrder.items.length !== 1 ? 's' : ''}
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 99,
              background: activeOrder.status === 'ready' ? 'var(--green-dim)' : activeOrder.status === 'preparing' ? 'var(--blue-dim)' : 'var(--yellow-dim)',
              color: activeOrder.status === 'ready' ? 'var(--green)' : activeOrder.status === 'preparing' ? 'var(--blue)' : 'var(--yellow)',
            }}>
              {activeOrder.status === 'ready' ? '✓ Ready' : activeOrder.status === 'preparing' ? '🔥 Cooking' : '⏳ Pending'}
            </span>
          </div>
        </div>
      )}
      {!activeOrder && table.status === 'available' && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Tap to seat</div>
      )}
    </div>
  );
}

export default function FloorPlanPage() {
  const [tables, setTables] = useState([]);
  const [tableOrders, setTableOrders] = useState({}); // tableId -> order
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null); // selected table
  const [activeOrder, setActiveOrder] = useState(null); // current order for selected table
  const [showAddItems, setShowAddItems] = useState(false);
  const [addCart, setAddCart] = useState([]);
  const [selCat, setSelCat] = useState('all');
  const [menuSearch, setMenuSearch] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [t, c, m] = await Promise.all([
      api.get('/tables'),
      api.get('/categories'),
      api.get('/menu-items?available=true'),
    ]);
    setTables(t.data);
    setCategories(c.data);
    setMenuItems(m.data);

    // Fetch active orders for all occupied tables
    const occupied = t.data.filter(tb => tb.status === 'occupied');
    const orderMap = {};
    await Promise.all(occupied.map(async tb => {
      try {
        const r = await api.get(`/orders/table/${tb._id}/active`);
        if (r.data) orderMap[tb._id] = r.data;
      } catch {}
    }));
    setTableOrders(orderMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 15000); return () => clearInterval(id); }, [fetchAll]);

  const handleTableClick = async (table) => {
    setSelected(table);
    setAddCart([]);
    setMenuSearch('');
    setSelCat('all');
    if (table.status === 'occupied') {
      try {
        const r = await api.get(`/orders/table/${table._id}/active`);
        setActiveOrder(r.data);
      } catch { setActiveOrder(null); }
    } else {
      setActiveOrder(null);
    }
  };

  const addToAddCart = (item) => setAddCart(prev => {
    const ex = prev.find(c => c.menuItemId === item._id);
    if (ex) return prev.map(c => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c);
    return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
  });
  const changeAddQty = (id, delta) =>
    setAddCart(prev => prev.map(c => c.menuItemId === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));

  const submitAddItems = async () => {
    if (!addCart.length) return toast.error('Select items to add');
    try {
      if (activeOrder) {
        // Add to existing order
        const r = await api.post(`/orders/${activeOrder._id}/items`, { items: addCart });
        setActiveOrder(r.data);
        toast.success('Items added to order');
      } else {
        // Create new order
        const totalAmount = addCart.reduce((s, i) => s + i.price * i.quantity, 0);
        const r = await api.post('/orders', {
          tableId: selected._id, source: 'direct',
          items: addCart, commissionPercent: 0, paymentMethod: 'cash',
        });
        setActiveOrder(r.data);
        toast.success('Order created!');
      }
      setAddCart([]);
      setShowAddItems(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const removeItem = async (itemIndex) => {
    if (!activeOrder) return;
    if (!window.confirm('Remove this item?')) return;
    try {
      const r = await api.delete(`/orders/${activeOrder._id}/items/${itemIndex}`);
      setActiveOrder(r.data);
      toast.success('Item removed');
    } catch { toast.error('Error'); }
  };

  const updateOrderStatus = async (status) => {
    try {
      const r = await api.put(`/orders/${activeOrder._id}/status`, { status });
      setActiveOrder(r.data);
      if (status === 'completed') { setSelected(null); setActiveOrder(null); }
      fetchAll();
      toast.success(`Order ${status}`);
    } catch { toast.error('Error'); }
  };

  const closeAndPay = async () => {
    try {
      await api.put(`/orders/${activeOrder._id}/payment`, { paymentMethod: payMethod, paymentStatus: 'paid' });
      await api.put(`/orders/${activeOrder._id}/status`, { status: 'completed' });
      toast.success('Bill paid & table freed!');
      printReceipt({ ...activeOrder, paymentMethod: payMethod, paymentStatus: 'paid' });
      setPayModal(false);
      setSelected(null);
      setActiveOrder(null);
      fetchAll();
    } catch { toast.error('Error processing payment'); }
  };

  const filteredMenu = menuItems.filter(i => {
    if (selCat !== 'all' && i.categoryId?._id !== selCat) return false;
    if (menuSearch && !i.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
    return true;
  });

  const counts = { available: 0, occupied: 0, reserved: 0 };
  tables.forEach(t => counts[t.status]++);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="page-title">Floor Plan</div>
            <div className="page-subtitle">Live table & order management</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {[
              { key: 'available', label: 'Available', color: 'var(--green)' },
              { key: 'occupied',  label: 'Occupied',  color: 'var(--red)' },
              { key: 'reserved',  label: 'Reserved',  color: 'var(--yellow)' },
            ].map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{counts[s.key]} {s.label}</span>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={fetchAll}>⟳</button>
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 0, overflow: 'hidden', padding: '0 28px 24px' }}>
        {/* Floor grid */}
        <div style={{ overflowY: 'auto', paddingRight: selected ? 20 : 0 }}>
          {loading
            ? <div className="flex-center" style={{ height: 300 }}><div className="spinner" /></div>
            : tables.length === 0
              ? <div className="empty-state"><div className="empty-icon">🪑</div><p>No tables configured. <a href="/admin/tables" style={{ color: 'var(--accent)' }}>Add tables</a> first.</p></div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {tables.map(table => (
                    <TableTile
                      key={table._id}
                      table={table}
                      activeOrder={tableOrders[table._id]}
                      onClick={handleTableClick}
                      selected={selected?._id === table._id}
                    />
                  ))}
                </div>
              )
          }
        </div>

        {/* Table detail panel */}
        {selected && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>Table {selected.tableNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {selected.capacity} seats · {STATUS_META[selected.status].label}</div>
              </div>
              <button className="modal-close" onClick={() => { setSelected(null); setActiveOrder(null); }}>✕</button>
            </div>

            {/* Order content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
              {!activeOrder ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🪑</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Table is {selected.status}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                    {selected.status === 'available' ? 'Start a new order for this table.' : 'No active order found.'}
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddItems(true)}>
                    ➕ Start Order
                  </button>
                </div>
              ) : (
                <>
                  {/* Order meta */}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order #{activeOrder._id.slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(activeOrder.createdAt), { addSuffix: true })}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                      background: activeOrder.status === 'ready' ? 'var(--green-dim)' : activeOrder.status === 'preparing' ? 'var(--blue-dim)' : 'var(--yellow-dim)',
                      color: activeOrder.status === 'ready' ? 'var(--green)' : activeOrder.status === 'preparing' ? 'var(--blue)' : 'var(--yellow)',
                    }}>
                      {activeOrder.status === 'ready' ? '✓ Ready' : activeOrder.status === 'preparing' ? '🔥 Cooking' : '⏳ Pending'}
                    </span>
                  </div>

                  {/* Items */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Order Items</div>
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                          ×{item.quantity}
                        </div>
                        <div style={{ flex: 1, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>₹{item.price * item.quantity}</div>
                        <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4 }} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--accent)' }}>₹{activeOrder.totalAmount}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {activeOrder.paymentStatus === 'paid'
                        ? <span style={{ color: 'var(--green)' }}>✓ Paid via {activeOrder.paymentMethod}</span>
                        : <span style={{ color: 'var(--red)' }}>● Unpaid</span>
                      }
                    </div>
                  </div>

                  {/* Status flow */}
                  {activeOrder.status !== 'completed' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {activeOrder.status === 'pending' && (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => updateOrderStatus('preparing')}>🔥 Mark Preparing</button>
                      )}
                      {activeOrder.status === 'preparing' && (
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={() => updateOrderStatus('ready')}>✓ Mark Ready</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Panel footer */}
            {activeOrder && activeOrder.status !== 'completed' && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)', display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAddItems(true); setAddCart([]); }}>
                  ➕ Add Items
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setPayMethod('cash'); setPayModal(true); }}>
                  💰 Bill & Pay
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Items Modal */}
      {showAddItems && (
        <Modal
          title={activeOrder ? `Add Items — Table ${selected?.tableNumber}` : `New Order — Table ${selected?.tableNumber}`}
          size="lg"
          onClose={() => { setShowAddItems(false); setAddCart([]); }}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {addCart.length > 0 ? `₹${addCart.reduce((s, i) => s + i.price * i.quantity, 0)} · ${addCart.reduce((s, i) => s + i.quantity, 0)} item(s)` : 'No items selected'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setShowAddItems(false); setAddCart([]); }}>Cancel</button>
                <button className="btn btn-primary" onClick={submitAddItems} disabled={!addCart.length}>
                  {activeOrder ? 'Add to Order' : 'Place Order'}
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, maxHeight: '60vh' }}>
            {/* Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="cat-tabs" style={{ marginBottom: 8, flexShrink: 0 }}>
                <button className={`cat-tab ${selCat === 'all' ? 'active' : ''}`} onClick={() => setSelCat('all')}>All</button>
                {categories.map(c => <button key={c._id} className={`cat-tab ${selCat === c._id ? 'active' : ''}`} onClick={() => setSelCat(c._id)}>{c.name}</button>)}
              </div>
              <div className="search-input" style={{ marginBottom: 8, flexShrink: 0 }}>
                <span className="search-icon">🔍</span>
                <input placeholder="Search..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
              </div>
              <div style={{ overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                {filteredMenu.map(item => {
                  const qty = addCart.find(c => c.menuItemId === item._id)?.quantity || 0;
                  return (
                    <div key={item._id} className="menu-item-card" onClick={() => addToAddCart(item)}>
                      <div className="item-info">
                        <div className="item-name">{item.name}</div>
                        {item.description && <div className="item-desc">{item.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {qty > 0 && (
                          <div className="qty-control" onClick={e => e.stopPropagation()}>
                            <button className="qty-btn" onClick={() => changeAddQty(item._id, -1)}>−</button>
                            <span className="qty-display">{qty}</span>
                            <button className="qty-btn" onClick={() => addToAddCart(item)}>+</button>
                          </div>
                        )}
                        <div className="item-price">₹{item.price}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Mini cart */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-light)', fontWeight: 700, fontSize: 13 }}>Selected</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {addCart.length === 0
                  ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Tap items to add</div>
                  : addCart.map(item => (
                    <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <div className="qty-control">
                        <button className="qty-btn" style={{ width: 20, height: 20 }} onClick={() => changeAddQty(item.menuItemId, -1)}>−</button>
                        <span style={{ fontSize: 12, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                        <button className="qty-btn" style={{ width: 20, height: 20 }} onClick={() => changeAddQty(item.menuItemId, 1)}>+</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Pay Modal */}
      {payModal && activeOrder && (
        <Modal
          title={`Bill — Table ${selected?.tableNumber}`}
          onClose={() => setPayModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPayModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-lg" onClick={closeAndPay}>
                💰 Collect ₹{activeOrder.totalAmount} & Print
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 20 }}>
            {activeOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                <span>{item.quantity}× {item.name}</span>
                <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 20, marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border)' }}>
              <span>TOTAL</span>
              <span style={{ color: 'var(--accent)' }}>₹{activeOrder.totalAmount}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ v: 'cash', label: '💵 Cash' }, { v: 'upi', label: '📱 UPI' }, { v: 'card', label: '💳 Card' }].map(p => (
                <button key={p.v} className={`btn ${payMethod === p.v ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setPayMethod(p.v)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
