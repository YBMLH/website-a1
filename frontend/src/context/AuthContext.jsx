import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setAccessToken, getAccessToken } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On load, try to restore a session (refresh cookie or stored access token).
  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) {
          const { data } = await api.post('/auth/refresh');
          setAccessToken(data.accessToken);
        }
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
