import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounced, useLoad } from '../components/hooks';
import CancelSheet, { reasonVi } from '../components/CancelSheet';
import { Badge, Banner, Button, Card, Chip, Divider, Empty, ErrorView, Field, H, Icon, Loading, Muted, Row, Screen, SectionTitle, Stepper, T, Text, Thumb } from '../components/ui';
import { colors, radius } from '../theme';
import { errMsg, formatCurrency, formatDate, formatDateTime, formatTime, newIdempotencyKey } from '../utils/format';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../utils/orderMeta';
import { StatusBadge } from './orders';

const NEXT_LABEL = { preparing: 'Bắt đầu chuẩn bị', ready_for_pickup: 'Đã chuẩn bị xong', completed: 'Khách đã nhận hàng' };
const NEXT_ICON = { preparing: 'cube-outline', ready_for_pickup: 'checkmark-done-outline', completed: 'bag-check-outline' };
const CANCELLABLE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
const SHIFT_STATUS = { scheduled: ['Sắp tới', 'info'], in_progress: ['Đang làm', 'warn'], completed: ['Hoàn thành', 'success'], missed: ['Vắng', 'error'] };
const dur = (m) => `${Math.floor((m || 0) / 60)}h${String((m || 0) % 60).padStart(2, '0')}`;
const dayText = (d) => { const x = new Date(d); return `${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][x.getDay()]}, ${formatDate(x)}`; };

