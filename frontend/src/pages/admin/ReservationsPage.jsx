import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = { pending: 'badge-yellow', confirmed: 'badge-blue', completed: 'badge-green', 'no-show': 'badge-red', cancelled: 'badge-gray' };

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [form, setForm] = useState({ customerName: '', customerPhone: '', partySize: 2, tableId: '', startTime: '', endTime: '', notes: '', status: 'pending' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [r, t] = await Promise.all([
      api.get(`/reservations${dateFilter ? `?date=${dateFilter}` : ''}`),
      api.get('/tables')
    ]);
    setReservations(r.data);
    setTables(t.data);
  };
  useEffect(() => { fetchData(); }, [dateFilter]);

  const openModal = (r = null) => {
    setEdit(r);
    if (r) {
      setForm({ customerName: r.customerName, customerPhone: r.customerPhone || '', partySize: r.partySize || 2, tableId: r.tableId?._id || '', startTime: format(new Date(r.startTime), "yyyy-MM-dd'T'HH:mm"), endTime: format(new Date(r.endTime), "yyyy-MM-dd'T'HH:mm"), notes: r.notes || '', status: r.status });
    } else {
      const now = new Date(); now.setMinutes(0, 0, 0);
      const end = new Date(now); end.setHours(end.getHours() + 2);
      setForm({ customerName: '', customerPhone: '', partySize: 2, tableId: tables[0]?._id || '', startTime: format(now, "yyyy-MM-dd'T'HH:mm"), endTime: format(end, "yyyy-MM-dd'T'HH:mm"), notes: '', status: 'pending' });
    }
    setModal(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (edit) await api.put(`/reservations/${edit._id}`, form);
      else await api.post('/reservations', form);
      toast.success(edit ? 'Reservation updated' : 'Reservation created');
      fetchData(); setModal(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const cancel = async (r) => {
    if (!window.confirm(`Cancel ${r.customerName}'s reservation?`)) return;
    try { await api.delete(`/reservations/${r._id}`); toast.success('Cancelled'); fetchData(); }
    catch { toast.error('Error'); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/reservations/${id}`, { status }); fetchData(); }
    catch { toast.error('Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reservations</div>
          <div className="page-subtitle">{reservations.length} reservations on {format(parseISO(dateFilter), 'MMMM d, yyyy')}</div>
        </div>
        <div className="flex gap-2">
          <input type="date" className="form-input" style={{ width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          <button className="btn btn-primary" onClick={() => openModal()}>+ New Reservation</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Customer</th><th>Table</th><th>Time</th><th>Party</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {reservations.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📅</div><p>No reservations for this date</p></div></td></tr>}
              {reservations.map(r => (
                <tr key={r._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.customerName}</div>
                    {r.customerPhone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.customerPhone}</div>}
                  </td>
                  <td>Table {r.tableId?.tableNumber} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({r.tableId?.capacity} seats)</span></td>
                  <td>
                    <div style={{ fontSize: 13 }}>{format(new Date(r.startTime), 'h:mm a')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {format(new Date(r.endTime), 'h:mm a')}</div>
                  </td>
                  <td>👥 {r.partySize || '—'}</td>
                  <td>
                    <select className="status-select" value={r.status} onChange={e => updateStatus(r._id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="no-show">No Show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.notes || '—'}</td>
                  <td><div className="td-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(r)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => cancel(r)}>Cancel</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={edit ? 'Edit Reservation' : 'New Reservation'} onClose={() => setModal(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input className="form-input" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">Table *</label>
              <select className="form-select" value={form.tableId} onChange={e => setForm({ ...form, tableId: e.target.value })}>
                <option value="">Select table</option>
                {tables.map(t => <option key={t._id} value={t._id}>Table {t.tableNumber} ({t.capacity} seats)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Party Size</label>
              <input className="form-input" type="number" min={1} value={form.partySize} onChange={e => setForm({ ...form, partySize: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
            {edit && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="no-show">No Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special requests, dietary restrictions..." rows={2} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
