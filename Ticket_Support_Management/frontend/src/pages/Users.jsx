import { useEffect, useState } from 'react';
import api from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'viewer'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
  try {
    await api.patch(`/users/${userId}`, { role: newRole });
    fetchUsers();
  } catch (err) {
    console.error('Role change error:', err);
    const msg = err.response?.data?.detail || err.message || 'Failed to update role';
    alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};


  const handleToggleActive = async (userId, isActive) => {
  try {
    await api.patch(`/users/${userId}/active`, { is_active: !isActive });
    fetchUsers();
  } catch (err) {
    console.error('Active toggle error:', err);
    const msg = err.response?.data?.detail || err.message || 'Failed to toggle active status';
    alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};


  const handleDelete = async (userId) => {
    if (window.confirm('Delete this user? This action is irreversible.')) {
      try {
        await api.delete(`/users/${userId}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete user');
      }
    }
  };

  const handleViewActivity = async (userId) => {
    try {
      const res = await api.get(`/users/${userId}/activity`);
      setActivity(res.data);
      setSelectedUser(res.data.user);
    } catch (err) {
      console.error(err);
      alert('Failed to load activity');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', full_name: '', role: 'viewer' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>User Management</h2>
        <button onClick={() => setShowCreateModal(true)} style={{ background: '#2ecc71' }}>
          <i className="fas fa-user-plus"></i> Create User
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444' }}>
              <th>ID</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #333', opacity: user.is_active ? 1 : 0.6 }}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.full_name || '-'}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{ padding: '0.25rem' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    style={{
                      background: user.is_active ? '#e74c3c' : '#2ecc71',
                      padding: '0.25rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
                <td>
                  <button onClick={() => handleViewActivity(user.id)} style={{ marginRight: '0.5rem' }}>
                    <i className="fas fa-chart-line"></i> Activity
                  </button>
                  <button onClick={() => handleDelete(user.id)} style={{ background: '#e74c3c' }}>
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1e1e1e',
          padding: '1.5rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <h3>Create New User</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Username *</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Full Name</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              >
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" style={{ background: '#2ecc71' }}>Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Activity Modal */}
      {selectedUser && activity && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1e1e1e',
          padding: '1.5rem',
          borderRadius: '8px',
          maxWidth: '90%',
          maxHeight: '80%',
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <h3>User Activity: {selectedUser.username}</h3>
          <div>
            <h4>Tickets Created</h4>
            <ul>
              {activity.created_tickets.length === 0 ? <li>None</li> :
                activity.created_tickets.map(t => <li key={t.id}>{t.ticket_number} - {t.title}</li>)
              }
            </ul>
            <h4>Tickets Assigned</h4>
            <ul>
              {activity.assigned_tickets.length === 0 ? <li>None</li> :
                activity.assigned_tickets.map(t => <li key={t.id}>{t.ticket_number} - {t.title}</li>)
              }
            </ul>
            <h4>Login History</h4>
            <ul>
              {activity.login_history.length === 0 ? <li>None</li> :
                activity.login_history.map((l, i) => (
                  <li key={i}>{new Date(l.time).toLocaleString()} from {l.ip || 'unknown'}</li>
                ))
              }
            </ul>
          </div>
          <button onClick={() => setSelectedUser(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default Users;