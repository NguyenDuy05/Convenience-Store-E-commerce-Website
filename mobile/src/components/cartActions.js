import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../utils/format';

const tap = (type) => { Haptics.notificationAsync(type).catch(() => {}); };

// Thêm nhanh 1 sản phẩm vào giỏ từ thẻ sản phẩm. Chưa đăng nhập thì mở màn hình đăng nhập.
export function useQuickAdd() {
  const { user, setCartCount } = useAuth();
  const nav = useNavigation();
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState(null);
  const add = useCallback(async (product, quantity = 1) => {
    if (!user) { nav.navigate('Login'); return; }
    if (busyId) return;
    setBusyId(product._id);
    try {
      const r = await A.cart.add({ productId: product._id, quantity });
      setCartCount(r.data.itemCount);
      tap(Haptics.NotificationFeedbackType.Success);
      setToast({ ok: true, text: `Đã thêm "${product.name}" vào giỏ` });
    } catch (e) {
      tap(Haptics.NotificationFeedbackType.Error);
      setToast({ ok: false, text: errMsg(e, 'Không thêm được vào giỏ hàng.') });
    } finally {
      setBusyId('');
      setTimeout(() => setToast(null), 2200);
    }
  }, [user, busyId, nav, setCartCount]);
  return { add, busyId, toast };
}

// "Mua lại": thêm lại các sản phẩm của một đơn cũ vào giỏ (bỏ qua món đã ngừng bán / hết hàng)
export function useReorder() {
  const { setCartCount } = useAuth();
  const nav = useNavigation();
  const [busy, setBusy] = useState(false);
  const reorder = useCallback(async (order) => {
    if (busy) return;
    setBusy(true);
    const failed = [];
    let count = null;
    for (const it of order.items) {
      try { count = (await A.cart.add({ productId: it.productId, quantity: it.quantity })).data.itemCount; }
      catch (e) { failed.push(`${it.name}: ${errMsg(e, 'không thêm được')}`); }
    }
    setBusy(false);
    if (count != null) setCartCount(count);
    const ok = order.items.length - failed.length;
    tap(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    if (ok === 0) { Alert.alert('Không mua lại được', failed.join('\n')); return; }
    if (failed.length) Alert.alert(`Đã thêm ${ok}/${order.items.length} sản phẩm`, failed.join('\n'), [{ text: 'Xem giỏ hàng', onPress: () => nav.popTo('Tabs', { screen: 'Cart' }) }]);
    else nav.popTo('Tabs', { screen: 'Cart' });
  }, [busy, nav, setCartCount]);
  return { reorder, busy };
}
