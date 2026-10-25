import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { 
  IconBasketball, 
  IconVolleyball, 
  IconPickleball, 
  IconCommunity, 
  IconCalendar, 
  IconClock, 
  IconCheck, 
  IconX, 
  IconTrash, 
  IconRefresh, 
  IconSearch, 
  IconFilter, 
  IconShield,
  IconUser,
  IconCheckCircle,
  IconAlertCircle
} from '../components/Icons';

const SPORTS_MAP = {
  basketball: { name: 'Basketball', icon: IconBasketball, badgeClass: 'badge-basketball' },
  volleyball: { name: 'Volleyball', icon: IconVolleyball, badgeClass: 'badge-volleyball' },
  pickleball: { name: 'Pickleball', icon: IconPickleball, badgeClass: 'badge-pickleball' },
  other: { name: 'Community Event', icon: IconCommunity, badgeClass: 'badge-other' }
};

const AdminDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isProcessing: false });

  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (activityFilter) params.activity_type = activityFilter;
      if (dateFilter) params.date = dateFilter;

      const response = await api.get('/admin/reservations', { params });
      setReservations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      setMessage({
        text: error.response?.data?.message || 'Failed to load reservations.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activityFilter, dateFilter]);

  useEffect(() => {
    fetchStats();
    fetchReservations();
  }, [fetchStats, fetchReservations]);

  const handleStatusUpdate = async (reservationId, newStatus) => {
    setProcessingId(reservationId);
    setMessage({ text: '', type: '' });
    try {
      const response = await api.patch(`/admin/reservations/${reservationId}/status`, {
        status: newStatus
      });
      setMessage({ text: response.data.message || `Reservation marked as ${newStatus}.`, type: 'success' });
      fetchReservations();
      fetchStats();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Failed to update reservation status.',
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal(prev => ({ ...prev, isProcessing: true }));
    try {
      const response = await api.delete(`/admin/reservations/${deleteModal.id}`);
      setMessage({ text: response.data.message || 'Reservation permanently deleted.', type: 'success' });
      fetchReservations();
      fetchStats();
      setDeleteModal({ isOpen: false, id: null, isProcessing: false });
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Failed to delete reservation.',
        type: 'error'
      });
      setDeleteModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const filteredReservations = useMemo(() => {
    if (!searchTerm) return reservations;
    const term = searchTerm.toLowerCase();
    return reservations.filter(res => {
      const userName = res.user?.name?.toLowerCase() || '';
      const userEmail = res.user?.email?.toLowerCase() || '';
      const notes = res.notes?.toLowerCase() || '';
      return userName.includes(term) || userEmail.includes(term) || notes.includes(term);
    });
  }, [reservations, searchTerm]);

  const resetAllFilters = () => {
    setStatusFilter('');
    setActivityFilter('');
    setDateFilter('');
    setSearchTerm('');
  };

  const getInitials = (name, email) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 60px', width: '100%' }}>
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '26px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                backgroundColor: '#4338ca',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em'
              }}>
                Administrator Mode
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Signed in as <strong>{user?.name || user?.email}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
              Court Management & Reservations Portal
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { fetchReservations(); fetchStats(); }}
              disabled={loading}
              className="btn btn-outline"
            >
              <IconRefresh size={16} className={loading ? 'status-dot-pulse' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>

        {/* ALERT NOTIFICATION */}
        {message.text && (
          <div className="animate-fade-in" style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            backgroundColor: message.type === 'success' ? 'var(--emerald-light)' : 'var(--rose-light)',
            border: `1.5px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#9f1239',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {message.type === 'success' ? <IconCheckCircle size={20} /> : <IconAlertCircle size={20} />}
            <span style={{ flex: 1 }}>{message.text}</span>
            <button
              onClick={() => setMessage({ text: '', type: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '700' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* EXECUTIVE KPI METRIC CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {/* Total */}
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconCalendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Total Bookings</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                {statsLoading ? '...' : (stats?.total_reservations ?? 0)}
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="card" style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--amber-light)',
              color: 'var(--amber-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconClock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#b45309', fontWeight: '700' }}>Pending Approval</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#b45309', marginTop: '2px' }}>
                {statsLoading ? '...' : (stats?.pending_reservations ?? 0)}
              </div>
            </div>
          </div>

          {/* Confirmed */}
          <div className="card" style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--emerald-light)',
              color: 'var(--emerald-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconCheckCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#15803d', fontWeight: '700' }}>Confirmed Slots</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
                {statsLoading ? '...' : (stats?.confirmed_reservations ?? 0)}
              </div>
            </div>
          </div>

          {/* Today */}
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconBasketball size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Today's Matches</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                {statsLoading ? '...' : (stats?.today_reservations ?? 0)}
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconUser size={24} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Registered Members</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                {statsLoading ? '...' : (stats?.total_users ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <section className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex'
              }}>
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by player name, email, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: searchTerm ? '38px' : '14px' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex'
                  }}
                >
                  <IconX size={16} />
                </button>
              )}
            </div>

            {/* Status Quick Pill Filters */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-outline'}`}
              >
                All Statuses
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                style={statusFilter === 'pending' ? { background: '#f59e0b', borderColor: '#d97706' } : {}}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('confirmed')}
                className={`btn btn-sm ${statusFilter === 'confirmed' ? 'btn-primary' : 'btn-outline'}`}
                style={statusFilter === 'confirmed' ? { background: '#10b981', borderColor: '#059669' } : {}}
              >
                Confirmed
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('cancelled')}
                className={`btn btn-sm ${statusFilter === 'cancelled' ? 'btn-primary' : 'btn-outline'}`}
                style={statusFilter === 'cancelled' ? { background: '#f43f5e', borderColor: '#e11d48' } : {}}
              >
                Cancelled
              </button>
            </div>

            {/* Sport and Date Selectors */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                style={{ width: 'auto', padding: '8px 12px' }}
              >
                <option value="">All Sports</option>
                <option value="basketball">Basketball</option>
                <option value="volleyball">Volleyball</option>
                <option value="pickleball">Pickleball</option>
                <option value="other">Community Event</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: 'auto', padding: '8px 12px' }}
              />

              {(statusFilter || activityFilter || dateFilter || searchTerm) && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--rose)' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* RESERVATIONS TABLE */}
        <section className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                Reservations Roster
              </h2>
              <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                {filteredReservations.length} total
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="status-dot status-dot-pulse" style={{ backgroundColor: 'var(--primary)', width: '10px', height: '10px', marginRight: '8px' }} />
              Loading reservations records...
            </div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                No reservations found
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '300px', margin: '0 auto' }}>
                Try adjusting your search query, status filters, or date range.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1.5px solid var(--border-light)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '14px 20px' }}>Player / Resident</th>
                    <th style={{ padding: '14px 16px' }}>Sport / Activity</th>
                    <th style={{ padding: '14px 16px' }}>Date</th>
                    <th style={{ padding: '14px 16px' }}>Timeslot</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px' }}>Session Notes</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(res => {
                    const isBusy = processingId === res.id;
                    const sport = SPORTS_MAP[res.activity_type] || SPORTS_MAP.other;
                    const IconComp = sport.icon;
                    const isConfirmed = res.status === 'confirmed';
                    const isCancelled = res.status === 'cancelled';

                    return (
                      <tr
                        key={res.id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          transition: 'background var(--transition-fast)'
                        }}
                      >
                        {/* User Column with Avatar */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: 'var(--primary)',
                              flexShrink: 0
                            }}>
                              {getInitials(res.user?.name, res.user?.email)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                {res.user?.name || 'Registered Resident'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {res.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sport Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${sport.badgeClass}`}>
                            <IconComp size={14} />
                            <span>{sport.name}</span>
                          </span>
                        </td>

                        {/* Date Column */}
                        <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-main)' }}>
                          {res.reservation_date}
                        </td>

                        {/* Timeslot Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: '600' }}>
                            <IconClock size={14} />
                            <span>{res.start_time?.slice(0, 5)} - {res.end_time?.slice(0, 5)}</span>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${isConfirmed ? 'badge-confirmed' : isCancelled ? 'badge-cancelled' : 'badge-pending'}`}>
                            <span className="status-dot" style={{
                              backgroundColor: isConfirmed ? '#16a34a' : isCancelled ? '#dc2626' : '#d97706'
                            }} />
                            <span>{res.status?.toUpperCase()}</span>
                          </span>
                        </td>

                        {/* Notes Column */}
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                          {res.notes ? (
                            <span title={res.notes} style={{ fontStyle: 'italic', fontSize: '13px' }}>
                              "{res.notes.length > 30 ? res.notes.slice(0, 30) + '...' : res.notes}"
                            </span>
                          ) : (
                            <span style={{ color: 'var(--border-medium)', fontSize: '12px' }}>—</span>
                          )}
                        </td>

                        {/* Action Buttons Column */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!isConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(res.id, 'confirmed')}
                                disabled={isBusy}
                                className="btn btn-sm btn-emerald"
                                title="Approve & confirm court reservation"
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                              >
                                <IconCheck size={14} />
                                <span>Approve</span>
                              </button>
                            )}

                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(res.id, 'cancelled')}
                                disabled={isBusy}
                                className="btn btn-sm btn-outline"
                                title="Mark reservation as cancelled"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  color: 'var(--amber-hover)',
                                  borderColor: 'var(--amber)'
                                }}
                              >
                                <IconX size={14} />
                                <span>Cancel</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeleteModal({ isOpen: true, id: res.id, isProcessing: false })}
                              disabled={isBusy}
                              className="btn btn-sm btn-danger"
                              title="Delete record permanently"
                              style={{ padding: '6px 8px' }}
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Confirmation Modal for Permanent Deletion */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, isProcessing: false })}
        onConfirm={confirmDelete}
        title="Delete Reservation Record?"
        message="This action will permanently remove this court reservation record from the system database. This cannot be undone."
        confirmText="Yes, Permanently Delete"
        confirmVariant="danger"
        isProcessing={deleteModal.isProcessing}
      />
    </div>
  );
};

export default AdminDashboard;
