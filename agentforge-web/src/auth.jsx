import { useEffect, useState } from 'react';
import { api } from './api';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('af_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('af-unauthorized', onUnauthorized);
    return () => window.removeEventListener('af-unauthorized', onUnauthorized);
  }, []);

  function persist(auth) {
    localStorage.setItem('af_token', auth.token);
    const u = { userId: auth.userId, email: auth.email, displayName: auth.displayName };
    localStorage.setItem('af_user', JSON.stringify(u));
    setUser(u);
  }

  async function login(email, password) {
    persist(await api.login({ email, password }));
  }

  async function register(email, password, displayName) {
    persist(await api.register({ email, password, displayName }));
  }

  function logout() {
    localStorage.removeItem('af_token');
    localStorage.removeItem('af_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
