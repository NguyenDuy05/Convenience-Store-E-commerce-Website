import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, onUnauthorized, setSessionToken, errorText } from '../services/api';
import { secure } from '../services/storage';

const Session = createContext(null);
export const useSession = () => useContext(Session);
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [restoreError, setRestoreError] = useState('');
  const client = useQueryClient();
  const generation = useRef(0);
  const clear = useCallback(async () => {
    generation.current += 1;
    setSessionToken(null);
    setUser(null);
    setRestoreError('');
    await client.cancelQueries();
    client.clear();
    await secure.remove('quick.token');
  }, [client]);
  const restore = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setRestoreError('');
    try {
      const saved = await secure.get('quick.token');
      if (!saved) return;
      setSessionToken(saved);
      const me = await get('/auth/me');
      if (me.role !== 'customer') {
        await clear();
        return;
      }
      if (version === generation.current) setUser(me);
    } catch (e) {
      if (e.response?.status === 401) await clear();
      else setRestoreError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [clear]);
  useEffect(() => {
    Promise.resolve().then(restore);
    return onUnauthorized(() => {
      clear().catch(() =>
        setRestoreError('Unable to clear the saved session. Please restart the app.'),
      );
    });
  }, [restore, clear]);
  const signIn = async (path, values) => {
    const result = await post(path, values);
    if (result.user.role !== 'customer')
      throw new Error(
        'This app is for customer accounts. Please use the website for staff and admin.',
      );
    await secure.set('quick.token', result.token);
    generation.current += 1;
    await client.cancelQueries();
    client.clear();
    setSessionToken(result.token);
    setUser(result.user);
    setRestoreError('');
  };
  const logout = async () => {
    try {
      await post('/auth/logout');
    } finally {
      await clear();
    }
  };
  return (
    <Session.Provider
      value={{ user, loading, restoreError, restore, signIn, logout, clear, setUser }}
    >
      {children}
    </Session.Provider>
  );
}
