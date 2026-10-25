import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconShield, IconLogOut, IconCalendar } from './Icons';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img
            src="/barangay-malingin-seal.jpg"
            alt="Barangay Malingin"
            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
          />
          <img
            src="/sk-malingin-seal.jpg"
            alt="SK Malingin"
            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
          />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: 1.2 }}>
              Barangay Malingin
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Court Reservation</div>
          </div>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Admin/Player switcher */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <Link
                to="/"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: location.pathname === '/' ? '#ffffff' : '#64748b',
                  backgroundColor: location.pathname === '/' ? '#4f46e5' : '#f1f5f9',
                }}
              >
                <IconCalendar size={13} />
                Player
              </Link>
              <Link
                to="/admin"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: location.pathname === '/admin' ? '#ffffff' : '#64748b',
                  backgroundColor: location.pathname === '/admin' ? '#4338ca' : '#f1f5f9',
                }}
              >
                <IconShield size={13} />
                Admin
              </Link>
            </div>
          )}

          {/* User info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 10px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isAdmin ? '#4f46e5' : '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '12px',
              flexShrink: 0
            }}>
              {getInitials(user?.name, user?.email)}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
              {user?.name || user?.email?.split('@')[0]}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', borderColor: '#fecaca' }}
          >
            <IconLogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