// Ô số liệu nhỏ
export const Stat = ({ label, value, tone, icon, onPress }) => (
  <Card onPress={onPress} style={{ flex: 1, minWidth: '45%', padding: 12, gap: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{icon ? <Icon name={icon} size={16} color={colors.primary} /> : null}<Muted style={{ fontSize: 12 }}>{label}</Muted></View>
    <Text style={{ fontSize: 20, fontWeight: '900', color: tone === 'warn' ? colors.tertiary : tone === 'error' ? colors.error : tone === 'ok' ? colors.secondary : colors.text }}>{value}</Text>
  </Card>
);
export const Grid = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>;

// Thẻ ca hiện tại với nút vào / ra ca (dùng ở trang chủ và trang ca làm)
function CurrentShift({ cur, onDone }) {
  const [busy, setBusy] = useState(false);
  if (!cur) return <Banner tone="neutral" icon="time-outline" title="Chưa có ca để vào" text="Nút vào ca mở trước giờ bắt đầu 30 phút." />;
  const act = async (fn, label) => {
    setBusy(true);
    try { const r = await fn(cur._id); Alert.alert(label, r.data.message === 'Checked in' ? 'Đã vào ca.' : r.data.message?.startsWith('Checked in') ? `Đã vào ca (trễ ${r.data.shift.lateMinutes} phút).` : r.data.message === 'Checked out early' ? 'Đã ra ca (về sớm).' : 'Đã ra ca.'); onDone(); }
    catch (e) { Alert.alert('Không thực hiện được', errMsg(e)); onDone(); }
    finally { setBusy(false); }
  };
  const out = () => {
    if (new Date() < new Date(cur.endAt)) Alert.alert('Ra ca sớm?', `Ca kết thúc lúc ${cur.endTime}. Ra ca bây giờ sẽ bị đánh dấu về sớm.`, [{ text: 'Hủy', style: 'cancel' }, { text: 'Ra ca', style: 'destructive', onPress: () => act(A.shifts.clockOut, 'Ra ca') }]);
    else act(A.shifts.clockOut, 'Ra ca');
  };
  return (
    <Card style={{ borderColor: cur.status === 'in_progress' ? colors.secondary : colors.primaryFixedDim }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge label={SHIFT_STATUS[cur.status]?.[0]} tone={SHIFT_STATUS[cur.status]?.[1]} />
        {cur.late ? <Badge label={`Trễ ${cur.lateMinutes} phút`} tone="warn" /> : null}
      </View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{cur.startTime} – {cur.endTime}</Text>
      <Muted>{dayText(cur.shiftDate)} · {dur(cur.plannedMinutes)}{cur.clockInAt ? ` · vào lúc ${formatTime(cur.clockInAt)}` : ''} · ≈ {formatCurrency(cur.estimatedPay)}</Muted>
      {cur.actions.canClockIn ? <Button title="Vào ca" icon="log-in-outline" loading={busy} onPress={() => act(A.shifts.clockIn, 'Vào ca')} /> : null}
      {cur.actions.canClockOut ? <Button title="Ra ca" icon="log-out-outline" variant="danger" loading={busy} onPress={out} /> : null}
      {!cur.actions.canClockIn && !cur.actions.canClockOut && cur.actions.reason ? <Muted>{cur.actions.reason}</Muted> : null}
    </Card>
  );
}

// ===== Tổng quan của nhân viên =====
export function StaffHomeScreen({ navigation }) {
  const { user } = useAuth();
  const d = useLoad(async () => (await A.staff.dashboard({ range: 'today' })).data, [], { reloadOnFocus: true });
  const s = useLoad(async () => (await A.shifts.mine({ limit: 5 })).data, [], { reloadOnFocus: true });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const k = d.data;
  const q = k.queue || {};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={() => { d.refresh(); s.refresh(); }} refreshing={d.refreshing}>
        <View><Muted>Xin chào,</Muted><H style={{ fontSize: 22 }}>{user.fullName}</H></View>
        <SectionTitle title="Ca của bạn" icon="time-outline" action="Tất cả ca" onAction={() => navigation.navigate('StaffShifts')} />
        <CurrentShift cur={s.data?.current} onDone={s.refresh} />
        <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <Text style={{ color: '#d8e2ff', fontWeight: '700', fontSize: 12 }}>DOANH THU HÔM NAY</Text>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900' }}>{formatCurrency(k.todaySales?.value)}</Text>
          <Text style={{ color: '#d8e2ff', fontSize: 13 }}>{k.todaySales?.orders || 0} đơn · trung bình {formatCurrency(k.todaySales?.avgOrderValue)}/đơn · tự đặt lại lúc 0h</Text>
        </Card>
        <SectionTitle title="Đơn cần xử lý" icon="receipt-outline" action="Xem đơn" onAction={() => navigation.navigate('StaffOrders')} />
        <Grid>
          <Stat label="Mới, chờ chuẩn bị" value={q.confirmed || 0} icon="sparkles-outline" tone={q.confirmed ? 'warn' : ''} onPress={() => navigation.navigate('StaffOrders', { status: 'confirmed' })} />
          <Stat label="Đang chuẩn bị" value={q.preparing || 0} icon="cube-outline" onPress={() => navigation.navigate('StaffOrders', { status: 'preparing' })} />
          <Stat label="Chờ khách nhận" value={q.ready_for_pickup || 0} icon="storefront-outline" tone="ok" onPress={() => navigation.navigate('StaffOrders', { status: 'ready_for_pickup' })} />
          <Stat label="Chờ thanh toán" value={q.pending_payment || 0} icon="card-outline" onPress={() => navigation.navigate('StaffOrders', { status: 'pending_payment' })} />
        </Grid>
        <Grid>
          <Stat label="Sắp hết hàng" value={k.kpis?.lowStock || 0} icon="alert-circle-outline" tone={k.kpis?.lowStock ? 'warn' : ''} onPress={() => navigation.navigate('StaffInventory', { stock: 'low' })} />
          <Stat label="Hết hàng" value={k.kpis?.outOfStock || 0} icon="close-circle-outline" tone={k.kpis?.outOfStock ? 'error' : ''} onPress={() => navigation.navigate('StaffInventory', { stock: 'out' })} />
        </Grid>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Bán tại quầy" icon="calculator-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('StaffPOS')} />
          <Button title="Thành viên" icon="person-add-outline" variant="soft" style={{ flex: 1 }} onPress={() => navigation.navigate('StaffMembers')} />
        </View>
        {(k.recentOrders || []).length ? <SectionTitle title="Đơn gần đây" icon="list-outline" /> : null}
        {(k.recentOrders || []).slice(0, 5).map((o) => (
          <Card key={o._id} onPress={() => navigation.navigate('StaffOrderDetail', { id: o._id })} style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</T><StatusBadge status={o.status} /></View>
            <Muted>{o.source === 'store' ? 'Tại quầy' : 'Online'} · {o.customerName || 'Khách lẻ'} · {o.itemCount} món · {formatCurrency(o.totalAmount)}</Muted>
          </Card>))}
      </Screen>
    </SafeAreaView>
  );
}

// ===== Danh sách đơn (hàng đợi + lịch sử) =====
const ORDER_TABS = [['active', 'Đang xử lý'], ['confirmed', 'Mới'], ['preparing', 'Đang chuẩn bị'], ['ready_for_pickup', 'Chờ nhận'], ['pending_payment', 'Chờ thanh toán'], ['history', 'Lịch sử']];
export function StaffOrdersScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status || 'active');
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  useEffect(() => { if (route.params?.status) setStatus(route.params.status); }, [route.params?.status]);
  const d = useLoad(async () => (await A.staff.orders({ status, source: status === 'history' ? 'all' : 'online', q: dq || undefined, limit: 50 })).data, [status, dq], { reloadOnFocus: true });
  // Tự làm mới hàng đợi mỗi 30 giây
  useEffect(() => { const t = setInterval(() => d.refresh(), 30000); return () => clearInterval(t); }, [d.refresh]);
  const counts = d.data?.counts || {};
  const count = (k) => (k === 'active' ? ['confirmed', 'preparing', 'ready_for_pickup', 'pending_payment'].reduce((n, x) => n + (counts[x] || 0), 0) : k === 'history' ? undefined : counts[k] || 0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <H style={{ fontSize: 22 }}>Đơn hàng</H>
        <Field value={q} onChangeText={setQ} placeholder="Tìm theo mã đơn (CM-...)" autoCapitalize="characters" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ORDER_TABS.map(([k, l]) => <Chip key={k} label={l} count={count(k)} active={status === k} onPress={() => setStatus(k)} />)}
        </ScrollView>
      </View>
      <FlatList data={d.data?.items || []} keyExtractor={(o) => o._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}
        refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: o }) => (
          <Card onPress={() => navigation.navigate('StaffOrderDetail', { id: o._id })} style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</T><StatusBadge status={o.status} /></View>
            <T numberOfLines={1}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</T>
            <Muted>{o.source === 'store' ? 'Tại quầy' : 'Online'} · {o.customer?.fullName || 'Khách lẻ'} · {formatTime(o.createdAt)} {formatDate(o.createdAt)}</Muted>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>{PAYMENT_STATUS[o.paymentStatus]?.label}</Muted><T style={{ fontWeight: '800' }}>{formatCurrency(o.totalAmount)}</T></View>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : d.error ? <ErrorView message={d.error} onRetry={d.reload} /> : <Empty icon="receipt-outline" title="Không có đơn" text="Không có đơn nào ở mục này." />} />
    </SafeAreaView>
  );
}

