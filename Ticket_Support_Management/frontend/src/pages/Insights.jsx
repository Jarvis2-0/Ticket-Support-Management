import { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../services/api';
import Spinner from '../components/Spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Insights = () => {
  const [oldData, setOldData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states for recent activity
  const [activityPage, setActivityPage] = useState(1);
  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTotal, setActivityTotal] = useState(0);
  const perPage = 10;

  // Pagination states for tickets with creators
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsData, setTicketsData] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsTotal, setTicketsTotal] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [activityPage]);

  useEffect(() => {
    fetchTickets();
  }, [ticketsPage]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Fetching insights data...');
      const [oldRes, statsRes] = await Promise.all([
        api.get('/admin/insights'),
        api.get('/admin/user-activity')
      ]);
      setOldData(oldRes.data);
      setUserStats(statsRes.data);
    } catch (err) {
      console.error('❌ Failed to load insights:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get(`/admin/recent-activity?page=${activityPage}&per_page=${perPage}`);
      setActivityData(res.data.items || []);
      setActivityTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await api.get(`/admin/tickets-with-creators?page=${ticketsPage}&per_page=${perPage}`);
      setTicketsData(res.data.items || []);
      setTicketsTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutCubic' },
    plugins: {
      legend: { labels: { color: '#e0e0e0' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}` } }
    },
    scales: {
      y: { ticks: { color: '#e0e0e0' }, title: { display: true, text: 'Number of Tickets', color: '#e0e0e0' } },
      x: { ticks: { color: '#e0e0e0' }, title: { display: true, text: 'User', color: '#e0e0e0' } },
    },
  }), []);

  if (loading) return <Spinner />;
  if (error) return <div>Error: {error}</div>;
  if (!oldData || !userStats) return <div>No data available.</div>;

  const createdLabels = Object.keys(oldData.tickets_created_per_user || {});
  const createdCounts = Object.values(oldData.tickets_created_per_user || {});
  const createdData = {
    labels: createdLabels,
    datasets: [{ label: 'Tickets Created', data: createdCounts, backgroundColor: '#3498db' }]
  };

  const assignedLabels = Object.keys(oldData.tickets_assigned_per_user || {});
  const assignedCounts = Object.values(oldData.tickets_assigned_per_user || {});
  const assignedData = {
    labels: assignedLabels,
    datasets: [{ label: 'Tickets Assigned', data: assignedCounts, backgroundColor: '#9b59b6' }]
  };

  const loginLabels = Object.keys(oldData.login_counts_last_week || {});
  const loginCounts = Object.values(oldData.login_counts_last_week || {});
  const loginData = {
    labels: loginLabels,
    datasets: [{ label: 'Logins (last 7 days)', data: loginCounts, backgroundColor: '#2ecc71' }]
  };

  const users = userStats.users || [];
  const backgroundColors = users.map((_, i) => `hsl(${(i * 360 / (users.length || 1)) % 360}, 70%, 60%)`);
  const colorfulChartData = {
    labels: users.map(u => u.full_name || u.username),
    datasets: [{
      label: 'Tickets Created',
      data: users.map(u => u.tickets_created || 0),
      backgroundColor: backgroundColors,
      borderColor: '#fff',
      borderWidth: 1,
    }],
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
  };
  const thStyle = {
    textAlign: 'left',
    padding: '0.75rem',
    borderBottom: '1px solid #444',
    fontWeight: 'bold',
  };
  const tdStyle = {
    textAlign: 'left',
    padding: '0.75rem',
    borderBottom: '1px solid #333',
    verticalAlign: 'top',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Admin Insights</h2>
        <button onClick={fetchAllData} style={{ background: '#2c3e50' }}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Original three charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3>Tickets Created per User</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {createdLabels.length > 0 ? (
              <Bar data={createdData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
        <div className="card">
          <h3>Tickets Assigned per User</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {assignedLabels.length > 0 ? (
              <Bar data={assignedData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
        <div className="card">
          <h3>Login Counts (Last 7 Days)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {loginLabels.length > 0 ? (
              <Bar data={loginData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
      </div>

      {/* New colorful chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Tickets Created per User</h3>
        <div style={{ height: '300px', width: '100%' }}>
          {users.length > 0 ? (
            <Bar data={colorfulChartData} options={chartOptions} />
          ) : (
            <p>No users found.</p>
          )}
        </div>
      </div>

      {/* Paginated Recent Activity */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Recent Activity</h3>
        {activityLoading ? (
          <Spinner />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Ticket ID</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Old</th>
                    <th style={thStyle}>New</th>
                    <th style={thStyle}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activityData.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No activity found.</td></tr>
                  ) : (
                    activityData.map((act, idx) => (
                      <tr key={idx}>
                        <td style={tdStyle}>{act.ticket_number || act.ticket_id}</td>
                        <td style={tdStyle}>{act.user}</td>
                        <td style={tdStyle}>{act.action}</td>
                        <td style={tdStyle}>{act.old_value}</td>
                        <td style={tdStyle}>{act.new_value}</td>
                        <td style={tdStyle}>{new Date(act.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                disabled={activityPage === 1}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Previous
              </button>
              <span>Page {activityPage} of {Math.ceil(activityTotal / perPage) || 1}</span>
              <button
                onClick={() => setActivityPage(p => p + 1)}
                disabled={activityPage * perPage >= activityTotal}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Paginated All Tickets with Creators */}
      <div className="card">
        <h3>All Tickets</h3>
        {ticketsLoading ? (
          <Spinner />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Ticket Number</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Creator</th>
                    <th style={thStyle}>Creator Role</th>
                    <th style={thStyle}>Created At</th>
                    <th style={thStyle}>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsData.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>No tickets found.</td></tr>
                  ) : (
                    ticketsData.map(ticket => (
                      <tr key={ticket.id}>
                        <td style={tdStyle}>{ticket.ticket_number}</td>
                        <td style={tdStyle}>{ticket.title}</td>
                        <td style={tdStyle}>{ticket.status}</td>
                        <td style={tdStyle}>{ticket.priority}</td>
                        <td style={tdStyle}>{ticket.creator_full_name || ticket.creator_username}</td>
                        <td style={tdStyle}>{ticket.creator_role}</td>
                        <td style={tdStyle}>{new Date(ticket.created_at).toLocaleString()}</td>
                        <td style={tdStyle}>{ticket.assigned_to_id || 'Unassigned'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                disabled={ticketsPage === 1}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Previous
              </button>
              <span>Page {ticketsPage} of {Math.ceil(ticketsTotal / perPage) || 1}</span>
              <button
                onClick={() => setTicketsPage(p => p + 1)}
                disabled={ticketsPage * perPage >= ticketsTotal}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Insights;