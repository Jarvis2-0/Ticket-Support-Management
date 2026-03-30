import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopBar from './TopBar';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <Outlet />;

  return (
    <div className="layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar" style={{
        width: '250px',
        backgroundColor: '#1e1e1e',
        borderRight: '1px solid #333',
        padding: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid #333', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
              <i className="fas fa-ticket-alt"></i> Ticket Management System
            </h2>
            <p style={{ color: '#aaa', margin: '0.5rem 0 0', fontSize: '0.8rem' }}>Support & Analytics</p>
          </div>
          <nav>
            <Link to="/dashboard" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none', transition: 'background 0.2s' }}>
              <i className="fas fa-chart-line"></i> Dashboard
            </Link>
            <Link to="/tickets" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none' }}>
              <i className="fas fa-ticket-alt"></i> Tickets
            </Link>
            {user.role !== 'agent' && (
              <>
            <Link to="/tickets/new" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none' }}>
              <i className="fas fa-plus-circle"></i> New Ticket
            </Link>
            <Link to="/profile" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none' }}>
              <i className="fas fa-user"></i> Profile
            </Link>
            </>
            )} 
            {user.role === 'admin' && (
              <>
                <Link to="/users" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none' }}>
                  <i className="fas fa-users"></i> Users
                </Link>
                <Link to="/insights" style={{ display: 'block', padding: '0.75rem 1rem', color: '#e0e0e0', textDecoration: 'none' }}>
                  <i className="fas fa-chart-bar"></i> Insights
                </Link>
              </>
            )}
          </nav>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #333', textAlign: 'center' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #e74c3c',
              color: '#e74c3c',
              padding: '0.5rem',
              width: '100%',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, backgroundColor: '#121212', padding: '1.5rem' }}>
        <TopBar />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;