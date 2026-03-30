import { useAuth } from '../context/AuthContext';

const TopBar = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '0.5rem 1rem',
      backgroundColor: '#1e1e1e',
      borderBottom: '1px solid #333',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href='./profile'>
        <i className="fas fa-user-circle" style={{ fontSize: '1.5rem', color: '#64b5f6' }} ></i>
        </a>
        <span>
          {user.full_name || user.username} ({user.role}) | ID: {user.id}
        </span>
      </div>
    </div>
  );
};

export default TopBar;