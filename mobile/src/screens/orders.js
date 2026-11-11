import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useReorder } from '../components/cartActions';
import { useOrderChanges } from '../components/OrderWatcher';
import { mapsUrl } from '../utils/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { Badge, Banner, Button, Card, Chip, Divider, Empty, ErrorView, H, Icon, Loading, Muted, Row, Screen, T, Text, Thumb } from '../components/ui';
import { colors, radius } from '../theme';
import { errMsg, formatCurrency, formatDateTime } from '../utils/format';
import { ORDER_STATUS, ORDER_STATUS_MESSAGE, ORDER_TABS, PAYMENT_METHOD, PAYMENT_STATUS, SHOW_PICKUP_CODE, paymentSummary } from '../utils/orderMeta';
import { buildTimeline } from '../utils/orderTimeline';
import CancelSheet, { reasonVi } from '../components/CancelSheet';

export const StatusBadge = ({ status }) => { const m = ORDER_STATUS[status] || { label: status, tone: 'neutral' }; return <Badge label={m.label} tone={m.tone} icon={m.icon} />; };

function OrderCard({ o, onPress }) {
  const first = o.items?.[0];
  const more = (o.itemCount || o.items?.length || 0) - 1;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</Text><StatusBadge status={o.status} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Thumb uri={first?.image} size={46} />
        <View style={{ flex: 1 }}>
          <T numberOfLines={1} style={{ fontWeight: '600' }}>{first?.name}</T>
          <Muted>{more > 0 ? `và ${more} sản phẩm khác` : `x${first?.quantity || 1}`}</Muted>
        </View>
        <T style={{ fontWeight: '800' }}>{formatCurrency(o.totalAmount)}</T>
      </View>
      <Muted>{formatDateTime(o.createdAt)} · {paymentSummary(o)}</Muted>
    </Card>
  );
}

export function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  const load = async (p, st, reset) => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try {
      const { data } = await A.orders.list({ status: st || undefined, page: p, limit: 10 });
      if (id !== seq.current) return;
      setItems((c) => (reset ? data.items : [...c, ...data.items])); setTotal(data.total); setCounts(data.counts || {}); setPage(p);
    } catch (e) { if (id === seq.current) setError(errMsg(e, 'Không tải được danh sách đơn.')); }
    finally { if (id === seq.current) setLoading(false); }
  };
  useEffect(() => { if (user) load(1, status, true); }, [status, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => navigation.addListener('focus', () => { if (user) load(1, status, true); }), [navigation, status, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useOrderChanges(() => { if (user) load(1, status, true); });

  if (!user) return <NeedLogin title="Đăng nhập để xem đơn hàng" text="Theo dõi trạng thái đơn và đến cửa hàng nhận hàng." />;
  const header = (
    <View style={{ gap: 10 }}>
      <Pressable onPress={() => navigation.navigate('OrderHistory')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceContainer, borderRadius: radius.md, padding: 12 }}>
        <Icon name="time-outline" size={20} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Lịch sử mua hàng & tổng chi tiêu</Text>
        <Icon name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {ORDER_TABS.map((t) => <Chip key={t.key} label={t.label} count={counts[t.key || 'all']} active={status === t.key} onPress={() => setStatus(t.key)} />)}
      </ScrollView>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <FlatList data={items} keyExtractor={(o) => o._id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} ListHeaderComponent={header}
        renderItem={({ item }) => <OrderCard o={item} onPress={() => navigation.navigate('OrderDetail', { id: item._id })} />}
        refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1, status, true); setRefreshing(false); }}
        onEndReachedThreshold={0.4} onEndReached={() => { if (!loading && items.length < total) load(page + 1, status, false); }}
        ListFooterComponent={loading && items.length ? <Loading /> : null}
        ListEmptyComponent={loading ? <Loading /> : error ? <ErrorView message={error} onRetry={() => load(1, status, true)} /> :
          <Empty icon="receipt-outline" title="Chưa có đơn hàng" text={status ? 'Không có đơn nào ở trạng thái này.' : 'Đặt hàng online và đến cửa hàng nhận nhé.'} action={<Button title="Mua sắm ngay" onPress={() => navigation.navigate('Products', {})} />} />} />
    </SafeAreaView>
  );
}

export function OrderHistoryScreen({ navigation }) {
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (p, reset) => {
    setLoading(true); setError('');
    try { const { data } = await A.orders.history({ status: filter || undefined, page: p, limit: 10 }); setItems((c) => (reset ? data.items : [...c, ...data.items])); setTotal(data.total); setSummary(data.summary); setPage(p); }
    catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(1, true); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const header = (
    <View style={{ gap: 10 }}>
      {summary ? <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{summary.completedCount}</Text><Muted>Đơn đã nhận</Muted></View>
        <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{formatCurrency(summary.totalSpent)}</Text><Muted>Tổng chi tiêu</Muted></View>
      </Card> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>{[['', 'Tất cả'], ['completed', 'Đã nhận hàng'], ['failed', 'Thanh toán lỗi']].map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}</View>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <FlatList data={items} keyExtractor={(o) => o._id} contentContainerStyle={{ padding: 16, gap: 12 }} ListHeaderComponent={header}
        renderItem={({ item }) => <OrderCard o={item} onPress={() => navigation.navigate('OrderDetail', { id: item._id })} />}
        onEndReached={() => { if (!loading && items.length < total) load(page + 1, false); }} onEndReachedThreshold={0.4}
        ListEmptyComponent={loading ? <Loading /> : error ? <ErrorView message={error} onRetry={() => load(1, true)} /> : <Empty icon="time-outline" title="Chưa có lịch sử" text="Các đơn đã hoàn tất sẽ hiện ở đây." />} />
    </SafeAreaView>
  );
}

export function OrderDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const d = useLoad(() => A.orders.get(id).then((r) => r.data), [id], { reloadOnFocus: true });
  const [cancelOpen, setCancelOpen] = useState(false);
  const re = useReorder();
  useOrderChanges((ids) => { if (ids.includes(id)) d.refresh(); });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const o = d.data;
  const msg = ORDER_STATUS_MESSAGE[o.status];
  const [, tfg] = { warn: [0, colors.warnText], info: [0, colors.infoText], success: [0, colors.okText], neutral: [0, colors.neutralText], error: [0, colors.errText] }[msg?.tone || 'neutral'];
  const ps = PAYMENT_STATUS[o.paymentStatus];
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Muted>Mã đơn</Muted><StatusBadge status={o.status} /></View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 }}>{o.orderCode}</Text>
        <Muted>Đặt lúc {formatDateTime(o.createdAt)}</Muted>
      </Card>
      {msg ? <Banner tone={msg.tone} icon={msg.icon} title={msg.title} text={msg.text} /> : null}
      {SHOW_PICKUP_CODE.includes(o.status) ? (
        <Card style={{ alignItems: 'center', backgroundColor: o.status === 'ready_for_pickup' ? colors.okBg : colors.primaryFixed }}>
          <T style={{ fontWeight: '800' }}>{o.status === 'ready_for_pickup' ? 'Mã nhận hàng' : 'Mã đơn của bạn'}</T>
          <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: radius.md }}><QRCode value={o.orderCode} size={150} color={colors.text} backgroundColor="#fff" /></View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primaryDark, letterSpacing: 1 }}>{o.orderCode}</Text>
          <Muted style={{ textAlign: 'center' }}>Đưa mã QR hoặc đọc mã đơn cho nhân viên tại quầy.</Muted>
        </Card>) : null}
      {o.status === 'cancelled' && o.cancelReason ? <Banner tone="error" icon="information-circle-outline" title={o.cancelFault === 'store' ? 'Cửa hàng đã hủy đơn' : 'Lý do hủy'} text={reasonVi(o.cancelReason)} /> : null}
      {o.refund?.refundedAt ? (
        <Banner tone="success" icon="wallet-outline" title={`Đã hoàn ${formatCurrency(o.refund.amount)} vào ví QUICK`} text={`Hoàn lúc ${formatDateTime(o.refund.refundedAt)}. Dùng số dư cho đơn sau hoặc rút về ngân hàng.`}>
          <Pressable onPress={() => navigation.navigate('Wallet')}><Text style={{ color: colors.okText, fontWeight: '700' }}>Xem ví</Text></Pressable>
        </Banner>) : null}
      {o.compensation?.code ? (
        <Card style={{ backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixedDim }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="gift-outline" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>Xin lỗi vì sự bất tiện, tặng bạn voucher</T><Muted>Giảm {o.compensation.percent}% đơn sau, tối đa {formatCurrency(o.compensation.maxDiscount)} · 1 lần · chỉ dành cho bạn</Muted></View>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primaryDark, letterSpacing: 1, textAlign: 'center' }}>{o.compensation.code}</Text>
          {o.compensation.expiresAt ? <Muted style={{ textAlign: 'center' }}>Hạn dùng đến {formatDateTime(o.compensation.expiresAt).slice(0, 10)} · nhập mã ở bước đặt hàng</Muted> : null}
        </Card>) : null}

      <Card>
        <H>Sản phẩm</H>
        {o.items.map((it) => (
          <Pressable key={it.productId} onPress={() => navigation.navigate('ProductDetail', { id: it.productId })} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Thumb uri={it.image} size={46} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }} numberOfLines={2}>{it.name}</T><Muted>{formatCurrency(it.unitPrice)} × {it.quantity}</Muted></View>
            <T style={{ fontWeight: '700' }}>{formatCurrency(it.lineTotal)}</T>
          </Pressable>
        ))}
        <Divider />
        <Row label="Tạm tính" value={formatCurrency(o.subtotal)} />
        {(o.appliedPromotions || []).map((p) => <Row key={p.name} label={p.name} value={`-${formatCurrency(p.amount)}`} valueStyle={{ color: colors.secondary }} />)}
        {o.discountCode?.code ? <Row label={`Mã ${o.discountCode.code}`} value={`-${formatCurrency(o.discountCode.amount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        {o.pointsDiscount > 0 ? <Row label={`Dùng ${o.pointsUsed} điểm`} value={`-${formatCurrency(o.pointsDiscount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        <Row label="Tổng thanh toán" value={formatCurrency(o.totalAmount)} bold />
        {o.pointsEarned > 0 ? <Muted>Bạn đã nhận {o.pointsEarned} điểm thành viên từ đơn này.</Muted> : null}
      </Card>

      <Card>
        <H>Thanh toán</H>
        <Row label="Phương thức" value={PAYMENT_METHOD[o.paymentMethod] || '—'} />
        {o.walletAmount > 0 ? <Row label="Trừ ví QUICK" value={formatCurrency(o.walletAmount)} /> : null}
        {o.walletAmount > 0 && o.payableAmount > 0 ? <Row label="Trả qua VNPay" value={formatCurrency(o.payableAmount)} /> : null}
        <Row label="Trạng thái" value={ps?.label || o.paymentStatus} />
        <Muted>{paymentSummary(o)}</Muted>
        {o.paidAt ? <Row label="Thanh toán lúc" value={formatDateTime(o.paidAt)} /> : null}
      </Card>

      <Card>
        <H>Nhận hàng tại cửa hàng</H>
        {o.store ? <><T style={{ fontWeight: '700' }}>{o.store.name}</T>{o.store.address ? <Muted>📍 {o.store.address}</Muted> : null}{o.store.phone ? <Muted>📞 {o.store.phone}</Muted> : null}</> : <Muted>Cửa hàng sẽ thông báo địa điểm nhận hàng.</Muted>}
        {o.customerNote ? <Muted>Ghi chú: {o.customerNote}</Muted> : null}
      </Card>

      <View style={{ gap: 10 }}>
        {o.status === 'pending_payment' ? <Button title="Thanh toán ngay" icon="card-outline" onPress={() => navigation.navigate('PayOrder', { id: o._id })} /> : null}
        {o.status !== 'failed' ? <Button title="Theo dõi đơn" variant={o.status === 'pending_payment' ? 'ghost' : 'primary'} icon="navigate-outline" onPress={() => navigation.navigate('OrderTracking', { id: o._id })} /> : null}
        {o.status === 'completed' ? <Button title="Đánh giá sản phẩm" variant="soft" icon="star-outline" onPress={() => navigation.navigate('MyReviews')} /> : null}
        {['completed', 'failed', 'cancelled'].includes(o.status) ? <Button title="Mua lại đơn này" variant={o.status === 'completed' ? 'ghost' : 'primary'} icon="repeat-outline" loading={re.busy} onPress={() => re.reorder(o)} /> : null}
        {o.status === 'ready_for_pickup' && o.store ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {o.store.phone ? <Button title="Gọi cửa hàng" variant="soft" icon="call-outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.store.phone}`)} /> : null}
            <Button title="Chỉ đường" variant="soft" icon="navigate-outline" style={{ flex: 1 }} onPress={() => Linking.openURL(mapsUrl(o.store))} />
          </View>) : null}
        {o.canCancel ? <Button title="Hủy đơn" variant="ghost" icon="close-circle-outline" onPress={() => setCancelOpen(true)} /> : null}
        <Button title="Báo vấn đề với đơn này" variant="ghost" icon="help-buoy-outline" onPress={() => navigation.navigate('Support', { orderId: o._id, orderCode: o.orderCode })} />
      </View>
      <CancelSheet visible={cancelOpen} order={o} mode="customer" onSubmit={(body) => A.myOrders.cancel(o._id, body)} onClose={(done) => { setCancelOpen(false); if (done) d.refresh(); }} />
    </Screen>
  );
}

export function OrderTrackingScreen({ route, navigation }) {
  const { id } = route.params;
  const d = useLoad(() => A.orders.track(id).then((r) => r.data), [id]);
  // Tự cập nhật mỗi 15 giây khi đơn còn đang xử lý
  useEffect(() => {
    if (!d.data || !['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'].includes(d.data.status)) return undefined;
    const t = setInterval(() => d.refresh(), 15000);
    return () => clearInterval(t);
  }, [d.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const o = d.data;
  const steps = buildTimeline(o);
  const dot = { done: colors.secondary, current: colors.primary, upcoming: colors.outlineVariant, error: colors.error };
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{o.orderCode}</Text><StatusBadge status={o.status} /></View>
        <Row label="Tổng tiền" value={formatCurrency(o.totalAmount)} />
        <Muted>{paymentSummary(o)}</Muted>
        <Muted>Hình thức nhận: nhận tại cửa hàng{o.store?.name ? ` · ${o.store.name}` : ''}</Muted>
      </Card>
      <Card>
        <H>Tiến trình đơn hàng</H>
        {steps.map((s, i) => (
          <View key={s.key} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: dot[s.state], alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.state === 'done' ? 'checkmark' : s.state === 'error' ? 'close' : s.state === 'current' ? 'ellipse' : 'ellipse-outline'} size={14} color="#fff" />
              </View>
              {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: s.state === 'done' ? colors.secondary : colors.outlineVariant }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <T style={{ fontWeight: s.state === 'current' ? '800' : '600', color: s.state === 'upcoming' ? colors.outline : colors.text }}>{s.title}</T>
              <Muted>{s.desc}</Muted>
              {s.time ? <Muted style={{ color: colors.primary }}>{formatDateTime(s.time)}</Muted> : null}
            </View>
          </View>
        ))}
      </Card>
      <Button title="Xem chi tiết đơn" variant="ghost" onPress={() => navigation.replace('OrderDetail', { id })} />
    </Screen>
  );
}
