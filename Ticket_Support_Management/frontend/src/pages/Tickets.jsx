import { Component, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [filters, setFilters] = useState({ status: '', priority: '', assigned_to: '' });
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(100);
  const { user } = useAuth();
  const [assignableUsers, setAssignableUsers] = useState([]); // only agents/admins
  const [allUsers, setAllUsers] = useState([]);
  const [assignedToFilterOptions, setAssignedToFilterOptions] = useState([]); // for filter dropdown

  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, [filters, skip]);

  const fetchTickets = async () => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assigned_to) params.assigned_to = filters.assigned_to;
    if (skip) params.skip = skip;
    if (limit) params.limit = limit;
    const queryString = new URLSearchParams(params).toString();
    try {
      const res = await api.get(`/tickets?${queryString}`);
      setTickets(res.data);
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const assignable = res.data.filter(u => u.role === 'agent' || u.role === 'admin');
      setAssignableUsers(assignable);
      // For filter dropdown: all users (for assigned_to filter)
      setAssignedToFilterOptions(res.data);
      // Build map for creator names
      const map = {};
      res.data.forEach(u => { map[u.id] = u.full_name || u.username; });
      setUsersMap(map);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setSkip(0);
  };

  const handleAssign = async (ticketId, assigneeId) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { assigned_to_id: assigneeId || null });
      fetchTickets(); // refresh list
    } catch (err) {
      console.error('Failed to assign', err);
      alert(err.response?.data?.detail || 'Assignment failed');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    // Optionally, we could prompt for a comment here, but for simplicity just update status
    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      fetchTickets();
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.detail || 'Status update failed');
    }
  };

  const canUpdate = (ticket) => {
    return user.role === 'admin' || (user.role === 'agent' && ticket.assigned_to_id === user.id);
  };

  // For agent, they can reassign only if they are the assignee
  const canReassign = (ticket) => {
    return user.role === 'admin' || (user.role === 'agent' && ticket.assigned_to_id === user.id);
  };

  if (loading) return <Spinner/>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Support Tickets</h2>
        <div>
          <button onClick={fetchTickets} style={{ marginRight: '0.5rem', background: '#2c3e50' }}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
          {user.role !== 'agent' &&(
          <Link to="/tickets/new">
            <button style={{ background: '#2ecc71' }}>
              <i className="fas fa-plus"></i> Create Ticket
            </button>
          </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px'
      }}>
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select name="priority" value={filters.priority} onChange={handleFilterChange}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select name="assigned_to" value={filters.assigned_to} onChange={handleFilterChange}>
          <option value="">All Agents</option>
          {assignedToFilterOptions.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.username} ({u.role})
            </option>
          ))}
        </select>
        <button onClick={fetchTickets}>Apply Filters</button>
      </div>

      {/* Tickets as Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {tickets.length === 0 ? (
          <p>No tickets found.</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="card">
              <Link to={`/tickets/${ticket.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3>
                  {ticket.priority === 'high' && <i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c' }}></i>}
                  {ticket.priority === 'medium' && <i className="fas fa-chart-line" style={{ color: '#f1c40f' }}></i>}
                  {ticket.priority === 'low' && <i className="fas fa-arrow-down" style={{ color: '#2ecc71' }}></i>}
                  {' '}{ticket.title}
                </h3>
                <p style={{ color: '#aaa' }}>{ticket.description.substring(0, 100)}...</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <span><strong>Status:</strong> {ticket.status}</span>
                  <span><strong>Priority:</strong> {ticket.priority}</span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Created by:</strong> {usersMap[ticket.created_by_id] || ticket.created_by_id}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Assigned to:</strong> {usersMap[ticket.assigned_to_id] || ticket.assigned_to_id || 'Unassigned'}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>
                  <strong>Views:</strong> {ticket.view_count || 0}
                </div>
              </Link>
              {(canUpdate(ticket)) && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #444', paddingTop: '0.5rem' }}>
                  {canReassign(ticket) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label>Assign to:</label>
                      <select
                        value={ticket.assigned_to_id || ''}
                        onChange={(e) => handleAssign(ticket.id, e.target.value)}
                        style={{ marginLeft: '0.5rem', width: 'calc(100% - 70px)' }}
                      >
                        <option value="">Unassigned</option>
                        {assignableUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.username} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label>Update Status:</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      style={{ marginLeft: '0.5rem', width: 'calc(100% - 70px)' }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tickets;