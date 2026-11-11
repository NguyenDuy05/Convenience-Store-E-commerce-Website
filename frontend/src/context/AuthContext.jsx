import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api';

export const AuthContext = createContext(null);

// Lưu người đang đăng nhập; cung cấp login, register, googleLogin, logout
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    authApi.getMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = useCallback(async (email, password) => saveSession((await authApi.login({ email, password })).data), []);
  const register = useCallback(async (payload) => saveSession((await authApi.register(payload)).data), []);
  const googleLogin = useCallback(async (credential) => saveSession((await authApi.googleLogin({ credential })).data), []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { }
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, googleLogin, logout }), [user, loading, login, register, googleLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