// ===== Chi tiết đơn của nhân viên: chuyển trạng thái, hủy 2 bước =====
export function StaffOrderDetailScreen({ route }) {
  const { id } = route.params;
  const d = useLoad(async () => (await A.staff.order(id)).data, [id], { reloadOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [cash, setCash] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const o = d.data;
  const next = o.nextTransition;
  const blocked = next?.to === 'preparing' && o.pickupSchedule?.isOpen === false;
  const advance = async () => {
    setBusy(true);
    try { await A.staff.advance(o._id, { status: next.to, ...(next.needsCashConfirm ? { cashCollected: true } : {}) }); setCash(false); d.refresh(); }
    catch (e) { Alert.alert('Không cập nhật được', errMsg(e)); d.refresh(); }
    finally { setBusy(false); }
  };
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Muted>{o.source === 'store' ? 'BÁN TẠI QUẦY' : 'ONLINE · NHẬN TẠI CỬA HÀNG'}</Muted><StatusBadge status={o.status} /></View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{o.orderCode}</Text>
        <Muted>Đặt lúc {formatDateTime(o.createdAt)}</Muted>
        <Row label="Khách hàng" value={o.customer?.fullName || 'Khách lẻ'} />
        {o.customer?.phone ? <Row label="Điện thoại" value={o.customer.phone} /> : null}
        <Row label="Thanh toán" value={`${PAYMENT_STATUS[o.paymentStatus]?.label || o.paymentStatus} · ${PAYMENT_METHOD[o.paymentMethod] || ''}`} />
      </Card>
      {o.status === 'ready_for_pickup' ? <Banner tone="success" icon="storefront-outline" title="Đơn sẵn sàng" text={`Đối chiếu mã đơn ${o.orderCode} với khách trước khi giao hàng.`} /> : null}
      {blocked ? <Banner tone="warn" icon="time-outline" title="Chưa đến giờ chuẩn bị" text={o.pickupSchedule.notice} /> : null}
      {o.status === 'cancelled' ? (
        <Banner tone="error" icon="close-circle-outline" title={`Đã hủy${o.cancelFault ? ` · ${o.cancelFault === 'store' ? 'do cửa hàng' : 'do khách'}` : ''}`}
          text={`Lý do: ${reasonVi(o.cancelReason)}${o.refund ? `\nĐã hoàn ${formatCurrency(o.refund.amount)} vào ví khách.` : ''}${o.compensation?.code ? `\nĐã tặng voucher ${o.compensation.code} (${o.compensation.percent}%, tối đa ${formatCurrency(o.compensation.maxDiscount)}).` : ''}`} />) : null}

      <Card>
        <H>Sản phẩm cần chuẩn bị</H>
        {o.items.map((it, i) => (
          <View key={it.productId || i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Thumb uri={it.image} size={46} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{it.quantity}× {it.name}</T><Muted>{it.sku} · {formatCurrency(it.unitPrice)}/{it.unit}</Muted></View>
            <T style={{ fontWeight: '700' }}>{formatCurrency(it.lineTotal)}</T>
          </View>))}
        {o.customerNote ? <Banner tone="info" icon="chatbubble-ellipses-outline" title="Ghi chú của khách" text={o.customerNote} /> : null}
        <Divider />
        <Row label="Tạm tính" value={formatCurrency(o.subtotal)} />
        {o.promotionDiscount > 0 ? <Row label="Khuyến mãi" value={`-${formatCurrency(o.promotionDiscount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        <Row label="Tổng" value={formatCurrency(o.totalAmount)} bold />
      </Card>

      {next && o.source === 'online' ? (
        <Card>
          <H>Bước tiếp theo</H>
          {next.needsCashConfirm ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, color: colors.text }}>Đã thu đủ {formatCurrency(o.totalAmount)} tiền mặt</Text>
              <Switch value={cash} onValueChange={setCash} />
            </View>) : null}
          <Button title={NEXT_LABEL[next.to]} icon={NEXT_ICON[next.to]} loading={busy} disabled={blocked || (next.needsCashConfirm && !cash)} onPress={advance} />
          {next.to === 'ready_for_pickup' ? <Muted>Khách sẽ nhận thông báo đơn đã sẵn sàng.</Muted> : null}
        </Card>) : null}
      {o.source === 'online' && CANCELLABLE.includes(o.status) ? <Button title="Hủy đơn" icon="close-circle-outline" variant="ghost" onPress={() => setCancelOpen(true)} /> : null}
      <CancelSheet visible={cancelOpen} order={o} mode="staff" onSubmit={(body) => A.staff.cancel(o._id, body)} onClose={(done) => { setCancelOpen(false); if (done) d.refresh(); }} />
    </Screen>
  );
}

// ===== Bán tại quầy (POS) =====
const POS_METHODS = [['cash', 'Tiền mặt', 'cash-outline'], ['card', 'Thẻ', 'card-outline'], ['vnpay', 'VNPay QR', 'qr-code-outline']];
const newQrRef = () => `QR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
export function PosScreen({ navigation }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const products = useLoad(async () => (await A.products.list({ q: dq || undefined, limit: 40, status: 'active' })).data.items.filter((p) => p.stockQuantity > 0), [dq]);
  const promos = useLoad(async () => (await A.promotions.list()).data.items || [], []);
  const [lines, setLines] = useState([]);
  const [member, setMember] = useState(null);
  const [memberQ, setMemberQ] = useState('');
  const [memberMsg, setMemberMsg] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const key = useRef(newIdempotencyKey());

  const items = lines.map((l) => ({ productId: l.product._id, quantity: l.quantity }));
  const refreshQuote = useCallback(async () => {
    if (!lines.length) { setQuote(null); return; }
    try { setQuote((await A.staff.quote({ items, promotionId: promotionId || undefined })).data); } catch (e) { setError(errMsg(e)); }
  }, [JSON.stringify(items), promotionId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refreshQuote(); key.current = newIdempotencyKey(); }, [refreshQuote]);

  const add = (p) => setLines((cur) => { const f = cur.find((l) => l.product._id === p._id); return f ? cur.map((l) => (l === f ? { ...l, quantity: Math.min(l.quantity + 1, p.stockQuantity) } : l)) : [...cur, { product: p, quantity: 1 }]; });
  const setQty = (id, n) => setLines((cur) => cur.map((l) => (l.product._id === id ? { ...l, quantity: n } : l)));
  const remove = (id) => setLines((cur) => cur.filter((l) => l.product._id !== id));
  const pickMethod = (m) => { setMethod(m); setApproved(false); setReference(m === 'vnpay' ? newQrRef() : ''); key.current = newIdempotencyKey(); };
  const findMember = async () => {
    if (memberQ.trim().length < 3) return;
    setMemberMsg('');
    try { setMember((await A.staff.findMember(memberQ.trim())).data.member); setMemberQ(''); }
    catch (e) { setMemberMsg(e.response?.data?.code === 'MEMBER_NOT_FOUND' ? 'Không tìm thấy thành viên. Có thể đăng ký ở mục Thành viên.' : errMsg(e)); }
  };
  const total = quote?.totalAmount || 0;
  const payable = method === 'cash' ? received !== '' && Number(received) >= total : approved && /^[A-Za-z0-9-]{4,40}$/.test(reference.trim());
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const r = await A.staff.checkout({ idempotencyKey: key.current, items, promotionId: promotionId || undefined, customerId: member?._id, expectedTotal: total, method,
        ...(method === 'cash' ? { received: Number(received) } : { reference: reference.trim(), paymentConfirmed: true }) });
      setDone(r.data);
    } catch (e) { setError(errMsg(e, 'Không chốt được bill. Thử lại sẽ dùng cùng mã, không tạo bill trùng.')); }
    finally { setBusy(false); }
  };
  const reset = () => { setDone(null); setLines([]); setMember(null); setPromotionId(''); setQuote(null); setReceived(''); setApproved(false); setReference(method === 'vnpay' ? newQrRef() : ''); setError(''); key.current = newIdempotencyKey(); products.refresh(); };

  if (done) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Icon name="checkmark-circle" size={64} color={colors.secondary} />
          <H style={{ fontSize: 20 }}>Bán hàng thành công</H>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{done.order.orderCode}</Text>
        </Card>
        <Card>
          <Row label="Phương thức" value={POS_METHODS.find((m) => m[0] === done.order.paymentMethod)?.[1] || done.order.paymentMethod} />
          <Row label="Tổng" value={formatCurrency(done.order.totalAmount)} bold />
          {done.order.paymentMethod === 'cash' ? <Row label="Tiền thối" value={formatCurrency(done.change)} /> : null}
          {done.points ? <Row label={`Điểm cho ${done.points.member}`} value={`+${done.points.earned} (còn ${done.points.balance})`} /> : null}
        </Card>
        <Button title="Bill mới" icon="add-circle-outline" onPress={reset} />
        <Button title="Xem đơn" variant="ghost" onPress={() => navigation.navigate('StaffOrderDetail', { id: done.order._id })} />
      </Screen>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} footer={lines.length ? (
        <View style={{ backgroundColor: '#fff', padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.surfaceContainer }}>
          <Row label="Tổng cần thu" value={formatCurrency(total)} bold valueStyle={{ color: colors.primary }} />
          {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
          <Button title="Chốt bill" icon="checkmark-done-outline" loading={busy} disabled={!payable || !quote?.canCreate} onPress={submit} />
        </View>) : null}>
        <H style={{ fontSize: 22 }}>Bán tại quầy</H>
        <Field value={q} onChangeText={setQ} placeholder="Tìm tên, SKU hoặc mã vạch" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {(products.data || []).map((p) => (
            <Pressable key={p._id} onPress={() => add(p)} style={{ width: 120, backgroundColor: '#fff', borderRadius: radius.md, padding: 8, gap: 4, borderWidth: 1, borderColor: colors.border }}>
              <Thumb uri={p.images?.[0]} size={104} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={2}>{p.name}</Text>
              <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 13 }}>{formatCurrency(p.price)}</Text>
              <Muted style={{ fontSize: 11 }}>Còn {p.stockQuantity}</Muted>
            </Pressable>))}
          {products.loading ? <Loading /> : null}
        </ScrollView>

        <Card>
          <H>Hóa đơn {lines.length ? `(${lines.reduce((n, l) => n + l.quantity, 0)} món)` : ''}</H>
          {!lines.length ? <Muted>Chạm vào sản phẩm phía trên để thêm vào bill.</Muted> : lines.map(({ product: p, quantity }) => {
            const row = quote?.lines?.find((l) => String(l.productId) === p._id);
            return (
              <View key={p._id} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T style={{ fontWeight: '600', flex: 1 }} numberOfLines={2}>{p.name}</T>
                  <Pressable onPress={() => remove(p._id)} hitSlop={8}><Icon name="close" size={18} color={colors.error} /></Pressable>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stepper value={quantity} max={p.stockQuantity} onChange={(n) => setQty(p._id, n)} />
                  <T style={{ fontWeight: '700' }}>{formatCurrency(row?.lineTotal ?? p.price * quantity)}</T>
                </View>
              </View>);
          })}
          {quote?.issues?.length ? <Text style={{ color: colors.error, fontSize: 13 }}>{quote.issues.map((i) => i.message).join('\n')}</Text> : null}
          {lines.length ? <><Divider /><Row label="Tạm tính" value={formatCurrency(quote?.subtotal)} />{quote?.discount ? <Row label="Giảm giá" value={`-${formatCurrency(quote.discount)}`} valueStyle={{ color: colors.secondary }} /> : null}</> : null}
        </Card>

        {lines.length ? (
          <>
            <Card>
              <H>Thành viên (tích điểm)</H>
              {member ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="person-circle-outline" size={30} color={colors.primary} />
                  <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{member.fullName}</T><Muted>{member.tier} · {member.points} điểm · {member.memberCode}</Muted></View>
                  <Pressable onPress={() => setMember(null)}><Text style={{ color: colors.error, fontWeight: '700' }}>Bỏ</Text></Pressable>
                </View>) : (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}><Field value={memberQ} onChangeText={setMemberQ} placeholder="SĐT, email hoặc mã thành viên" autoCapitalize="none" onSubmitEditing={findMember} /></View>
                  <Button title="Tìm" variant="soft" onPress={findMember} style={{ paddingVertical: 14 }} />
                </View>)}
              {memberMsg ? <Muted style={{ color: colors.error }}>{memberMsg}</Muted> : null}
            </Card>
            {(promos.data || []).length ? (
              <Card>
                <H>Khuyến mãi</H>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Chip label="Không áp dụng" active={!promotionId} onPress={() => setPromotionId('')} />
                  {promos.data.map((p) => <Chip key={p._id} label={p.name} active={promotionId === p._id} onPress={() => setPromotionId(p._id)} />)}
                </ScrollView>
                {quote?.promoError ? <Text style={{ color: colors.error, fontSize: 13 }}>{quote.promoError}</Text> : null}
              </Card>) : null}
            <Card>
              <H>Thu tiền</H>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {POS_METHODS.map(([k, l, icon]) => (
                  <Pressable key={k} onPress={() => pickMethod(k)} style={{ flex: 1, alignItems: 'center', gap: 4, padding: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: method === k ? colors.primary : colors.outlineVariant, backgroundColor: method === k ? colors.primaryFixed : '#fff' }}>
                    <Icon name={icon} size={22} color={colors.primary} /><Text style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>{l}</Text>
                  </Pressable>))}
              </View>
              {method === 'cash' ? (
                <View style={{ gap: 8 }}>
                  <Field label="Tiền khách đưa (VND)" value={received} onChangeText={(v) => setReceived(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={String(total)} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => <Chip key={v} label={formatCurrency(v)} active={Number(received) === v} onPress={() => setReceived(String(v))} />)}
                  </View>
                  <Row label="Tiền thối" value={formatCurrency(Math.max(0, Number(received || 0) - total))} bold />
                </View>) : method === 'vnpay' ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: radius.md }}><QRCode value={`QUICKSTORE|PAY|${reference}|${total}|VND`} size={180} /></View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{formatCurrency(total)}</Text>
                  <Muted>Mã thanh toán {reference}</Muted>
                  <Banner tone="info" icon="information-circle-outline" text="QR minh họa, chưa liên kết tài khoản ngân hàng. Kiểm tra khách đã trả rồi xác nhận." />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}><Text style={{ flex: 1 }}>Khách đã trả {formatCurrency(total)} bằng QR</Text><Switch value={approved} onValueChange={setApproved} /></View>
                </View>) : (
                <View style={{ gap: 8 }}>
                  <Field label="Mã giao dịch trên máy POS" value={reference} onChangeText={setReference} autoCapitalize="characters" maxLength={40} placeholder="4–40 chữ hoặc số" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1 }}>Giao dịch đã được duyệt trên máy POS</Text><Switch value={approved} onValueChange={setApproved} /></View>
                </View>)}
            </Card>
          </>) : null}
      </Screen>
    </SafeAreaView>
  );
}

