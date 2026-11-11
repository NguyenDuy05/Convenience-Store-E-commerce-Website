import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import * as api from '../api/notification.api';

const Context = createContext(null);
// Đường dẫn mở khi bấm vào một thông báo
export const notificationPath = (role) => role === 'admin' ? '/admin/inbox' : role === 'staff' ? '/staff/notifications' : '/notifications';
export const notificationTypes = { general: "General", order: "Orders", payment: "Payment", event: "Events", voucher: 'Voucher', promotion: "Promotions" };
export const notificationIcons = { general: 'notifications', order: 'shopping_bag', payment: 'payments', event: 'event', voucher: 'sell', promotion: 'campaign' };

// Tải và làm mới thông báo định kỳ, cung cấp cho toàn ứng dụng
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const userId = user?.id;
  const generation = useRef(0);
  const requestNumber = useRef(0);
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { generation.current += 1; setData({ items: [], unreadCount: 0 }); setError(''); setLoading(false); }, [userId]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const current = generation.current;
    const number = ++requestNumber.current;
    setLoading(true);
    try {
      const response = await api.listNotifications({ limit: 6 });
      if (current !== generation.current || number !== requestNumber.current) return;
      setData(response.data); setError('');
    } catch (err) {
      if (current === generation.current && number === requestNumber.current) setError(err.response?.data?.message || "Could not load notifications.");
    } finally { if (current === generation.current && number === requestNumber.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    if (!userId) return undefined;
    refresh();
    const update = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(update, 20000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [refresh, pathname, userId]);
  const markRead = useCallback(async (id) => { await api.readNotification(id); await refresh(); }, [refresh]);
  const markAll = useCallback(async () => { await api.readAllNotifications(); await refresh(); }, [refresh]);
  const value = useMemo(() => ({ ...data, loading, error, refresh, markRead, markAll }), [data, loading, error, refresh, markRead, markAll]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
// Hook lấy dữ liệu thông báo
export const useNotifications = () => useContext(Context);
