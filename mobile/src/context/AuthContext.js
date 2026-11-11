import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as A from '../api';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const clear = useCallback(async () => { await tokenStore.clear(); setUser(null); setCartCount(0); }, []);
  useEffect(() => { setUnauthorizedHandler(() => { clear(); }); }, [clear]);

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (t) { try { setUser((await A.auth.me()).data); } catch { await tokenStore.clear(); } }
      setLoading(false);
    })();
  }, []);

  const save = async (data) => { await tokenStore.set(data.token); setUser(data.user); return data.user; };
  const login = useCallback(async (email, password) => save((await A.auth.login({ email, password })).data), []);
  const register = useCallback(async (payload) => save((await A.auth.register(payload)).data), []);
  const logout = useCallback(async () => { try { await A.auth.logout(); } catch { /* vẫn đăng xuất phía app */ } await clear(); }, [clear]);
  const refreshCart = useCallback(async () => {
    try { setCartCount((await A.cart.get()).data.itemCount || 0); } catch { /* bỏ qua */ }
  }, []);
  useEffect(() => { if (user?.role === 'customer') refreshCart(); }, [user, refreshCart]);

  const value = useMemo(() => ({ user, loading, login, register, logout, cartCount, setCartCount, refreshCart, setUser }),
    [user, loading, login, register, logout, cartCount, refreshCart]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
