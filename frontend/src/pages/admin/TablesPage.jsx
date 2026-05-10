import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { format } from 'date-fns';

/* ── helpers ────────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

const STATUS_CONFIG = {
  available: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', dot: '#22c55e', label: 'Available' },
  occupied:  { bg: 'var(--color-background-danger)',  color: 'var(--color-text-danger)',  dot: '#ef4444', label: 'Occupied' },
  reserved:  { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', dot: '#f59e0b', label: 'Reserved' },
};

function Badge({ text, bg, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: bg, color }}>
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
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11, fontWeight: 500,
  color: 'var(--color-text-secondary)',
  display: 'block', marginBottom: 6,
};

/* ── table card ─────────────────────────────────────────────── */
function TableCard({ table, resv, onReserve, onCancelResv, onForceReset, onEdit }) {
  const s = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const isAvailable = table.status === 'available';
  const isOccupied  = table.status === 'occupied';
  const isReserved  = table.status === 'reserved';

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Table {table.tableNumber}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {table.capacity} guests
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge text={s.label} bg={s.bg} color={s.color} />
          <button
            onClick={() => onEdit(table)}
            style={{ padding: '5px 8px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          >⚙</button>
        </div>
      </div>

      {/* Status info */}
      <div style={{ padding: '14px 16px', flex: 1 }}>
        {isReserved && resv ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reserved for</div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{resv.customerName}</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              <span>🕒 {format(new Date(resv.startTime), 'hh:mm a')}</span>
              <span>👥 {resv.partySize} guests</span>
            </div>
          </div>
        ) : isOccupied ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-danger)', fontWeight: 500 }}>Currently in use</div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-success)', fontWeight: 500 }}>Ready for seating</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8 }}>
        {isAvailable ? (
          <button
            onClick={() => onReserve(table)}
            style={{ flex: 1, height: 36, borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'var(--transition-fast)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            Reserve Table
          </button>
        ) : isReserved && resv ? (
          <button
            onClick={() => onCancelResv(resv._id, resv.customerName)}
            style={{ flex: 1, height: 36, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-danger)', background: 'transparent', color: 'var(--color-text-danger)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel booking
          </button>
        ) : isReserved ? (
          <button
            onClick={() => onForceReset(table._id, table.tableNumber)}
            style={{ flex: 1, height: 36, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
          >
            Force reset
          </button>
        ) : (
          <button disabled style={{ flex: 1, height: 36, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 13, cursor: 'not-allowed', opacity: 0.5 }}>
            Occupied
          </button>
        )}
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function TablesPage() {
  const [tables, setTables]           = useState([]);
  const [reservations, setReservations] = useState([]);
  const [tableModal, setTableModal]   = useState(false);
  const [resvModal, setResvModal]     = useState(false);
  const [edit, setEdit]               = useState(null);
  const [selTable, setSelTable]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [tableForm, setTableForm]     = useState({ tableNumber: '', capacity: 4 });
  const [resvForm, setResvForm]       = useState({
    customerName: '', customerPhone: '', partySize: 2,
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '',
  });
  const width = useWindowWidth();
  const isMobile = width < 640;

  const fetchData = useCallback(async () => {
    try {
      const [tRes, rRes] = await Promise.all([api.get('/tables'), api.get('/reservations')]);
      setTables(tRes.data);
      setReservations(rRes.data.filter(r => !['cancelled', 'completed', 'no-show'].includes(r.status)));
    } catch { toast.error('Failed to load data'); }
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
      setTableModal(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving table'); }
    finally { setLoading(false); }
  };

  const deleteTable = async (t) => {
    if (!window.confirm(`Delete Table ${t.tableNumber}?`)) return;
    try { await api.delete(`/tables/${t._id}`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Error deleting table'); }
  };

  const openResvModal = (t) => {
    setSelTable(t);
    setResvForm({ customerName: '', customerPhone: '', partySize: t.capacity, startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '' });
    setResvModal(true);
  };

  const confirmReservation = async () => {
    if (!resvForm.customerName) return toast.error('Customer name required');
    setLoading(true);
    try {
      await api.post('/reservations', {
        ...resvForm, tableId: selTable._id,
        endTime: new Date(new Date(resvForm.startTime).getTime() + 2 * 3600000).toISOString(),
        status: 'confirmed',
      });
      toast.success(`Table ${selTable.tableNumber} booked!`);
      setResvModal(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Booking failed'); }
    finally { setLoading(false); }
  };

  const cancelById = async (resvId, name) => {
    if (!window.confirm(`Cancel booking for "${name}"?`)) return;
    setLoading(true);
    try { await api.delete(`/reservations/${resvId}`); toast.success('Booking cancelled'); fetchData(); }
    catch { toast.error('Error cancelling booking'); }
    finally { setLoading(false); }
  };

  const forceReset = async (tableId, tableNumber) => {
    if (!window.confirm(`Force-reset Table ${tableNumber}?`)) return;
    setLoading(true);
    try { await api.put(`/tables/${tableId}`, { status: 'available' }); toast.success('Reset'); fetchData(); }
    catch { toast.error('Error'); }
    finally { setLoading(false); }
  };

  /* status summary counts */
  const counts = { available: 0, occupied: 0, reserved: 0 };
  tables.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  const filteredResv = reservations.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Floor management</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Table statuses and reservations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} style={{ fontSize: 13, padding: '7px 14px', height: 36, borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 500 }}>
            ↻ Refresh
          </button>
          <button onClick={() => openTableModal()} style={{ fontSize: 13, padding: '7px 14px', height: 36, borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>
            + New table
          </button>
        </div>
      </div>

      {/* Status summary pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([status, count]) => {
          const s = STATUS_CONFIG[status];
          return (
            <div key={status} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              fontSize: 13,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Table grid */}
      {tables.length === 0 ? (
        <div style={{
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '80px 24px', textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🪑</div>
          <p style={{ fontWeight: 500, marginBottom: 16 }}>No tables yet</p>
          <button onClick={() => openTableModal()} style={{ fontSize: 13, padding: '8px 20px', borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>
            Add first table
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : width < 1024
              ? 'repeat(2, minmax(0, 1fr))'
              : 'repeat(3, minmax(0, 1fr))',
          gap: 12,
        }}>
          {tables.map(t => (
            <TableCard
              key={t._id}
              table={t}
              resv={resvForTable(t._id)}
              onReserve={openResvModal}
              onCancelResv={cancelById}
              onForceReset={forceReset}
              onEdit={openTableModal}
            />
          ))}
        </div>
      )}

      {/* Reservations list */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
          padding: '14px 16px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>Active reservations</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {reservations.length} upcoming
            </div>
          </div>
          <input
            style={{ ...inputStyle, width: isMobile ? '100%' : 240 }}
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Mobile: stacked cards / Desktop: table */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
            {filteredResv.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 28 }}>📅</div>
                <p style={{ marginTop: 12, fontWeight: 500 }}>No active bookings</p>
              </div>
            ) : filteredResv.map(r => (
              <div key={r._id} style={{
                background: 'var(--color-background-secondary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{r.customerName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {r.customerPhone || '—'} · {r.partySize} guests
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    T-{r.tableId?.tableNumber || '?'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {format(new Date(r.startTime), 'MMM d, hh:mm a')}
                  </span>
                  <button
                    onClick={() => cancelById(r._id, r.customerName)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-danger)', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Table</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Phone</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Party</th>
                  <th style={thStyle}>Arrival</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResv.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      <div style={{ fontSize: 28 }}>📅</div>
                      <p style={{ marginTop: 12, fontWeight: 500 }}>No active bookings</p>
                    </td>
                  </tr>
                ) : filteredResv.map(r => (
                  <tr key={r._id}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      T-{r.tableId?.tableNumber || '?'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{r.customerName}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{r.customerPhone || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <Badge text={`${r.partySize}`} bg="var(--color-background-secondary)" color="var(--color-text-primary)" />
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {format(new Date(r.startTime), 'MMM d, hh:mm a')}
                    </td>
                    <td style={tdStyle}>
                      <Badge text={r.status} bg="var(--color-background-warning)" color="var(--color-text-warning)" />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => cancelById(r._id, r.customerName)}
                        style={{ fontSize: 12, padding: '5px 10px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-danger)', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Table modal ── */}
      {tableModal && (
        <Modal
          title={edit ? `Edit table ${edit.tableNumber}` : 'Add new table'}
          onClose={() => setTableModal(false)}
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => setTableModal(false)} style={{ flex: 1, fontSize: 13, padding: '8px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>Cancel</button>
              {edit && (
                <button onClick={() => { setTableModal(false); deleteTable(edit); }} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-danger)', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer' }}>Delete</button>
              )}
              <button onClick={saveTable} disabled={loading} style={{ flex: 1, fontSize: 13, padding: '8px', borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>
                {loading ? 'Saving…' : 'Save table'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Table number / label</label>
              <input style={inputStyle} value={tableForm.tableNumber} onChange={e => setTableForm({ ...tableForm, tableNumber: e.target.value })} placeholder="e.g. T-10, VIP-1" />
            </div>
            <div>
              <label style={labelStyle}>Seating capacity</label>
              <input style={inputStyle} type="number" min="1" value={tableForm.capacity} onChange={e => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reservation modal ── */}
      {resvModal && (
        <Modal
          title={`Reserve table ${selTable?.tableNumber}`}
          onClose={() => setResvModal(false)}
          footer={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => setResvModal(false)} style={{ flex: 1, fontSize: 13, padding: '8px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmReservation} disabled={loading} style={{ flex: 1, fontSize: 13, padding: '8px', borderRadius: 'var(--border-radius-md)', border: 'none', background: 'var(--color-background-info)', color: 'var(--color-text-info)', cursor: 'pointer', fontWeight: 500 }}>
                {loading ? 'Booking…' : 'Confirm booking'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Customer name</label>
                <input style={inputStyle} value={resvForm.customerName} onChange={e => setResvForm({ ...resvForm, customerName: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={resvForm.customerPhone} onChange={e => setResvForm({ ...resvForm, customerPhone: e.target.value })} placeholder="+91…" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Party size</label>
                <input style={inputStyle} type="number" min="1" value={resvForm.partySize} onChange={e => setResvForm({ ...resvForm, partySize: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label style={labelStyle}>Arrival time</label>
                <input style={{ ...inputStyle }} type="datetime-local" value={resvForm.startTime} onChange={e => setResvForm({ ...resvForm, startTime: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes / special requests</label>
              <textarea
                style={{ ...inputStyle, height: 80, padding: '10px 12px', resize: 'vertical' }}
                value={resvForm.notes}
                onChange={e => setResvForm({ ...resvForm, notes: e.target.value })}
                placeholder="Birthday, window seat…"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
