import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
const TicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [comment, setComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [newComment, setNewComment] = useState(''); // for standalone comment
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTicket();
    fetchHistory();
    if (user.role === 'admin' || user.role === 'agent') {
      fetchUsers();
    }
  }, []);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
      setSelectedStatus(res.data.status);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/tickets/${id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      // Only agents and admins are assignable
      const agents = res.data.filter(u => u.role === 'agent' || u.role === 'admin');
      setUsers(agents);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (updates) => {
    try {
      await api.patch(`/tickets/${id}`, updates);
      fetchTicket();
      fetchHistory(); // refresh history after update
    } catch (err) {
      console.error('Update failed', err);
      alert(err.response?.data?.detail || 'Update failed');
    }
  };

  const handleStatusChange = async () => {
    if (selectedStatus === ticket.status) {
      setShowCommentBox(false);
      return;
    }
    const updateData = { status: selectedStatus };
    if (comment.trim()) {
      updateData.comment = comment.trim();
    }
    await handleUpdate(updateData);
    setComment('');
    setShowCommentBox(false);
  };

  const handleAssign = async (assigneeId) => {
    await handleUpdate({ assigned_to_id: assigneeId || null });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.post(`/tickets/${id}/comments`, { comment: newComment });
      setNewComment('');
      fetchHistory(); // refresh history
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add comment');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this ticket?')) {
      try {
        await api.delete(`/tickets/${id}`);
        navigate('/tickets');
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };
  if (!ticket) return <Spinner />;
  const canUpdate = user.role === 'admin' || (user.role === 'agent' && ticket.assigned_to_id === user.id);
  const canReassign = user.role === 'admin' || (user.role === 'agent' && ticket.assigned_to_id === user.id);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link to="/tickets">
          <button style={{ background: '#95a5a6', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
            <i className="fas fa-arrow-left"></i> Back to Tickets
          </button>
        </Link>
        <h2>Ticket {ticket.ticket_number}</h2>
      </div>

      <div className="card">
        <h3>{ticket.title}</h3>
        <p>{ticket.description}</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.5rem',
          marginTop: '1rem'
        }}>
          <div><strong>Status:</strong> {ticket.status}</div>
          <div><strong>Priority:</strong> {ticket.priority}</div>
          <div><strong>Created by:</strong> {ticket.created_by_id}</div>
          <div><strong>Assigned to:</strong> {ticket.assigned_to_id || 'Unassigned'}</div>
          <div><strong>Created at:</strong> {new Date(ticket.created_at).toLocaleString()}</div>
          {ticket.resolved_at && <div><strong>Resolved at:</strong> {new Date(ticket.resolved_at).toLocaleString()}</div>}
          <div><strong>Views:</strong> {ticket.view_count || 0}</div>
        </div>

        {canUpdate && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
            {canReassign && (
              <div style={{ marginBottom: '1rem' }}>
                <label><strong>Assign to:</strong></label>
                <select
                  value={ticket.assigned_to_id || ''}
                  onChange={(e) => handleAssign(e.target.value)}
                  style={{ marginLeft: '0.5rem', width: 'calc(100% - 80px)' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label><strong>Update Status:</strong></label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setShowCommentBox(true);
                }}
                style={{ marginLeft: '0.5rem', width: 'calc(100% - 80px)' }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              {showCommentBox && (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea
                    placeholder="Add a comment (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2c2c2c', color: '#e0e0e0' }}
                    rows="2"
                  />
                  <button
                    onClick={handleStatusChange}
                    style={{ marginTop: '0.5rem', background: '#2ecc71', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {user.role === 'admin' && (
          <button
            onClick={handleDelete}
            style={{ marginTop: '1rem', background: '#e74c3c', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            <i className="fas fa-trash"></i> Delete Ticket
          </button>
        )}
      </div>

      {/* Add Comment Section */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Add a Comment</h3>
        <textarea
          placeholder="Type your comment here..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2c2c2c', color: '#e0e0e0', marginBottom: '0.5rem' }}
          rows="3"
        />
        <button onClick={handleAddComment} style={{ background: '#3498db', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
          Post Comment
        </button>
      </div>

      {/* History Section */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Activity History</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <p>No activity yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {history.map((entry, idx) => {
                let actionText = '';
                if (entry.action === 'created') {
                  actionText = `created ticket: ${entry.new_value}`;
                } else if (entry.action === 'assigned') {
                  if (entry.old_value && entry.old_value !== '?') {
                    actionText = `reassigned from ${entry.old_value} to ${entry.new_value}`;
                  } else {
                    actionText = `assigned to ${entry.new_value}`;
                  }
                } else if (entry.action === 'status') {
                  actionText = `changed status from ${entry.old_value} to ${entry.new_value}`;
                } else if (entry.action === 'comment') {
                  actionText = `added a comment`;
                } else {
                  actionText = `${entry.action} from ${entry.old_value || '?'} to ${entry.new_value || '?'}`;
                }
                return (
                  <li key={idx} style={{ borderBottom: '1px solid #333', padding: '0.5rem 0' }}>
                    <div>
                      <strong>{entry.user_name}</strong> {actionText}
                      <span style={{ float: 'right', color: '#aaa', fontSize: '0.8rem' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.comment && <div style={{ marginTop: '0.25rem', color: '#ccc', fontSize: '0.9rem' }}>📝 {entry.comment}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;