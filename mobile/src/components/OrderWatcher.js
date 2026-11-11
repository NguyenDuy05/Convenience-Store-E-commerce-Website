import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import { Icon, Text } from './ui';
import { colors, radius, shadow } from '../theme';

const POLL_MS = 30000;

// Các màn hình đăng ký để tự tải lại khi có đơn đổi trạng thái
const listeners = new Set();
export function useOrderChanges(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const h = (ids) => ref.current(ids); listeners.add(h); return () => listeners.delete(h); }, []);
}
// Thông báo trong app khi đơn đổi trạng thái (thay cho push notification khi chưa có push server)
const MESSAGE = {
  confirmed: { icon: 'checkmark-done', color: colors.primary, text: (c) => `Đơn ${c} đã được xác nhận` },
  preparing: { icon: 'cube', color: colors.primary, text: (c) => `Cửa hàng đang chuẩn bị đơn ${c}` },
  ready_for_pickup: { icon: 'storefront', color: colors.secondary, text: (c) => `Đơn ${c} đã sẵn sàng, mời bạn đến nhận!` },
  completed: { icon: 'checkmark-circle', color: colors.secondary, text: (c) => `Bạn đã nhận đơn ${c}. Cảm ơn bạn!` },
  cancelled: { icon: 'close-circle', color: colors.error, text: (c) => `Đơn ${c} đã bị hủy` },
  failed: { icon: 'alert-circle', color: colors.error, text: (c) => `Đơn ${c} đã hết hạn thanh toán` },
};

export default function OrderWatcher({ navRef }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const snapshot = useRef(null);
  const [notice, setNotice] = useState(null);
  const hideTimer = useRef(null);

  const check = useCallback(async () => {
    if (!user || user.role !== 'customer') return;
    let items;
    try { items = (await A.orders.list({ limit: 20 })).data.items || []; } catch { return; }
    const next = new Map(items.map((o) => [o._id, o.status]));
    const prev = snapshot.current;
    snapshot.current = next;
    if (!prev) return;   // lần đầu chỉ ghi nhận, không báo
    const changed = items.filter((o) => prev.has(o._id) && prev.get(o._id) !== o.status && MESSAGE[o.status]);
    if (!changed.length) return;
    listeners.forEach((h) => { try { h(changed.map((o) => o._id)); } catch { /* bỏ qua */ } });
    const pick = changed.find((o) => o.status === 'ready_for_pickup') || changed[0];
    setNotice({ id: pick._id, status: pick.status, code: pick.orderCode, more: changed.length - 1 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setNotice(null), 12000);
  }, [user]);

  useEffect(() => {
    snapshot.current = null;
    setNotice(null);
    if (!user) return undefined;
    check();
    let timer = setInterval(check, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      clearInterval(timer);
      if (s === 'active') { check(); timer = setInterval(check, POLL_MS); }
    });
    return () => { clearInterval(timer); sub.remove(); clearTimeout(hideTimer.current); };
  }, [user, check]);

  if (!notice) return null;
  const m = MESSAGE[notice.status];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
      <Pressable
        onPress={() => { setNotice(null); if (navRef?.isReady()) navRef.navigate('OrderDetail', { id: notice.id }); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, borderLeftWidth: 5, borderLeftColor: m.color, ...shadow, elevation: 8 }}>
        <Icon name={m.icon} size={26} color={m.color} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{m.text(notice.code)}</Text>
          <Text style={{ color: colors.textVariant, fontSize: 12 }}>{notice.more > 0 ? `và ${notice.more} cập nhật khác · ` : ''}Chạm để xem đơn</Text>
        </View>
        <Pressable onPress={() => setNotice(null)} hitSlop={10}><Icon name="close" size={18} color={colors.outline} /></Pressable>
      </Pressable>
    </View>
  );
}
