import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, error } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'analyst' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const success =
      mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, form.role);
    setSubmitting(false);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>CloudSentinel</h1>
        <p className="auth-subtitle">Intelligent cloud log monitoring &amp; anomaly detection</p>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            type="button"
          >
            Log in
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </label>
          {mode === 'register' && (
            <label>
              Role
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
