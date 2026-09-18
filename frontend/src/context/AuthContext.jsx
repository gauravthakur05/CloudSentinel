import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cs_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState(null);

  const persist = (token, userObj) => {
    localStorage.setItem('cs_token', token);
    localStorage.setItem('cs_user', JSON.stringify(userObj));
    setUser(userObj);
  };

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await client.post('/api/auth/login', { email, password });
      persist(res.data.token, res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return false;
    }
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    setError(null);
    try {
      const res = await client.post('/api/auth/register', { name, email, password, role });
      persist(res.data.token, res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
