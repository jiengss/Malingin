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
  IconCheckCircle, 
  IconAlertCircle, 
  IconRefresh, 
  IconTrash, 
  IconSparkles,
  IconMapPin,
  IconBell
} from '../components/Icons';


const SPORTS = [
  {
    id: 'basketball',
    name: 'Basketball',
    icon: IconBasketball,
    color: '#ea580c',
    bg: '#ffedd5',
    border: '#fed7aa',
    desc: 'Full court with official hoops'
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: IconVolleyball,
    color: '#7e22ce',
    bg: '#f3e8ff',
    border: '#e9d5ff',
    desc: 'Regulation height net setup'
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    icon: IconPickleball,
    color: '#0d9488',
    bg: '#ccfbf1',
    border: '#99f6e4',
    desc: 'Dual-court badminton/pickleball'
  },
  {
    id: 'other',
    name: 'Community Event',
    icon: IconCommunity,
    color: '#4338ca',
    bg: '#e0e7ff',
    border: '#c7d2fe',
    desc: 'Barangay assembly, league, or drills'
  }
];

const PRESET_TIMES = [
  { label: ' Morning ', start: '08:00', end: '10:00' },
  { label: ' Noon ', start: '10:00', end: '12:00' },
  { label: ' Afternoon ', start: '14:00', end: '16:00' },
  { label: ' Sunset ', start: '16:00', end: '18:00' },
  { label: 'Prime Night', start: '18:00', end: '20:00' },
  { label: ' Late Night', start: '20:00', end: '22:00' }
];

/** Convert "HH:MM" 24-hour string → "H:MM AM/PM" */
const to12h = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};


const Dashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [formData, setFormData] = useState({
    activity_type: 'basketball',
    reservation_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '10:00',
    notes: ''
  });
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, id: null, isProcessing: false });
  const [reservationTab, setReservationTab] = useState('all');

  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Fetch user reservations
  const fetchReservations = useCallback(async () => {
    setLoadingReservations(true);
    try {
      const response = await api.get('/reservations');
      setReservations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  // Fetch full court schedule
  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const response = await api.get('/schedule');
      setSchedule(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching court schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    fetchSchedule();
  }, [fetchReservations, fetchSchedule]);

  // Booked slots on the currently selected booking form date
  const bookedSlotsOnFormDate = useMemo(() => {
    if (!formData.reservation_date) return [];
    return schedule.filter(res => res.reservation_date === formData.reservation_date && res.status !== 'cancelled');
  }, [schedule, formData.reservation_date]);

  // Booked slots on the schedule viewer tab/date
  const bookedSlotsOnScheduleDate = useMemo(() => {
    if (!scheduleDate) return schedule;
    return schedule.filter(res => res.reservation_date === scheduleDate && res.status !== 'cancelled');
  }, [schedule, scheduleDate]);

  // Real-time conflict indicator
  const timeConflict = useMemo(() => {
    if (!formData.reservation_date || !formData.start_time || !formData.end_time) {
      return null;
    }

    if (formData.start_time >= formData.end_time) {
      return { message: 'End time must be later than start time.' };
    }

    const conflict = bookedSlotsOnFormDate.find(res => {
      const resStart = res.start_time.slice(0, 5);
      const resEnd = res.end_time.slice(0, 5);
      return formData.start_time < resEnd && formData.end_time > resStart;
    });

    if (conflict) {
      return {
        message: `Slot overlaps with a reserved ${conflict.activity_type.toUpperCase()} session (${conflict.start_time.slice(0, 5)} - ${conflict.end_time.slice(0, 5)}).`,
        conflict
      };
    }

    return null;
  }, [bookedSlotsOnFormDate, formData.reservation_date, formData.start_time, formData.end_time]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectSport = (sportId) => {
    setFormData(prev => ({ ...prev, activity_type: sportId }));
  };

  const handleSelectPreset = (start, end) => {
    setFormData(prev => ({ ...prev, start_time: start, end_time: end }));
  };

  const handleTimelineSlotClick = (hourStr) => {
    const nextHour = String(Number(hourStr.slice(0, 2)) + 1).padStart(2, '0') + ':00';
    setFormData(prev => ({
      ...prev,
      reservation_date: scheduleDate,
      start_time: hourStr,
      end_time: nextHour
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (timeConflict) {
      setMessage({ text: timeConflict.message, type: 'error' });
      return;
    }

    setBooking(true);
    try {
      await api.post('/reservations', formData);
      setMessage({ text: ' Court reserved successfully! Your booking is locked in.', type: 'success' });
      fetchReservations();
      fetchSchedule();
      setFormData(prev => ({
        ...prev,
        notes: ''
      }));
    } catch (error) {
      const apiMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      let errorText = 'Reservation failed.';
      if (validationErrors) {
        errorText = Object.values(validationErrors).flat().join(' ');
      } else if (apiMessage) {
        errorText = apiMessage;
      } else if (error.message) {
        errorText = error.message;
      }
      setMessage({ text: errorText, type: 'error' });
    } finally {
      setBooking(false);
    }
  };

  const confirmCancelReservation = async () => {
    if (!cancelModal.id) return;
    setCancelModal(prev => ({ ...prev, isProcessing: true }));
    try {
      await api.delete(`/reservations/${cancelModal.id}`);
      setMessage({ text: 'Reservation cancelled successfully.', type: 'success' });
      fetchReservations();
      fetchSchedule();
      setCancelModal({ isOpen: false, id: null, isProcessing: false });
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Failed to cancel reservation.',
        type: 'error'
      });
      setCancelModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // User's active reservations today
  const todayMyReservations = useMemo(() => {
    return reservations
      .filter(r => r.reservation_date === today && r.status !== 'cancelled')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [reservations, today]);

  // User's upcoming active reservations (future days)
  const upcomingMyReservations = useMemo(() => {
    return reservations
      .filter(r => r.reservation_date > today && r.status !== 'cancelled')
      .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.start_time.localeCompare(b.start_time));
  }, [reservations, today]);

  // User's bookings on the currently viewed schedule date
  const userBookingsOnScheduleDate = useMemo(() => {
    return reservations.filter(r => r.reservation_date === scheduleDate && r.status !== 'cancelled');
  }, [reservations, scheduleDate]);

  // Generate hourly blocks from 06:00 to 22:00 for the visual interactive timeline
  const timelineHours = useMemo(() => {
    const hours = [];
    for (let h = 6; h <= 21; h++) {
      const hStart = String(h).padStart(2, '0') + ':00';
      const hEnd = String(h + 1).padStart(2, '0') + ':00';
      
      const booked = bookedSlotsOnScheduleDate.find(s => {
        const sStart = s.start_time.slice(0, 5);
        const sEnd = s.end_time.slice(0, 5);
        return hStart < sEnd && hEnd > sStart;
      });

      // Accurately verify if this slot is the user's reservation
      let isMine = Boolean(booked?.is_mine);
      if (booked && !isMine && reservations.length > 0) {
        isMine = reservations.some(myRes => 
          myRes.id === booked.id || 
          (myRes.reservation_date === scheduleDate && 
           myRes.status !== 'cancelled' && 
           hStart < myRes.end_time.slice(0, 5) && 
           hEnd > myRes.start_time.slice(0, 5))
        );
      }

      hours.push({
        hour: hStart,
        endHour: hEnd,
        display: to12h(hStart),
        booked: booked ? { ...booked, is_mine: isMine } : null
      });
    }
    return hours;
  }, [bookedSlotsOnScheduleDate, reservations, scheduleDate]);


  // Filtered reservations
  const filteredMyReservations = useMemo(() => {
    if (reservationTab === 'upcoming') {
      return reservations.filter(r => r.reservation_date >= today && r.status !== 'cancelled');
    }
    if (reservationTab === 'past') {
      return reservations.filter(r => r.reservation_date < today || r.status === 'cancelled');
    }
    return reservations;
  }, [reservations, reservationTab, today]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 60px', width: '100%' }}>
        {/* HERO WELCOME & FACILITY STATUS */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                Community Portal
              </span>
              <span style={{ color: 'var(--border-medium)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--emerald-hover)', fontWeight: '600' }}>
                <span className="status-dot status-dot-pulse" style={{ backgroundColor: 'var(--emerald)' }} />
                <span>Court Open Today</span>
              </div>
            </div>

            <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Welcome, {user?.name || 'Player'}! 
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconMapPin size={16} />
              <span>Barangay Malingin Covered Court & Recreation Grounds</span>
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#f1f5f9',
              border: '1px solid var(--border-light)',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>My Bookings</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                {reservations.filter(r => r.status === 'confirmed').length}
              </div>
            </div>

            <div style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: todayMyReservations.length > 0 ? '#ede9fe' : '#f8fafc',
              border: todayMyReservations.length > 0 ? '1.5px solid #818cf8' : '1px solid var(--border-light)',
              minWidth: '130px'
            }}>
              <div style={{ fontSize: '12px', color: todayMyReservations.length > 0 ? '#4338ca' : 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {todayMyReservations.length > 0 && <span className="status-dot status-dot-pulse" style={{ backgroundColor: '#4f46e5', width: '6px', height: '6px' }} />}
                <span>My Schedule Today</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: todayMyReservations.length > 0 ? '#4338ca' : 'var(--text-main)', marginTop: '2px' }}>
                {todayMyReservations.length}
              </div>
            </div>

            <div style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid #c7d2fe',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--primary-hover)', fontWeight: '600' }}>Total Matches Today</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                {schedule.filter(s => s.reservation_date === today && s.status !== 'cancelled').length}
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATION ALERT */}
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

        {/* SCHEDULE NOTIFICATION BANNER */}
        {todayMyReservations.length > 0 ? (
          <div className="animate-fade-in" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #6366f1',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.12)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  backgroundColor: '#4f46e5', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  flexShrink: 0
                }}>
                  <IconBell size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1b4b', margin: 0 }}>
                      Schedule Notice: You have a Court Reservation Today!
                    </h3>
                    <span className="status-dot status-dot-pulse" style={{ backgroundColor: '#4f46e5', width: '8px', height: '8px' }} />
                  </div>
                  <p style={{ fontSize: '13px', color: '#4338ca', margin: 0, marginTop: '2px', fontWeight: '500' }}>
                    You have {todayMyReservations.length} scheduled session{todayMyReservations.length > 1 ? 's' : ''} on the court today ({today}). Please arrive on time!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScheduleDate(today)}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                View on Court Timeline
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {todayMyReservations.map(res => {
                const sport = SPORTS.find(s => s.id === res.activity_type) || SPORTS[0];
                const SportIcon = sport.icon;
                return (
                  <div key={res.id} style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #c7d2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        backgroundColor: sport.bg, color: sport.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <SportIcon size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>
                          {sport.name}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                          <IconClock size={14} />
                          <span>{to12h(res.start_time?.slice(0, 5))} – {to12h(res.end_time?.slice(0, 5))}</span>
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-confirmed" style={{ fontSize: '11px', textTransform: 'uppercase', padding: '4px 10px' }}>
                      {res.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : upcomingMyReservations.length > 0 ? (
          <div className="animate-fade-in" style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e0e7ff',
            padding: '16px 20px',
            marginBottom: '28px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                backgroundColor: '#ede9fe', color: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconBell size={20} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Upcoming Court Schedule Reminder
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Your next game is <strong style={{ color: '#4338ca', textTransform: 'capitalize' }}>{upcomingMyReservations[0].activity_type}</strong> on <strong style={{ color: '#0f172a' }}>{upcomingMyReservations[0].reservation_date}</strong> at <strong style={{ color: '#0f172a' }}>{to12h(upcomingMyReservations[0].start_time?.slice(0, 5))} – {to12h(upcomingMyReservations[0].end_time?.slice(0, 5))}</strong>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScheduleDate(upcomingMyReservations[0].reservation_date)}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              View Schedule ({upcomingMyReservations[0].reservation_date})
            </button>
          </div>
        ) : null}


        {/* SECTION 1: VISUAL TIMELINE & LIVE COURT SCHEDULE */}
        <section className="card" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconCalendar size={20} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  Interactive Court Timeline & Availability
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 44px', color: 'var(--text-muted)', fontSize: '14px' }}>
                See occupied hours at a glance. Click any <strong>OPEN</strong> time slot to auto-fill your booking!
              </p>
            </div>

            {/* Quick Date Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setScheduleDate(today)}
                className={`btn btn-sm ${scheduleDate === today ? 'btn-primary' : 'btn-outline'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setScheduleDate(tomorrow)}
                className={`btn btn-sm ${scheduleDate === tomorrow ? 'btn-primary' : 'btn-outline'}`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                value={scheduleDate}
                min={today}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={fetchSchedule}
                disabled={loadingSchedule}
                className="btn btn-outline btn-sm"
                title="Refresh schedule"
              >
                <IconRefresh size={14} className={loadingSchedule ? 'status-dot-pulse' : ''} />
                <span>{loadingSchedule ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Hourly Timeline Grid */}
          <div style={{
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-light)'
          }}>
            {/* Notice if user has reservations on this specific date */}
            {userBookingsOnScheduleDate.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: '#ede9fe',
                border: '1.5px solid #c7d2fe',
                color: '#3730a3',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '14px',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.05)'
              }}>
                <IconBell size={16} />
                <span>You have <strong>{userBookingsOnScheduleDate.length}</strong> active reservation(s) on this date ({scheduleDate === today ? "Today" : scheduleDate}): {userBookingsOnScheduleDate.map(b => `${to12h(b.start_time?.slice(0, 5))} – ${to12h(b.end_time?.slice(0, 5))} (${b.activity_type})`).join(', ')}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <span>Showing schedule for: <strong style={{ color: 'var(--text-main)' }}>{scheduleDate}</strong></span>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#10b981' }} />
                  <span>Open Slot (Click to Book)</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#f97316' }} />
                  <span>Reserved by Others</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#4f46e5' }} />
                  <strong style={{ color: '#4f46e5' }}>Your Schedule</strong>
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              {timelineHours.map(slot => {
                const isBooked = Boolean(slot.booked);
                const isMine = slot.booked?.is_mine;

                return (
                  <button
                    key={slot.hour}
                    type="button"
                    onClick={() => !isBooked && handleTimelineSlotClick(slot.hour)}
                    disabled={isBooked}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: isMine 
                        ? '2px solid #6366f1' 
                        : isBooked 
                          ? '1.5px solid #fed7aa' 
                          : '1.5px solid #a7f3d0',
                      backgroundColor: isMine 
                        ? '#ede9fe' 
                        : isBooked 
                          ? '#fff7ed' 
                          : '#ecfdf5',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '76px',
                      boxShadow: isMine ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                    }}
                    title={isMine ? `Your scheduled ${slot.booked?.activity_type} session (${to12h(slot.hour)} – ${to12h(slot.endHour)})` : isBooked ? `Reserved for ${slot.booked?.activity_type} (${to12h(slot.hour)} – ${to12h(slot.endHour)})` : `Click to book ${to12h(slot.hour)} – ${to12h(slot.endHour)}`}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: isMine ? '#312e81' : isBooked ? '#9a3412' : '#065f46',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px'
                    }}>
                      <span>{to12h(slot.hour)}</span>
                      <span style={{ fontSize: '10px', opacity: 0.75, fontWeight: '500' }}>to {to12h(slot.endHour)}</span>
                    </div>

                    <div style={{ marginTop: '6px' }}>
                      {isMine ? (
                        <div>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            color: '#ffffff',
                            backgroundColor: '#4f46e5',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            letterSpacing: '0.04em'
                          }}>
                            ★ YOUR SCHEDULE
                          </span>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                            color: '#3730a3',
                            marginTop: '2px'
                          }}>
                            {slot.booked.activity_type}
                          </div>
                        </div>
                      ) : isBooked ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          color: '#c2410c'
                        }}>
                          {slot.booked.activity_type}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>✓</span> Open
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        </section>

        {/* SECTION 2 & 3 GRID: BOOKING FORM & MY RESERVATIONS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '28px',
          alignItems: 'start'
        }}>
          {/* SECTION 2: BOOKING FORM */}
          <section style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(15,23,42,0.06)'
          }}>
            {/* Card Header */}
            <div style={{
              padding: '20px 24px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  backgroundColor: '#4f46e5', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.25)'
                }}>
                  <IconSparkles size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Book a Court Slot
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                    Fill out the form below to submit your reservation
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Step 1: Sport */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#4f46e5', color: '#ffffff',
                    fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>1</span>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.01em' }}>
                    Select Sport / Activity
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {SPORTS.map(sport => {
                    const isSelected = formData.activity_type === sport.id;
                    const IconComp = sport.icon;
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => handleSelectSport(sport.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${sport.color}` : '1.5px solid #e2e8f0',
                          backgroundColor: isSelected ? sport.bg : '#fafafa',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          position: 'relative',
                          boxShadow: isSelected ? `0 2px 12px ${sport.color}22` : 'none'
                        }}
                      >
                        {isSelected && (
                          <span style={{
                            position: 'absolute', top: '7px', right: '7px',
                            width: '16px', height: '16px', borderRadius: '50%',
                            backgroundColor: sport.color, color: '#fff',
                            fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '900'
                          }}>✓</span>
                        )}
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px',
                          backgroundColor: sport.bg, color: sport.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <IconComp size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? sport.color : '#1e293b' }}>
                            {sport.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3, marginTop: '1px' }}>
                            {sport.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #e2e8f0' }} />

              {/* Step 2: Date */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#4f46e5', color: '#ffffff',
                    fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>2</span>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.01em' }}>
                    Reservation Date
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {[{ label: 'Today', value: today }, { label: 'Tomorrow', value: tomorrow }].map(({ label, value }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, reservation_date: value })); setScheduleDate(value); }}
                      style={{
                        flex: 1, padding: '9px',
                        borderRadius: '8px',
                        border: formData.reservation_date === value ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                        backgroundColor: formData.reservation_date === value ? '#ede9fe' : '#f8fafc',
                        color: formData.reservation_date === value ? '#4338ca' : '#475569',
                        fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >{label}</button>
                  ))}
                </div>
                <input
                  type="date"
                  name="reservation_date"
                  min={today}
                  value={formData.reservation_date}
                  onChange={(e) => { handleChange(e); setScheduleDate(e.target.value); }}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ borderTop: '1px dashed #e2e8f0' }} />

              {/* Step 3: Time */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#4f46e5', color: '#ffffff',
                    fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>3</span>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.01em' }}>
                    Select Time Slot
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {PRESET_TIMES.map(preset => {
                    const isSelected = formData.start_time === preset.start && formData.end_time === preset.end;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset.start, preset.end)}
                        style={{
                          width: '100%', padding: '11px 14px',
                          borderRadius: '9px',
                          border: isSelected ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                          backgroundColor: isSelected ? '#ede9fe' : '#fafafa',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.12)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isSelected && (
                            <span style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              backgroundColor: '#4f46e5', color: '#fff',
                              fontSize: '10px', fontWeight: '900',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>✓</span>
                          )}
                          <span style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#4338ca' : '#374151' }}>
                            {preset.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '12px', fontWeight: '600',
                          color: isSelected ? '#6366f1' : '#94a3b8',
                          backgroundColor: isSelected ? '#ddd6fe' : '#f1f5f9',
                          padding: '3px 10px', borderRadius: '20px',
                          fontFamily: 'monospace'
                        }}>
                          {to12h(preset.start)} – {to12h(preset.end)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom time or-separator */}
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                    or set custom time
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Start Time</label>
                    <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>End Time</label>
                    <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} required />
                  </div>
                </div>
              </div>


              {/* Conflict / Success */}
              {timeConflict ? (
                <div className="animate-fade-in" style={{
                  padding: '12px 14px', backgroundColor: '#fff1f2',
                  border: '1.5px solid #fecaca', borderRadius: '8px',
                  color: '#b91c1c', fontSize: '13px', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <IconAlertCircle size={16} />
                  <div>{timeConflict.message}</div>
                </div>
              ) : formData.start_time && formData.end_time && (
                <div className="animate-fade-in" style={{
                  padding: '12px 14px', backgroundColor: '#f0fdf4',
                  border: '1.5px solid #bbf7d0', borderRadius: '8px',
                  color: '#15803d', fontSize: '13px', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <IconCheckCircle size={16} />
                  <div>Available — {to12h(formData.start_time)} to {to12h(formData.end_time)} on {formData.reservation_date}</div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  Notes <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="E.g., 3x3 youth pickup, inter-purok practice..."
                  rows="2"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={booking || Boolean(timeConflict)}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '10px', border: 'none',
                  backgroundColor: timeConflict ? '#e2e8f0' : '#4f46e5',
                  color: timeConflict ? '#94a3b8' : '#ffffff',
                  fontSize: '15px', fontWeight: '700',
                  cursor: (booking || timeConflict) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  letterSpacing: '-0.01em',
                  boxShadow: timeConflict ? 'none' : '0 4px 16px rgba(79,70,229,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {booking ? (
                  <><span className="status-dot status-dot-pulse" style={{ backgroundColor: '#ffffff', width: '8px', height: '8px' }} /> Processing...</>
                ) : timeConflict ? (
                  'Time Slot Unavailable'
                ) : (
                  'Confirm & Reserve Court'
                )}
              </button>
            </form>
          </section>

          {/* SECTION 3: MY RESERVATIONS */}
          <section className="card" style={{ padding: '28px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconClock size={20} />
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                    My Court Reservations
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0 44px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Track your upcoming sessions and match details.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchReservations}
                disabled={loadingReservations}
                className="btn btn-outline btn-sm"
                title="Refresh your bookings"
              >
                <IconRefresh size={14} className={loadingReservations ? 'status-dot-pulse' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setReservationTab('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: reservationTab === 'all' ? 'var(--primary-light)' : 'transparent',
                  color: reservationTab === 'all' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                All ({reservations.length})
              </button>
              <button
                type="button"
                onClick={() => setReservationTab('upcoming')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: reservationTab === 'upcoming' ? 'var(--primary-light)' : 'transparent',
                  color: reservationTab === 'upcoming' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                Upcoming ({reservations.filter(r => r.reservation_date >= today && r.status !== 'cancelled').length})
              </button>
              <button
                type="button"
                onClick={() => setReservationTab('past')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: reservationTab === 'past' ? 'var(--primary-light)' : 'transparent',
                  color: reservationTab === 'past' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                Past & Cancelled
              </button>
            </div>

            {/* Bookings List */}
            {loadingReservations && reservations.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                <span className="status-dot status-dot-pulse" style={{ backgroundColor: 'var(--primary)', width: '8px', height: '8px', marginRight: '8px' }} />
                Loading your reservations...
              </div>
            ) : filteredMyReservations.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-medium)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏀</div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  No reservations found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '300px', margin: '0 auto' }}>
                  Select an available timeslot on the left to schedule your first game on the court!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredMyReservations.map(res => {
                  const sportInfo = SPORTS.find(s => s.id === res.activity_type) || SPORTS[0];
                  const IconComp = sportInfo.icon;
                  const isCancelled = res.status === 'cancelled';
                  const isConfirmed = res.status === 'confirmed';

                  return (
                    <div
                      key={res.id}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: isCancelled ? '#fafafa' : '#ffffff',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        opacity: isCancelled ? 0.7 : 1,
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: sportInfo.bg,
                          color: sportInfo.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <IconComp size={22} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${res.activity_type}`}>
                              {sportInfo.name}
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {res.reservation_date}
                            </span>
                            {res.reservation_date === today && !isCancelled && (
                              <span style={{
                                backgroundColor: '#4f46e5',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                letterSpacing: '0.04em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                ★ TODAY'S SCHEDULE
                              </span>
                            )}
                            {res.reservation_date === tomorrow && !isCancelled && (
                              <span style={{
                                backgroundColor: '#ede9fe',
                                color: '#4338ca',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}>
                                TOMORROW
                              </span>
                            )}
                          </div>


                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '4px',
                            fontSize: '13px',
                            color: 'var(--text-muted)'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <IconClock size={14} />
                              <strong style={{ color: 'var(--text-main)' }}>
                                {to12h(res.start_time?.slice(0, 5))} – {to12h(res.end_time?.slice(0, 5))}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className={`badge ${isConfirmed ? 'badge-confirmed' : isCancelled ? 'badge-cancelled' : 'badge-pending'}`}>
                              <span className="status-dot" style={{
                                backgroundColor: isConfirmed ? '#16a34a' : isCancelled ? '#dc2626' : '#d97706'
                              }} />
                              {res.status?.toUpperCase()}
                            </span>
                          </div>

                          {res.notes && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <em>"{res.notes}"</em>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => setCancelModal({ isOpen: true, id: res.id, isProcessing: false })}
                          className="btn btn-outline btn-sm"
                          style={{
                            color: 'var(--rose)',
                            borderColor: 'rgba(244, 63, 94, 0.3)',
                            padding: '6px 12px'
                          }}
                        >
                          <IconTrash size={14} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Confirmation Modal */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, id: null, isProcessing: false })}
        onConfirm={confirmCancelReservation}
        title="Cancel Reservation?"
        message="Are you sure you want to cancel this booking? The slot will immediately become open for other community members to book."
        confirmText="Yes, Cancel Booking"
        confirmVariant="danger"
        isProcessing={cancelModal.isProcessing}
      />
    </div>
  );
};

export default Dashboard;