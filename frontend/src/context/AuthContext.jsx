import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token, u) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    persist(res.token, res.user);
    return res.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.register({ name, email, password });
    persist(res.token, res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* token discard is enough */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
