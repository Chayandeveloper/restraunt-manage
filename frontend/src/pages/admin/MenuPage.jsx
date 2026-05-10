import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

/* ── shared primitives ──────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function Badge({ text, bg, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: bg, color,
    }}>
      {text}
    </span>
  );
}

const inputStyle = {
  width: '100%', height: 38, padding: '0 12px',
  borderRadius: 'var(--border-radius-md)',
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-background-secondary)',
  color: 'var(--color-text-primary)',
  fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11, fontWeight: 500,
  color: 'var(--color-text-secondary)',
  display: 'block', marginBottom: 6,
};

/* ── item card for mobile ───────────────────────────────────── */
function ItemCard({ item, onEdit, onDelete, onToggle }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 3 }}>
            {item.name}
          </div>
          {item.description && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {item.description}
            </div>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', flexShrink: 0 }}>
          ₹{item.price}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge
            text={item.categoryId?.name || '—'}
            bg="var(--color-background-info)"
            color="var(--color-text-info)"
          />
          <button
            onClick={() => onToggle(item)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99,
              fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: item.isAvailable ? 'var(--color-background-success)' : 'var(--color-background-danger)',
              color: item.isAvailable ? 'var(--color-text-success)' : 'var(--color-text-danger)',
            }}
          >
            {item.isAvailable ? '● Available' : '○ Unavailable'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(item)} style={{
            fontSize: 12, padding: '5px 10px', borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            background: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)', cursor: 'pointer',
          }}>Edit</button>
          <button onClick={() => onDelete(item)} style={{
            fontSize: 12, padding: '5px 10px', borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-tertiary)',
            background: 'transparent',
            color: 'var(--color-text-danger)', cursor: 'pointer',
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [selCat, setSelCat]         = useState('all');
  const [catModal, setCatModal]     = useState(false);
  const [itemModal, setItemModal]   = useState(false);
  const [editCat, setEditCat]       = useState(null);
  const [editItem, setEditItem]     = useState(null);
  const [catForm, setCatForm]       = useState({ name: '' });
  const [itemForm, setItemForm]     = useState({ name: '', price: '', description: '', categoryId: '', isAvailable: true });
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [showCats, setShowCats]     = useState(false); // mobile categories drawer
  const width = useWindowWidth();
  const isMobile = width < 768;

  const fetchAll = async () => {
    const [cats, its] = await Promise.all([api.get('/categories'), api.get('/menu-items')]);
    setCategories(cats.data);
    setItems(its.data);
  };
  useEffect(() => { fetchAll(); }, []);

  const filteredItems = items.filter(i => {
    if (selCat !== 'all' && i.categoryId?._id !== selCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveCat = async () => {
    setLoading(true);
    try {
      if (editCat) await api.put(`/categories/${editCat._id}`, catForm);
      else await api.post('/categories', catForm);
      toast.success(editCat ? 'Category updated' : 'Category added');
      fetchAll(); setCatModal(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const deleteCat = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await api.delete(`/categories/${c._id}`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Error deleting category'); }
  };

  const saveItem = async () => {
    setLoading(true);
    try {
      const data = { ...itemForm, price: parseFloat(itemForm.price) };
      if (editItem) await api.put(`/menu-items/${editItem._id}`, data);
      else await api.post('/menu-items', data);
      toast.success(editItem ? 'Item updated' : 'Item added');
      fetchAll(); setItemModal(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const deleteItem = async (i) => {
    if (!window.confirm(`Delete "${i.name}"?`)) return;
    try { await api.delete(`/menu-items/${i._id}`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Error'); }
  };

  const toggleAvail = async (i) => {
    try { await api.put(`/menu-items/${i._id}`, { isAvailable: !i.isAvailable }); fetchAll(); }
    catch { toast.error('Error'); }
  };

  const openItemModal = (item = null) => {
    setEditItem(item);
    setItemForm(item
      ? { name: item.name, price: item.price, description: item.description || '', categoryId: item.categoryId?._id || item.categoryId, isAvailable: item.isAvailable }
      : { name: '', price: '', description: '', categoryId: categories[0]?._id || '', isAvailable: true }
    );
    setItemModal(true);
  };

  /* ── categories panel (shared between sidebar and drawer) ── */
  const CategoriesPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* "All" chip */}
      <button
        onClick={() => { setSelCat('all'); setShowCats(false); }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', borderRadius: 'var(--border-radius-md)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          background: selCat === 'all' ? 'var(--color-background-info)' : 'transparent',
          color: selCat === 'all' ? 'var(--color-text-info)' : 'var(--color-text-primary)',
          fontWeight: selCat === 'all' ? 500 : 400, fontSize: 13,
        }}
      >
        <span>All items</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{items.length}</span>
      </button>

      {categories.map(c => {
        const count = items.filter(i => i.categoryId?._id === c._id).length;
        const active = selCat === c._id;
        return (
          <div
            key={c._id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: 'var(--border-radius-md)',
              background: active ? 'var(--accent)' : 'transparent',
            }}
          >
            <button
              onClick={() => { setSelCat(c._id); setShowCats(false); }}
              style={{
                flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: 'transparent',
                color: active ? '#fff' : 'var(--color-text-primary)',
                fontWeight: active ? 600 : 400, fontSize: 13,
                borderRadius: 'var(--border-radius-md)',
                transition: 'var(--transition-fast)',
              }}
            >
              <span>{c.name}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
            </button>
            <div style={{ display: 'flex', gap: 2, paddingRight: 8 }}>
              <button
                onClick={() => { setEditCat(c); setCatForm({ name: c.name }); setCatModal(true); }}
                style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}
              >✏️</button>
              <button
                onClick={() => deleteCat(c)}
                style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-danger)' }}
              >🗑</button>
            </div>
          </div>
        );
      })}

      {categories.length === 0 && (
        <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          No categories yet
        </div>
      )}
    </div>
  );

  /* ── desktop table ─────────────────────────────────────────── */
  const thStyle = {
    padding: '10px 16px', fontSize: 11, fontWeight: 500,
    color: 'var(--color-text-secondary)', textAlign: 'left',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    background: 'var(--color-background-secondary)',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '11px 16px', fontSize: 13,
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: isMobile ? '16px' : '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Menu management</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {items.length} items across {categories.length} categories
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setEditCat(null); setCatForm({ name: '' }); setCatModal(true); }}
            style={{ fontSize: 13, padding: '7px 14px', height: 36, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 500 }}
          >
            + Category
          </button>
          <button
            onClick={() => openItemModal()}
            style={{ fontSize: 13, padding: '7px 14px', height: 36, borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, transition: 'var(--transition-fast)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            + Menu item
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
        gap: 16, alignItems: 'start',
      }}>

        {/* ── Sidebar (desktop) / Drawer trigger (mobile) ── */}
        {isMobile ? (
          <div>
            <button
              onClick={() => setShowCats(v => !v)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                background: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              <span>
                {selCat === 'all' ? 'All categories' : (categories.find(c => c._id === selCat)?.name || 'Filter by category')}
              </span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{showCats ? '▲' : '▼'}</span>
            </button>
            {showCats && (
              <div style={{
                marginTop: 4, padding: '8px',
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
              }}>
                <CategoriesPanel />
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categories
            </div>
            <div style={{ padding: '8px' }}>
              <CategoriesPanel />
            </div>
          </div>
        )}

        {/* ── Items panel ── */}
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}>
          {/* Search + filter bar */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
          }}>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 140 }}
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={fetchAll}
              style={{ fontSize: 13, padding: '0 14px', height: 38, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer', flexShrink: 0 }}
            >
              ↻
            </button>
          </div>

          {/* Mobile: cards / Desktop: table */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
              {filteredItems.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: 32 }}>🍽</div>
                  <p style={{ marginTop: 12, fontWeight: 500 }}>No items found</p>
                </div>
              ) : filteredItems.map(i => (
                <ItemCard key={i._id} item={i} onEdit={openItemModal} onDelete={deleteItem} onToggle={toggleAvail} />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 560 }}>
                <colgroup>
                  <col /><col style={{ width: 120 }} /><col style={{ width: 90 }} /><col style={{ width: 130 }} /><col style={{ width: 140 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Availability</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '64px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: 28 }}>🍽</div>
                        <p style={{ marginTop: 12, fontWeight: 500 }}>No items found</p>
                      </td>
                    </tr>
                  ) : filteredItems.map(i => (
                    <tr key={i._id}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ ...tdStyle, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{i.name}</div>
                        {i.description && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {i.description}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Badge text={i.categoryId?.name || '—'} bg="var(--color-background-info)" color="var(--color-text-info)" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>₹{i.price}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => toggleAvail(i)}
                          style={{
                            padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: i.isAvailable ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                            color: i.isAvailable ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                          }}
                        >
                          {i.isAvailable ? '● Available' : '○ Off'}
                        </button>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => openItemModal(i)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => deleteItem(i)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--color-border-tertiary)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Category modal ── */}
      {catModal && (
        <Modal
          title={editCat ? 'Edit category' : 'New category'}
          onClose={() => setCatModal(false)}
          footer={
            <>
              <button onClick={() => setCatModal(false)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveCat} disabled={loading} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>Save</button>
            </>
          }
        >
          <div>
            <label style={labelStyle}>Category name</label>
            <input style={inputStyle} value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} placeholder="e.g. Desserts" />
          </div>
        </Modal>
      )}

      {/* ── Item modal ── */}
      {itemModal && (
        <Modal
          title={editItem ? 'Edit item' : 'New menu item'}
          onClose={() => setItemModal(false)}
          footer={
            <>
              <button onClick={() => setItemModal(false)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveItem} disabled={loading} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>
                {loading ? 'Saving…' : 'Save item'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Item name</label>
              <input style={inputStyle} value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Paneer Tikka" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Price (₹)</label>
                <input style={inputStyle} type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={{ ...inputStyle }} value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, height: 80, padding: '10px 12px', resize: 'vertical' }}
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Brief description…"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="avail"
                checked={itemForm.isAvailable}
                onChange={e => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="avail" style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}>Available now</label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