// ===== Ca làm: vào / ra ca, nhận ca trống, ca sắp tới, lịch sử =====
export function StaffShiftsScreen() {
  const mine = useLoad(async () => (await A.shifts.mine({ limit: 20 })).data, [], { reloadOnFocus: true });
  const open = useLoad(async () => (await A.shifts.open()).data, [], { reloadOnFocus: true });
  const [busyId, setBusyId] = useState('');
  const reload = () => { mine.refresh(); open.refresh(); };
  if (mine.loading && !mine.data) return <Loading />;
  if (mine.error && !mine.data) return <ErrorView message={mine.error} onRetry={mine.reload} />;
  const m = mine.data;
  const run = async (id, fn, ok) => { setBusyId(id); try { await fn(); Alert.alert(ok); } catch (e) { Alert.alert('Không thực hiện được', errMsg(e)); } finally { setBusyId(''); reload(); } };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={reload} refreshing={mine.refreshing}>
        <H style={{ fontSize: 22 }}>Ca làm</H>
        <CurrentShift cur={m.current} onDone={reload} />
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{formatCurrency(m.earnings?.amount)}</Text><Muted>Lương tháng này</Muted></View>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{m.earnings?.shifts || 0}</Text><Muted>Ca đã làm</Muted></View>
        </Card>
        <Muted>Ca ngày {formatCurrency(m.rates?.day)}/giờ · ca đêm (22h–6h) {formatCurrency(m.rates?.night)}/giờ</Muted>

        <SectionTitle title="Ca sắp tới" icon="calendar-outline" />
        {!(m.upcoming || []).length ? <Muted>Chưa có ca sắp tới. Nhận ca trống bên dưới.</Muted> : m.upcoming.map((s) => (
          <Card key={s._id} style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '800' }}>{s.startTime} – {s.endTime}</T><Muted>≈ {formatCurrency(s.estimatedPay)}</Muted></View>
            <Muted>{dayText(s.shiftDate)} · {dur(s.plannedMinutes)} · vào ca từ {formatTime(new Date(new Date(s.startAt).getTime() - 30 * 60000))}</Muted>
            {s.canRelease ? <Button small variant="ghost" title="Hủy nhận ca" loading={busyId === s._id} onPress={() => Alert.alert('Hủy nhận ca?', 'Chỗ này sẽ mở lại cho nhân viên khác.', [{ text: 'Không', style: 'cancel' }, { text: 'Hủy ca', style: 'destructive', onPress: () => run(s._id, () => A.shifts.release(s._id), 'Đã hủy nhận ca') }])} /> : <Muted style={{ fontSize: 12 }}>Không thể hủy khi còn dưới {open.data?.releaseHours || 12} giờ.</Muted>}
          </Card>))}

        <SectionTitle title="Ca trống (14 ngày tới)" icon="add-circle-outline" />
        {open.loading && !open.data ? <Loading /> : !(open.data?.items || []).length ? <Muted>Quản lý chưa mở ca trống nào.</Muted> : open.data.items.map((s) => (
          <Card key={s._id} style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{s.startTime} – {s.endTime}</T><Muted>{dayText(s.shiftDate)} · {s.filled}/{s.capacity} người · ≈ {formatCurrency(s.estimatedPay?.amount)}{s.estimatedPay?.nightMinutes ? ' · có giờ đêm' : ''}</Muted></View>
              {s.mine ? <Badge label="Đã nhận" tone="success" /> : s.full ? <Badge label="Đủ người" tone="neutral" /> : s.conflict ? <Badge label="Trùng giờ" tone="warn" /> :
                <Button small title="Nhận ca" loading={busyId === s._id} onPress={() => run(s._id, () => A.shifts.claim(s._id), 'Đã nhận ca')} />}
            </View>
          </Card>))}

        <SectionTitle title="Lịch sử ca" icon="time-outline" />
        {!(m.items || []).some((s) => ['completed', 'missed'].includes(s.status)) ? <Muted>Chưa có ca đã kết thúc.</Muted> : null}
        {(m.items || []).filter((s) => ['completed', 'missed'].includes(s.status)).map((s) => (
          <Card key={s._id} style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '700' }}>{dayText(s.shiftDate)} · {s.startTime}–{s.endTime}</T><Badge label={SHIFT_STATUS[s.status]?.[0]} tone={SHIFT_STATUS[s.status]?.[1]} /></View>
            <Muted>Vào {s.clockInAt ? formatTime(s.clockInAt) : '—'} · ra {s.clockOutAt ? formatTime(s.clockOutAt) : '—'}{s.workedMinutes != null ? ` · ${dur(s.workedMinutes)}` : ''}{s.late ? ` · trễ ${s.lateMinutes}'` : ''}{s.earlyLeave ? ' · về sớm' : ''}</Muted>
            <T style={{ fontWeight: '700' }}>{s.pay ? formatCurrency(s.pay.amount) : s.status === 'missed' ? '0 ₫' : '—'}</T>
          </Card>))}
      </Screen>
    </SafeAreaView>
  );
}

