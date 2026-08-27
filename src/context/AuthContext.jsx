import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken, ApiError } from '../lib/api';

const AuthContext = createContext(null);

// The backend's /auth/login and /auth/profile endpoints return the
// user in two different shapes (camelCase vs. snake_case) — normalize
// here so nothing downstream has to know that.
const normalizeUser = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    username: raw.username,
    email: raw.email,
    firstName: raw.firstName ?? raw.first_name,
    lastName: raw.lastName ?? raw.last_name,
    role: raw.role,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // On first load, if a token is already stored, verify it's still
  // valid and fetch the current user rather than trusting stale
  // localStorage state.
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get('/auth/profile')
      .then((data) => setUser(normalizeUser(data.user || data)))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    setToken(data.token);
    const normalized = normalizeUser(data.user);
    setUser(normalized);
    return normalized;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { ApiError };

