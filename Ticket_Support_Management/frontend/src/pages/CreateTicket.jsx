import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateTicket = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch assignable users if admin
    if (user?.role === 'admin') {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users');
          // Filter to agents and admins only
          const agentsAndAdmins = res.data.filter(u => u.role === 'agent' || u.role === 'admin');
          setUsers(agentsAndAdmins);
        } catch (err) {
          console.error('Failed to fetch users', err);
        }
      };
      fetchUsers();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { title, description, priority };
    if (user.role === 'admin' && assignedTo) {
      data.assigned_to_id = parseInt(assignedTo, 10);
    }
    try {
      await api.post('/tickets', data);
      navigate('/tickets');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to create ticket');
    }
  };

  return (
    <div>
      <h2>Create New Ticket</h2>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows="4"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {user.role === 'admin' && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Assign to</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
                  <option value="">Unassigned</option>
                   {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username} ({u.role})
                  </option>
                  ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            style={{
              background: '#2ecc71',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Create Ticket
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;