// ===== Thành viên: tra cứu, đăng ký tại quầy =====
export function StaffMembersScreen() {
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({ fullName: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const lookup = async () => {
    setMsg(''); setFound(null);
    try { setFound((await A.staff.findMember(q.trim())).data.member); }
    catch (e) { setMsg(e.response?.data?.code === 'MEMBER_NOT_FOUND' ? 'Không tìm thấy. Bạn có thể đăng ký thành viên mới bên dưới.' : errMsg(e)); }
  };
  const register = async () => {
    if (f.fullName.trim().length < 2) return setMsg('Nhập họ tên khách.');
    if (!f.phone.trim() && !f.email.trim()) return setMsg('Cần số điện thoại hoặc email (một trong hai).');
    setBusy(true); setMsg('');
    try {
      const r = await A.staff.registerMember({ fullName: f.fullName.trim(), phone: f.phone.trim() || undefined, email: f.email.trim() || undefined });
      setCreated(r.data); setF({ fullName: '', phone: '', email: '' });
    } catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Card>
        <H>Tra cứu thành viên</H>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field value={q} onChangeText={setQ} placeholder="SĐT, email hoặc mã thành viên" autoCapitalize="none" onSubmitEditing={lookup} /></View>
          <Button title="Tìm" variant="soft" disabled={q.trim().length < 3} onPress={lookup} style={{ paddingVertical: 14 }} />
        </View>
        {found ? (
          <View style={{ gap: 4 }}>
            <T style={{ fontWeight: '800', fontSize: 16 }}>{found.fullName}</T>
            <Muted>{found.memberCode}</Muted>
            <Row label="Hạng" value={found.tier} /><Row label="Điểm" value={String(found.points)} />
            {found.email ? <Row label="Email" value={found.email} /> : null}{found.phone ? <Row label="SĐT" value={found.phone} /> : null}
          </View>) : null}
      </Card>
      <Card>
        <H>Đăng ký thành viên tại quầy</H>
        <Muted>Khách chưa có tài khoản: nhập tên và số điện thoại hoặc email để bắt đầu tích điểm.</Muted>
        <Field label="Họ tên" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} maxLength={100} />
        <Field label="Số điện thoại" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
        <Field label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Button title="Đăng ký" icon="person-add-outline" loading={busy} onPress={register} />
        {created ? <Banner tone="success" icon="checkmark-circle-outline" title={`Đã đăng ký ${created.member.fullName}`} text={`Mã thành viên ${created.member.memberCode}${created.invited ? '. Đã gửi email mời khách đặt mật khẩu.' : ''}`} /> : null}
      </Card>
      {msg ? <Banner tone="warn" icon="information-circle-outline" text={msg} /> : null}
    </Screen>
  );
}

// ===== Kho: tồn kho, sắp hết, hết hàng =====
export function StaffInventoryScreen({ route }) {
  const [stock, setStock] = useState(route.params?.stock || '');
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const d = useLoad(async () => (await A.staff.inventory({ stock: stock || undefined, q: dq || undefined, limit: 100 })).data, [stock, dq], { reloadOnFocus: true });
  const tone = { in: 'success', low: 'warn', out: 'error' };
  const label = { in: 'Còn hàng', low: 'Sắp hết', out: 'Hết hàng' };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <Field value={q} onChangeText={setQ} placeholder="Tìm tên hoặc SKU" />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[['', 'Tất cả'], ['low', 'Sắp hết'], ['out', 'Hết hàng']].map(([k, l]) => <Chip key={k} label={l} active={stock === k} onPress={() => setStock(k)} />)}</View>
        {d.data?.summary ? <Muted>{d.data.summary.products} sản phẩm · {d.data.summary.lowStock} sắp hết · {d.data.summary.outOfStock} hết hàng</Muted> : null}
      </View>
      <FlatList data={d.data?.items || []} keyExtractor={(p) => p._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: p }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
            <Thumb uri={p.images?.[0]} size={48} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }} numberOfLines={2}>{p.name}</T><Muted>{p.sku} · {p.category?.name}{p.nearestExpiry ? ` · HSD gần nhất ${formatDate(p.nearestExpiry)}` : ''}</Muted></View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>{p.stockQuantity}</Text><Badge label={label[p.stockStatus] || p.stockStatus} tone={tone[p.stockStatus]} /></View>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : d.error ? <ErrorView message={d.error} onRetry={d.reload} /> : <Empty icon="cube-outline" title="Không có sản phẩm" />} />
    </SafeAreaView>
  );
}

// ===== Khiếu nại / hỗ trợ =====
const SUP_STATUS = { open: ['Mới', 'warn'], in_progress: ['Đang xử lý', 'info'], resolved: ['Đã giải quyết', 'success'] };
export function StaffComplaintsScreen({ navigation }) {
  const [status, setStatus] = useState('open');
  const d = useLoad(async () => (await A.staff.complaints({ status: status || undefined, limit: 50 })).data, [status], { reloadOnFocus: true });
  const c = d.data?.counts || {};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[['open', 'Mới'], ['in_progress', 'Đang xử lý'], ['resolved', 'Đã giải quyết'], ['', 'Tất cả']].map(([k, l]) => <Chip key={k} label={l} count={c[k || 'all']} active={status === k} onPress={() => setStatus(k)} />)}
        </ScrollView>
      </View>
      <FlatList data={d.data?.items || []} keyExtractor={(x) => x._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: x }) => (
          <Card onPress={() => navigation.navigate('StaffComplaintDetail', { id: x._id })} style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T style={{ fontWeight: '800', flex: 1 }} numberOfLines={1}>{x.subject}</T><Badge label={SUP_STATUS[x.status]?.[0]} tone={SUP_STATUS[x.status]?.[1]} /></View>
            <Muted>{x.type === 'complaint' ? 'Khiếu nại' : 'Hỗ trợ'} · {x.customer?.fullName} · {formatDateTime(x.createdAt)}{x.orderCode ? ` · ${x.orderCode}` : ''}</Muted>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : <Empty icon="chatbubbles-outline" title="Không có yêu cầu" />} />
    </SafeAreaView>
  );
}

