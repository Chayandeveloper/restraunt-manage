import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordTarget, setPasswordTarget] = useState(null);

  const fetchUsers = () => api.get('/users').then(r => setUsers(r.data));
  useEffect(() => { fetchUsers(); }, []);

  const openModal = (u = null) => {
    setEdit(u);
    setForm(u ? { name: u.name, email: u.email, password: '', role: u.role } : { name: '', email: '', password: '', role: 'staff' });
    setModal(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (edit) await api.put(`/users/${edit._id}`, form);
      else await api.post('/users', form);
      toast.success(edit ? 'User updated' : 'User added');
      fetchUsers(); setModal(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const deactivate = async (u) => {
    if (!window.confirm(`Deactivate ${u.name}?`)) return;
    try { await api.delete(`/users/${u._id}`); toast.success('User deactivated'); fetchUsers(); }
    catch { toast.error('Error'); }
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

  const ROLE_COLORS = { admin: 'badge-blue', staff: 'badge-gray', kitchen: 'badge-orange' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Team</div>
          <div className="page-subtitle">{users.length} team members</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add Team Member</button>
      </div>

      <div className="page-body">
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👥</div><p>No team members yet</p></div></td></tr>}
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="td-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(u)}>Edit</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openPasswordModal(u)}>🔑 Pass</button>
                    {u.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivate(u)}>Deactivate</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={edit ? 'Edit Team Member' : 'Add Team Member'} onClose={() => setModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          {!edit && (
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff / Waiter</option>
              <option value="kitchen">Kitchen</option>
              <option value="admin">Admin</option>
            </select>
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
