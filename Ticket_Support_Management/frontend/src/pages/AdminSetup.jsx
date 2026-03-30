import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminSetup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/setup-admin', {
        username,
        password,
        full_name: fullName,
        role: 'admin' // automatically set to admin
      });
      setSuccess('Admin account created! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create admin');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#010101'
    }}>
      <div className="card" style={{
        background: '#020202',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgb(0, 255, 68)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Create Admin Account</h2>
        {error && <p style={{ color: '#e74c3c', textAlign: 'center' }}>{error}</p>}
        {success && <p style={{ color: '#2ecc71', textAlign: 'center' }}>{success}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2c2c2c', color: '#e0e0e0' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name (optional)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2c2c2c', color: '#e0e0e0' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2c2c2c', color: '#e0e0e0' }}
            />
          </div>
          <button type="submit" style={{
            width: '100%',
            padding: '0.75rem',
            background: '#b13dd5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}>
            Create Admin
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup;