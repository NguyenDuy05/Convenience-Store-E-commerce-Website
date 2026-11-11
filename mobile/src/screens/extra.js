import { Image, Linking, Pressable, View } from 'react-native';
import { imageUri } from '../config';
import QRCode from 'react-native-qrcode-svg';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { useQuickAdd } from '../components/cartActions';
import { Badge, Banner, Button, Card, Empty, ErrorView, H, Icon, Loading, Muted, ProductCard, Screen, Stars, T, Text, Toast } from '../components/ui';
import { colors, radius } from '../theme';
import { formatDate, formatNumber } from '../utils/format';
import { DAYS, mapsUrl, storeStatus } from '../utils/store';
import { VoucherTicket } from './shop';
import { useFavorites, useRecentlyViewed } from '../utils/storage';

// Thẻ thành viên điện tử: nhân viên quét mã khi khách thanh toán tại quầy để tích điểm (giống 7Rewards / GS25)
export function MemberCardScreen() {
  const { user } = useAuth();
  const d = useLoad(() => A.membership.me().then((r) => r.data), []);
  if (!user) return <NeedLogin />;
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const m = d.data;
  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primary, alignItems: 'center', gap: 12, paddingVertical: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>QUICK MEMBER</Text>
          {m.tier ? <Badge icon="ribbon" tone="warn" label={m.tier.name} /> : null}
        </View>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: radius.lg }}>
          <QRCode value={m.memberCode} size={200} color={colors.text} backgroundColor="#fff" />
        </View>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 }}>{m.memberCode}</Text>
        <Text style={{ color: '#d8e2ff' }}>{m.fullName || user.fullName}</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{formatNumber(m.points)} <Text style={{ fontSize: 14, fontWeight: '600' }}>điểm</Text></Text>
      </Card>
      <Banner tone="info" icon="scan-outline" title="Đưa mã này cho nhân viên khi thanh toán tại quầy"
        text="Nhân viên quét mã để ghi nhận bạn là thành viên. Đơn đặt trong app được tích điểm tự động khi bạn nhận hàng (10.000₫ = 1 điểm)." />
    </Screen>
  );
}

