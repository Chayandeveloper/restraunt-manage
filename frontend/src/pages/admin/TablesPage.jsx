import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  available: { border: 'var(--green)', badge: 'badge-green', label: 'Available', icon: '🟢' },
  occupied:  { border: 'var(--red)', badge: 'badge-red', label: 'Occupied', icon: '🔴' },
  reserved:  { border: 'var(--yellow)', badge: 'badge-yellow', label: 'Booked', icon: '🟡' },
};

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [tableModal, setTableModal] = useState(false);
  const [resvModal, setResvModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [selTable, setSelTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tableForm, setTableForm] = useState({ tableNumber: '', capacity: 4 });
  const [resvForm, setResvForm] = useState({
    customerName: '', customerPhone: '', partySize: 2,
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        api.get('/tables'),
        api.get('/reservations'),
      ]);
      setTables(tRes.data);
      setReservations(rRes.data.filter(r => !['cancelled', 'completed', 'no-show'].includes(r.status)));
    } catch {
      toast.error('Failed to load data');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resvForTable = (tableId) => reservations.find(r => r.tableId?._id === tableId);

  const openTableModal = (t = null) => {
    setEdit(t);
    setTableForm(t ? { tableNumber: t.tableNumber, capacity: t.capacity } : { tableNumber: '', capacity: 4 });
    setTableModal(true);
  };

  const saveTable = async () => {
    if (!tableForm.tableNumber) return toast.error('Table number required');
    setLoading(true);
    try {
      edit ? await api.put(`/tables/${edit._id}`, tableForm)
           : await api.post('/tables', tableForm);
      toast.success(edit ? 'Table updated' : 'Table added');
      setTableModal(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving table'); }
    finally { setLoading(false); }
  };

  const deleteTable = async (t) => {
    if (!window.confirm(`Delete Table ${t.tableNumber}?`)) return;
    try { await api.delete(`/tables/${t._id}`); toast.success('Table deleted'); fetchData(); }
    catch { toast.error('Error deleting table'); }
  };

  const openResvModal = (t) => {
    setSelTable(t);
    setResvForm({
      customerName: '', customerPhone: '', partySize: t.capacity,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: ''
    });
    setResvModal(true);
  };

  const confirmReservation = async () => {
    if (!resvForm.customerName) return toast.error('Customer name required');
    setLoading(true);
    try {
      await api.post('/reservations', {
        ...resvForm,
        tableId: selTable._id,
        endTime: new Date(new Date(resvForm.startTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
      });
      toast.success(`Table ${selTable.tableNumber} booked!`);
      setResvModal(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Booking failed'); }
    finally { setLoading(false); }
  };

  const cancelById = async (resvId, customerName) => {
    if (!window.confirm(`Cancel booking for "${customerName}"?`)) return;
    setLoading(true);
    try {
      await api.delete(`/reservations/${resvId}`);
      toast.success('Booking cancelled');
      fetchData();
    } catch { toast.error('Error cancelling booking'); }
    finally { setLoading(false); }
  };

  const forceReset = async (tableId, tableNumber) => {
    if (!window.confirm(`Force-reset Table ${tableNumber}?`)) return;
    setLoading(true);
    try {
      await api.put(`/tables/${tableId}`, { status: 'available' });
      toast.success('Table status reset');
      fetchData();
    } catch { toast.error('Error resetting table'); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Floor Management</h1>
          <p className="page-subtitle">Control table statuses and manage customer reservations</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={fetchData}>⟳ Refresh Floor</button>
          <button className="btn btn-primary" onClick={() => openTableModal()}>+ New Table</button>
        </div>
      </div>

      <div className="page-body">
        <div className="table-grid mb-10" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {tables.length === 0 ? (
            <div className="card p-16 flex flex-col items-center gap-6" style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 72, opacity: 0.2 }}>🪑</div>
              <div className="text-center">
                <h3 className="card-title" style={{ fontSize: 24, marginBottom: 8 }}>Empty Dining Area</h3>
                <p className="text-muted" style={{ fontWeight: 500 }}>Start by adding tables to your floor plan.</p>
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => openTableModal()}>Add First Table</button>
            </div>
          ) : (
            tables.map(t => {
              const resv = resvForTable(t._id);
              const s = STATUS_CONFIG[t.status] || STATUS_CONFIG.available;
              return (
                <div key={t._id} className="premium-card flex flex-col" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Table {t.tableNumber}</h3>
                      <div className="flex items-center gap-2 mt-1" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span>Capacity: {t.capacity} Guests</span>
                      </div>
                    </div>
                    <span className={`badge ${s.badge}`} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 800 }}>
                      {s.icon} {s.label.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ padding: 24, flex: 1 }}>
                    <div className="surface-card p-4 mb-6" style={{ background: t.status === 'available' ? 'var(--accent-dim2)' : 'var(--bg-elevated)', borderStyle: 'dashed' }}>
                      {t.status === 'reserved' && resv ? (
                        <div className="animate-slide-up">
                          <div className="stat-label" style={{ color: 'var(--yellow)', marginBottom: 6 }}>Scheduled Arrival</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{resv.customerName}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: 12 }}>
                            <span>🕒 {format(new Date(resv.startTime), 'hh:mm a')}</span>
                            <span>👥 {resv.partySize} Guests</span>
                          </div>
                        </div>
                      ) : t.status === 'occupied' ? (
                        <div className="flex flex-col gap-1">
                          <div className="stat-label" style={{ color: 'var(--red)', marginBottom: 4 }}>Current Status</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>🔥 Table is currently in use</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="stat-label" style={{ color: 'var(--green)', marginBottom: 4 }}>Availability</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>✨ Ready for immediate seating</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {t.status === 'available' ? (
                        <button className="btn btn-primary flex-1" style={{ height: 44 }} onClick={() => openResvModal(t)}>Reserve Table</button>
                      ) : resv ? (
                        <button className="btn btn-secondary flex-1" style={{ height: 44, color: 'var(--red)', borderColor: 'var(--red-dim)' }} onClick={() => cancelById(resv._id, resv.customerName)}>Cancel Booking</button>
                      ) : t.status === 'reserved' ? (
                        <button className="btn btn-secondary flex-1" style={{ height: 44 }} onClick={() => forceReset(t._id, t.tableNumber)}>Force Reset</button>
                      ) : (
                        <button className="btn btn-secondary flex-1" style={{ height: 44 }} disabled>Table Occupied</button>
                      )}
                      <button className="btn btn-ghost" style={{ width: 44, height: 44, padding: 0, border: '1px solid var(--border)' }} onClick={() => openTableModal(t)}>⚙️</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="card">
          <div className="card-header flex flex-wrap justify-between items-center" style={{ padding: '24px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: 18 }}>Active Reservations</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Upcoming arrivals and scheduled bookings</p>
            </div>
            <div className="search-input" style={{ width: 320 }}>
               <input className="form-input" style={{ padding: '10px 16px', borderRadius: 99 }} placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th style={{ textAlign: 'center' }}>Party Size</th>
                  <th>Expected Arrival</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.filter(r => r.customerName.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>No active bookings found</td></tr>
                ) : (
                  reservations.filter(r => r.customerName.toLowerCase().includes(search.toLowerCase())).map(r => (
                    <tr key={r._id}>
                      <td><span style={{ fontWeight: 800, color: 'var(--accent)' }}>T-{r.tableId?.tableNumber || '?'}</span></td>
                      <td style={{ fontWeight: 700, fontSize: 14 }}>{r.customerName}</td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.customerPhone || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: 'var(--bg-elevated)', minWidth: 32 }}>{r.partySize}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{format(new Date(r.startTime), 'MMM d, hh:mm a')}</td>
                      <td><span className="badge badge-yellow" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800 }}>{r.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontWeight: 700 }} onClick={() => cancelById(r._id, r.customerName)}>Cancel</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {tableModal && (
        <Modal title={edit ? `Edit Table ${edit.tableNumber}` : 'Add New Table'} onClose={() => setTableModal(false)}
          footer={
            <div className="flex gap-3 w-full">
              <button className="btn btn-secondary flex-1" onClick={() => setTableModal(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={saveTable}>{loading ? 'Saving...' : 'Save Table'}</button>
            </div>
          }>
          <div className="flex flex-col gap-5">
            <div className="form-group">
              <label className="form-label">Table Number / Label</label>
              <input className="form-input" style={{ height: 48 }} value={tableForm.tableNumber} onChange={e => setTableForm({...tableForm, tableNumber: e.target.value})} placeholder="e.g. T-10, VIP-1" />
            </div>
            <div className="form-group">
              <label className="form-label">Seating Capacity</label>
              <input className="form-input" style={{ height: 48 }} type="number" value={tableForm.capacity} onChange={e => setTableForm({...tableForm, capacity: parseInt(e.target.value) || 1})} />
            </div>
          </div>
        </Modal>
      )}

      {resvModal && (
        <Modal title={`Book Table ${selTable?.tableNumber}`} onClose={() => setResvModal(false)}
          footer={
            <div className="flex gap-3 w-full">
              <button className="btn btn-secondary flex-1" onClick={() => setResvModal(false)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={confirmReservation}>{loading ? 'Processing...' : 'Confirm Booking'}</button>
            </div>
          }>
          <div className="flex flex-col gap-6">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-input" style={{ height: 48 }} value={resvForm.customerName} onChange={e => setResvForm({...resvForm, customerName: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" style={{ height: 48 }} value={resvForm.customerPhone} onChange={e => setResvForm({...resvForm, customerPhone: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Party Size</label>
                <input className="form-input" style={{ height: 48 }} type="number" value={resvForm.partySize} onChange={e => setResvForm({...resvForm, partySize: parseInt(e.target.value) || 1})} />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Arrival</label>
                <input className="form-input" style={{ height: 48 }} type="datetime-local" value={resvForm.startTime} onChange={e => setResvForm({...resvForm, startTime: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Special Requests / Notes</label>
              <textarea className="form-input" style={{ minHeight: 100, padding: 16 }} value={resvForm.notes} onChange={e => setResvForm({...resvForm, notes: e.target.value})} placeholder="e.g. Birthday celebration, window seat..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
