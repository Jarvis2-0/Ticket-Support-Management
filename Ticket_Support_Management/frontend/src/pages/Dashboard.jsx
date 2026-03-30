import { useEffect, useState, useMemo } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import api from '../services/api';
import Spinner from '../components/Spinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Safe fallbacks for when analytics is null
  const safeData = {
    tickets_by_status: analytics?.tickets_by_status ?? {},
    tickets_by_priority: analytics?.tickets_by_priority ?? {},
    tickets_created_per_day: analytics?.tickets_created_per_day ?? {},
    tickets_per_agent: analytics?.tickets_per_agent ?? {},
    total_tickets: analytics?.total_tickets ?? 0,
    avg_resolution_time_seconds: analytics?.avg_resolution_time_seconds ?? null,
  };

  const ticketsByStatus = safeData.tickets_by_status;
  const ticketsByPriority = safeData.tickets_by_priority;
  const ticketsCreatedPerDay = safeData.tickets_created_per_day;
  const ticketsPerAgent = safeData.tickets_per_agent;

  // Derived values (moved above return)
  const statusLabels = Object.keys(ticketsByStatus);
  const statusCounts = Object.values(ticketsByStatus);
  const statusColors = statusLabels.map((_, i) => `hsl(${(i * 360 / (statusLabels.length || 1)) % 360}, 70%, 60%)`);
  const statusData = useMemo(() => ({
    labels: statusLabels,
    datasets: [{
      label: 'Tickets',
      data: statusCounts,
      backgroundColor: statusColors,
      borderColor: '#fff',
      borderWidth: 1,
    }],
  }), [statusLabels, statusCounts, statusColors]);

  const priorityLabels = Object.keys(ticketsByPriority);
  const priorityCounts = Object.values(ticketsByPriority);
  const priorityColors = priorityLabels.map((_, i) => `hsl(${(i * 360 / (priorityLabels.length || 1)) % 360}, 70%, 60%)`);
  const priorityData = useMemo(() => ({
    labels: priorityLabels,
    datasets: [{
      data: priorityCounts,
      backgroundColor: priorityColors,
    }],
  }), [priorityLabels, priorityCounts, priorityColors]);

  const dailyLabels = Object.keys(ticketsCreatedPerDay);
  const dailyCounts = Object.values(ticketsCreatedPerDay);
  const dailyData = useMemo(() => ({
    labels: dailyLabels,
    datasets: [{
      label: 'Created',
      data: dailyCounts,
      borderColor: '#3498db',
      backgroundColor: 'rgba(52,152,219,0.2)',
      fill: true,
      tension: 0.1,
    }],
  }), [dailyLabels, dailyCounts]);

  const agentLabels = Object.keys(ticketsPerAgent);
  const agentCounts = Object.values(ticketsPerAgent);
  const agentColors = agentLabels.map((_, i) => `hsl(${(i * 360 / (agentLabels.length || 1)) % 360}, 70%, 60%)`);
  const agentData = useMemo(() => ({
    labels: agentLabels,
    datasets: [{
      label: 'Assigned',
      data: agentCounts,
      backgroundColor: agentColors,
      borderColor: '#fff',
      borderWidth: 1,
    }],
  }), [agentLabels, agentCounts, agentColors]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,   // critical to prevent flickering
    animation: {
      duration: 800,
      easing: 'easeOutCubic',
    },
    plugins: {
      legend: { labels: { color: '#e0e0e0' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}` } }
    },
    scales: {
      y: {
        ticks: { color: '#e0e0e0' },
        title: { display: true, text: 'Number of Tickets', color: '#e0e0e0' }
      },
      x: {
        ticks: { color: '#e0e0e0' },
        title: { display: true, text: 'Category', color: '#e0e0e0' }
      },
    },
  }), []);

  const pieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutCubic',
    },
    plugins: {
      legend: { labels: { color: '#e0e0e0' } },
    },
  }), []);

  if (loading) return <Spinner/>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No analytics data available.</div>;

  const totalTickets = safeData.total_tickets;
  const resolvedCount = ticketsByStatus['resolved'] || 0;
  const openCount = ticketsByStatus['open'] || 0;
  const inProgressCount = ticketsByStatus['in_progress'] || 0;
  const avgResolution = safeData.avg_resolution_time_seconds
    ? (safeData.avg_resolution_time_seconds / 3600).toFixed(1)
    : 'N/A';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Analytics Dashboard</h2>
        <button onClick={fetchAnalytics} style={{ background: '#2c3e50' }}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>Total Tickets</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{totalTickets}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>Resolved</h3>
          <p style={{ fontSize: '2rem', margin: 0, color: '#2ecc71' }}>{resolvedCount}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>Open</h3>
          <p style={{ fontSize: '2rem', margin: 0, color: '#e74c3c' }}>{openCount}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>In Progress</h3>
          <p style={{ fontSize: '2rem', margin: 0, color: '#f1c40f' }}>{inProgressCount}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>Avg Resolution</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{avgResolution} hrs</p>
        </div>
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem'
      }}>
        <div className="card">
          <h3>Tickets by Status</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {statusLabels.length > 0 ? (
              <Bar key="status-chart" data={statusData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
        <div className="card">
          <h3>Tickets by Priority</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {priorityLabels.length > 0 ? (
              <Pie key="priority-chart" data={priorityData} options={pieOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
        <div className="card">
          <h3>Daily Tickets (Last 7 Days)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {dailyLabels.length > 0 ? (
              <Line key="daily-chart" data={dailyData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
        <div className="card">
          <h3>Tickets per Agent</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {agentLabels.length > 0 ? (
              <Bar key="agent-chart" data={agentData} options={chartOptions} />
            ) : <p>No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;