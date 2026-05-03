import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selCat, setSelCat] = useState('all');
  const [catModal, setCatModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [catForm, setCatForm] = useState({ name: '' });
  const [itemForm, setItemForm] = useState({ name: '', price: '', description: '', categoryId: '', isAvailable: true });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
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
    try {
      await api.put(`/menu-items/${i._id}`, { isAvailable: !i.isAvailable });
      fetchAll();
    } catch { toast.error('Error'); }
  };

  const openItemModal = (item = null) => {
    setEditItem(item);
    setItemForm(item ? { 
      name: item.name, 
      price: item.price, 
      description: item.description || '', 
      categoryId: item.categoryId?._id || item.categoryId, 
      isAvailable: item.isAvailable 
    } : { 
      name: '', 
      price: '', 
      description: '', 
      categoryId: categories[0]?._id || '', 
      isAvailable: true 
    });
    setItemModal(true);
  };

  return (
    <div className="p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="card-title" style={{ fontSize: 24 }}>Menu Management</h1>
          <p className="form-label">{items.length} items across {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { setEditCat(null); setCatForm({ name: '' }); setCatModal(true); }}>+ Category</button>
          <button className="btn btn-primary" onClick={() => openItemModal()}>+ Menu Item</button>
        </div>
      </div>

      <div className="dashboard-split-grid mb-8" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Items Section */}
        <div className="card flex flex-col">
          <div className="card-header flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap flex-1">
              <div className="search-input flex-1" style={{ maxWidth: 300 }}>
                <input className="form-input" placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: 'auto' }} value={selCat} onChange={e => setSelCat(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}>⟳ Refresh</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Item Details</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>No items found</td></tr>
                ) : (
                  filteredItems.map(i => (
                    <tr key={i._id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                        {i.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.description}</div>}
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{i.categoryId?.name}</span></td>
                      <td><div className="menu-card-price" style={{ fontSize: 16 }}>₹{i.price}</div></td>
                      <td>
                        <button className={`badge ${i.isAvailable ? 'badge-green' : 'badge-red'}`} onClick={() => toggleAvail(i)} style={{ border: 'none', cursor: 'pointer' }}>
                          {i.isAvailable ? '● Available' : '○ Disabled'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => openItemModal(i)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteItem(i)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Categories Section */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Categories</h2>
            </div>
            <div className="p-2">
               {categories.map(c => (
                 <div key={c._id} className="flex items-center justify-between p-3 hover:bg-hover rounded-lg transition-colors">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.filter(item => item.categoryId?._id === c._id).length} Items</div>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditCat(c); setCatForm({ name: c.name }); setCatModal(true); }}>⚙️</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteCat(c)}>🗑️</button>
                    </div>
                 </div>
               ))}
               {categories.length === 0 && <div className="p-6 text-center text-muted">No categories</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {catModal && (
        <Modal title={editCat ? 'Edit Category' : 'New Category'} onClose={() => setCatModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setCatModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveCat} disabled={loading}>Save</button></>}>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input className="form-input" value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} placeholder="e.g. Desserts" />
          </div>
        </Modal>
      )}

      {itemModal && (
        <Modal title={editItem ? 'Edit Item' : 'New Menu Item'} onClose={() => setItemModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setItemModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveItem} disabled={loading}>Save Item</button></>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Item Name</label>
              <input className="form-input" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input className="form-input" type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
