import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

const EMPTY_REST = { name: '', address: '', phone: '', email: '', status: 'active' };
const EMPTY_USER = { name: '', email: '', password: '', role: 'admin', restaurantId: '' };

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('restaurants');
  const [restModal, setRestModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [editRest, setEditRest] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [restForm, setRestForm] = useState(EMPTY_REST);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordTarget, setPasswordTarget] = useState(null);

  const fetchRestaurants = () => api.get('/restaurants').then(r => setRestaurants(r.data));
  const fetchUsers = () => api.get('/users').then(r => setUsers(r.data));

  useEffect(() => { fetchRestaurants(); fetchUsers(); }, []);

  const openRestModal = (r = null) => {
    setEditRest(r);
    setRestForm(r ? { ...r } : EMPTY_REST);
    setRestModal(true);
  };

  const saveRestaurant = async () => {
    setLoading(true);
    try {
      if (editRest) {
        await api.put(`/restaurants/${editRest._id}`, restForm);
        toast.success('Restaurant updated');
      } else {
        await api.post('/restaurants', restForm);
        toast.success('Restaurant created');
      }
      fetchRestaurants();
      setRestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving restaurant');
    } finally { setLoading(false); }
  };

  const toggleRestStatus = async (r) => {
    try {
      await api.put(`/restaurants/${r._id}`, { ...r, status: r.status === 'active' ? 'inactive' : 'active' });
      fetchRestaurants();
      toast.success('Status updated');
    } catch { toast.error('Error updating status'); }
  };

  const openUserModal = (u = null) => {
    setEditUser(u);
    setUserForm(u ? { ...u, password: '' } : EMPTY_USER);
    setUserModal(true);
  };

  const saveUser = async () => {
    setLoading(true);
    try {
      const data = { ...userForm };
      if (!data.restaurantId) data.restaurantId = null;
      if (editUser) {
        await api.put(`/users/${editUser._id}`, data);
        toast.success('User updated');
      } else {
        await api.post('/users', data);
        toast.success('User created');
      }
      fetchUsers();
      setUserModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving user');
    } finally { setLoading(false); }
  };

  const deactivateUser = async (u) => {
    if (!window.confirm(`Deactivate ${u.name}?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch { toast.error('Error'); }
  };

  const openPasswordModal = (u) => {
    setPasswordTarget(u);
    setNewPassword('');
    setPasswordModal(true);
  };

  const changePassword = async () => {
    if (!newPassword) return toast.error('Please enter a password');
    setLoading(true);
    try {
      await api.put(`/users/${passwordTarget._id}`, { password: newPassword });
      toast.success('Password updated successfully');
      setPasswordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating password');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Platform Dashboard</div>
          <div className="page-subtitle">Manage all restaurants and users</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => openUserModal()}>+ Add User</button>
          <button className="btn btn-primary" onClick={() => openRestModal()}>+ New Restaurant</button>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon">🏪</div>
            <div className="stat-label">Total Restaurants</div>
            <div className="stat-value">{restaurants.length}</div>
            <div className="stat-sub">{restaurants.filter(r => r.status === 'active').length} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-sub">Across all restaurants</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Active Tenants</div>
            <div className="stat-value">{restaurants.filter(r => r.status === 'active').length}</div>
            <div className="stat-sub">{restaurants.filter(r => r.status === 'inactive').length} inactive</div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'restaurants' ? 'active' : ''}`} onClick={() => setActiveTab('restaurants')}>🏪 Restaurants ({restaurants.length})</button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Users ({users.length})</button>
        </div>

        {activeTab === 'restaurants' && (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🏪</div><p>No restaurants yet</p></div></td></tr>
                )}
                {restaurants.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.name}</strong></td>
                    <td>
                      <div style={{ fontSize: 12 }}>{r.email || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.phone || ''}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.address || '—'}</td>
                    <td>
                      <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openRestModal(r)}>Edit</button>
                        <button className={`btn btn-sm ${r.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleRestStatus(r)}>
                          {r.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Restaurant</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'super_admin' ? 'badge-purple' : u.role === 'admin' ? 'badge-blue' : u.role === 'kitchen' ? 'badge-orange' : 'badge-gray'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.restaurantId?.name || '—'}
                    </td>
                    <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'active' : 'inactive'}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openUserModal(u)}>Edit</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openPasswordModal(u)}>🔑 Pass</button>
                        {u.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivateUser(u)}>Deactivate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restModal && (
        <Modal title={editRest ? 'Edit Restaurant' : 'New Restaurant'} onClose={() => setRestModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setRestModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveRestaurant} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Restaurant Name *</label>
              <input className="form-input" value={restForm.name} onChange={e => setRestForm({ ...restForm, name: e.target.value })} placeholder="Spice Garden" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={restForm.email} onChange={e => setRestForm({ ...restForm, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={restForm.phone} onChange={e => setRestForm({ ...restForm, phone: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address</label>
              <input className="form-input" value={restForm.address} onChange={e => setRestForm({ ...restForm, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={restForm.status} onChange={e => setRestForm({ ...restForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {userModal && (
        <Modal title={editUser ? 'Edit User' : 'New User'} onClose={() => setUserModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setUserModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveUser} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            {!editUser && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Restaurant</label>
              <select className="form-select" value={userForm.restaurantId?._id || userForm.restaurantId || ''} onChange={e => setUserForm({ ...userForm, restaurantId: e.target.value })}>
                <option value="">None (Super Admin)</option>
                {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {passwordModal && (
        <Modal title={`Change Password: ${passwordTarget?.name}`} onClose={() => setPasswordModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setPasswordModal(false)}>Cancel</button><button className="btn btn-primary" onClick={changePassword} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button></>}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" autoFocus />
          </div>
        </Modal>
      )}
    </div>
  );
}