// Thông tin cửa hàng: giờ mở cửa cả tuần, gọi điện, chỉ đường, đánh giá
export function StoreInfoScreen({ navigation }) {
  const d = useLoad(async () => {
    const [stores, reviews] = await Promise.all([A.stores.list(), A.reviews.ofStore({ limit: 10 }).catch(() => ({ data: { items: [] } }))]);
    return { store: (stores.data || [])[0] || null, reviews: reviews.data.items || [] };
  }, []);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { store, reviews } = d.data;
  if (!store) return <Empty icon="storefront-outline" title="Chưa có thông tin cửa hàng" />;
  const st = storeStatus(store);
  const today = new Date().getDay();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const hours = [...(store.openingHours || [])].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <H style={{ flex: 1, fontSize: 20 }}>{store.name}</H>
          {st ? <Badge label={st.open ? 'Đang mở' : 'Đóng cửa'} tone={st.open ? 'success' : 'error'} /> : null}
        </View>
        {st ? <Muted>{st.text}</Muted> : null}
        {store.address ? <T>📍 {store.address}</T> : null}
        {store.phone ? <T>📞 {store.phone}</T> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {store.phone ? <Button title="Gọi cửa hàng" icon="call-outline" variant="soft" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${store.phone}`)} /> : null}
          <Button title="Chỉ đường" icon="navigate-outline" style={{ flex: 1 }} onPress={() => Linking.openURL(mapsUrl(store))} />
        </View>
      </Card>
      <Card>
        <H>Giờ mở cửa</H>
        {hours.map((h) => (
          <View key={h.day} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: h.day === today ? colors.primaryFixed : 'transparent' }}>
            <T style={{ fontWeight: h.day === today ? '800' : '500' }}>{DAYS[h.day]}{h.day === today ? ' (hôm nay)' : ''}</T>
            <T style={{ fontWeight: h.day === today ? '800' : '500', color: h.isClosed ? colors.error : colors.text }}>{h.isClosed ? 'Nghỉ' : `${h.openTime} - ${h.closeTime}`}</T>
          </View>
        ))}
      </Card>
      <Card>
        <Muted>Mọi đơn đặt trong app đều nhận tại cửa hàng này. Cửa hàng không giao hàng tận nơi.</Muted>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H>Đánh giá cửa hàng</H>
          {reviews.length ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Stars value={avg} size={14} /><Muted>{avg.toFixed(1)}</Muted></View> : null}
        </View>
        {reviews.length === 0 ? <Muted>Chưa có đánh giá nào.</Muted> : reviews.map((r) => (
          <View key={r._id} style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>{r.customerId?.fullName || 'Khách hàng'}</T><Stars value={r.rating} size={13} /></View>
            {r.comment ? <Muted>{r.comment}</Muted> : null}
            <Muted>{formatDate(r.createdAt)}</Muted>
          </View>
        ))}
        <Button title="Viết đánh giá" variant="ghost" icon="create-outline" onPress={() => navigation.navigate('MyReviews')} />
      </Card>
    </Screen>
  );
}

export function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const fav = useFavorites(user?.id);
  const recent = useRecentlyViewed(user?.id);
  const { add, busyId, toast } = useQuickAdd();
  const grid = (list, removable) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {list.map((p) => (
        <View key={p._id} style={{ width: '47.5%' }}>
          <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { id: p._id })} onAdd={() => add(p)} adding={busyId === p._id}
            favorite={fav.has(p._id)} onFavorite={() => (removable ? fav.remove(p._id) : fav.toggle(p))} />
        </View>
      ))}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H>Sản phẩm yêu thích ({fav.items.length})</H>
        {fav.items.length === 0 ? <Card><Muted>Chạm vào biểu tượng ♡ trên sản phẩm để lưu vào đây và mua lại nhanh hơn.</Muted></Card> : grid(fav.items, true)}
        {fav.items.length > 0 ? <Muted>Giá và tồn kho có thể đã thay đổi, mở sản phẩm để xem thông tin mới nhất.</Muted> : null}
        {recent.items.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <H>Đã xem gần đây</H>
              <Pressable onPress={recent.clear}><Text style={{ color: colors.primary, fontWeight: '700' }}>Xóa</Text></Pressable>
            </View>
            {grid(recent.items, false)}
          </>
        )}
      </Screen>
      <Toast toast={toast} />
    </View>
  );
}

// Kho voucher: các mã giảm giá khách đang dùng được (giống "Kho quà" của CK Club / GS25)
export function VouchersScreen({ navigation }) {
  const { user } = useAuth();
  const d = useLoad(async () => (user ? (await A.discountCodes.available()).data.items || [] : []), [user?.id], { reloadOnFocus: true });
  if (!user) return <NeedLogin title="Đăng nhập để xem voucher" />;
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Image source={{ uri: imageUri('/uploads/banners/voucher-1111.png') }} style={{ width: '100%', aspectRatio: 990 / 280 }} resizeMode="contain" accessibilityLabel="11.11 Voucher Xtra" />
      <Banner tone="info" icon="ticket-outline" text="Chọn voucher ở bước xác nhận đơn hàng. Mỗi đơn dùng được một mã, có thể dùng chung với điểm thành viên." />
      {d.data.length === 0 ? <Empty icon="ticket-outline" title="Chưa có voucher" text="Hiện chưa có mã giảm giá nào bạn dùng được. Quay lại sau nhé!" /> :
        d.data.map((c) => <VoucherTicket key={c._id} c={c} action="Mua ngay" onPress={() => navigation.popTo('Tabs', { screen: 'Products' })} />)}
    </Screen>
  );
}
