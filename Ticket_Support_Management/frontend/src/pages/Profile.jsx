import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h2>My Profile</h2>
      <div className="card" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <i className="fas fa-user-circle" style={{ fontSize: '4rem', color: '#64b5f6' }}></i>
          <div>
            <h3 style={{ margin: 0 }}>{user.full_name || user.username}</h3>
            <p>@{user.username}</p>
          </div>
        </div>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default Profile;