export function StaffComplaintDetailScreen({ route }) {
  const { id } = route.params;
  const d = useLoad(async () => (await A.staff.complaint(id)).data, [id]);
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const r = d.data;
  const send = async () => {
    setBusy(true);
    try { await A.staff.handleComplaint(id, { message: msg.trim() || undefined, status: target || undefined }, key.current); key.current = newIdempotencyKey(); setMsg(''); setTarget(''); d.refresh(); }
    catch (e) { Alert.alert('Không gửi được', errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>{r.type === 'complaint' ? 'KHIẾU NẠI' : 'HỖ TRỢ'}</Muted><Badge label={SUP_STATUS[r.status]?.[0]} tone={SUP_STATUS[r.status]?.[1]} /></View>
        <H>{r.subject}</H>
        <Muted>{r.customer?.fullName} · {formatDateTime(r.createdAt)}{r.order ? ` · đơn ${r.order.orderCode}` : ''}</Muted>
        <T>{r.message}</T>
      </Card>
      {(r.responses || []).map((x) => (
        <Card key={x._id} style={{ padding: 12, gap: 4, backgroundColor: colors.surfaceLow }}>
          <Muted>{x.responder} · {formatDateTime(x.createdAt)}</Muted><T>{x.message}</T>
        </Card>))}
      {r.status !== 'resolved' || (r.allowedStatuses || []).length ? (
        <Card>
          <H>Phản hồi khách</H>
          <Field value={msg} onChangeText={setMsg} multiline maxLength={2000} placeholder="Nội dung phản hồi (khách sẽ nhận thông báo)" />
          {(r.allowedStatuses || []).length ? <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip label="Giữ trạng thái" active={!target} onPress={() => setTarget('')} />
            {r.allowedStatuses.map((s) => <Chip key={s} label={SUP_STATUS[s]?.[0] || s} active={target === s} onPress={() => setTarget(s)} />)}
          </View> : null}
          <Button title="Gửi" icon="send-outline" loading={busy} disabled={!msg.trim() && !target} onPress={send} />
        </Card>) : null}
    </Screen>
  );
}

// ===== Tab "Thêm" của nhân viên =====
export function MoreScreen({ navigation, links }) {
  const { user, logout } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]}>
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Icon name="person-circle" size={52} color={colors.primary} />
          <View style={{ flex: 1 }}><H>{user.fullName}</H><Muted>{user.email}</Muted><Badge label={user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'} tone="info" /></View>
        </Card>
        <Card style={{ padding: 4 }}>
          {links.map(([icon, label, to], i) => (
            <View key={to}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => navigation.navigate(to)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }, pressed && { opacity: 0.6 }]}>
                <Icon name={icon} size={22} color={colors.primary} /><T style={{ flex: 1, fontWeight: '600' }}>{label}</T><Icon name="chevron-forward" size={18} color={colors.outline} />
              </Pressable>
            </View>))}
        </Card>
        <Button title="Đăng xuất" icon="log-out-outline" variant="ghost" onPress={() => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: logout }])} />
      </Screen>
    </SafeAreaView>
  );
}
export const StaffMoreScreen = (p) => <MoreScreen {...p} links={[
  ['people-outline', 'Thành viên (tra cứu, đăng ký)', 'StaffMembers'], ['cube-outline', 'Tồn kho', 'StaffInventory'], ['chatbubbles-outline', 'Khiếu nại & hỗ trợ', 'StaffComplaints'],
  ['time-outline', 'Lịch sử đơn', 'StaffOrderHistory'], ['notifications-outline', 'Thông báo', 'Notifications'], ['person-outline', 'Hồ sơ cá nhân', 'Profile'],
]} />;

