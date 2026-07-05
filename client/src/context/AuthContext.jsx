import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginService, register as registerService, getMe } from '../services/authService';
import { initSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext(null);

const USER_KEY = 'moviesync_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!user?.token) { setLoading(false); return; }
      try {
        const me = await getMe();
        const updated = { ...user, ...me };
        setUser(updated);
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        initSocket(user.token);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginService(email, password);
    setUser(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    initSocket(data.token);
    return data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await registerService(username, email, password);
    setUser(data);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    initSocket(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
