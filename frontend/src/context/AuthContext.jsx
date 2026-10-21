import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  // Có token từ lần trước thì hỏi server xem còn hợp lệ không
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
  // Đăng ký xong backend trả luôn token => đăng nhập luôn
  const register = useCallback(async (payload) => saveSession((await authApi.register(payload)).data), []);
  // Google: đăng nhập nếu đã có tài khoản, chưa có thì tự tạo tài khoản customer mới
  const googleLogin = useCallback(async (credential) => saveSession((await authApi.googleLogin({ credential })).data), []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* bỏ qua, vẫn xóa token phía client */ }
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, googleLogin, logout }), [user, loading, login, register, googleLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}