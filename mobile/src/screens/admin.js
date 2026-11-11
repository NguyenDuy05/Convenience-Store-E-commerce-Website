import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useDebounced, useLoad } from '../components/hooks';
import CancelSheet, { reasonVi } from '../components/CancelSheet';
import { Badge, Banner, Button, Card, Chip, Divider, Empty, ErrorView, Field, H, Icon, Loading, Muted, Row, Screen, SectionTitle, T, Text, Thumb } from '../components/ui';
import { colors, radius } from '../theme';
import { errMsg, formatCurrency, formatDate, formatDateTime, formatTime } from '../utils/format';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../utils/orderMeta';
import { StatusBadge } from './orders';
import { Grid, MoreScreen, Stat } from './staff';

const NEXT = { confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'completed' };
const NEXT_LABEL = { preparing: 'Bắt đầu chuẩn bị', ready_for_pickup: 'Đánh dấu sẵn sàng', completed: 'Khách đã nhận hàng' };
const CANCELLABLE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
const STEP_VI = {
  'Created the counter sale': 'Tạo bill tại quầy', 'Created the order': 'Tạo đơn', 'Confirmed the order': 'Xác nhận đơn', 'Started preparing': 'Bắt đầu chuẩn bị',
  'Marked ready for pickup': 'Báo đơn sẵn sàng', 'Handed over to the customer': 'Giao hàng cho khách', 'Cancelled the order': 'Hủy đơn', 'Marked as failed': 'Đánh dấu thất bại',
  'Reported an issue': 'Ghi nhận sự cố', 'Resolved an issue': 'Đóng sự cố', 'Collected cash payment': 'Thu tiền mặt', 'Collected card payment': 'Thu tiền thẻ', 'Collected VNPay QR payment': 'Thu tiền VNPay QR',
};
// Tên bước xử lý đơn bằng tiếng Việt
const stepVi = (l) => STEP_VI[l] || l;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const dayText = (d) => { const x = new Date(d); return `${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][x.getDay()]} ${formatDate(x).slice(0, 5)}`; };

// Hộp nhập một dòng (thay cho Alert.prompt, chạy được cả Android)
function PromptSheet({ prompt, onClose }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!prompt) return null;
  const ok = async () => {
    if (v.trim().length < 3) return setErr('Nhập ít nhất 3 ký tự.');
    setBusy(true); setErr('');
    try { await prompt.onSubmit(v.trim()); setV(''); onClose(true); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onClose(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,24,66,.45)' }} onPress={() => !busy && onClose(false)} />
        <View style={{ backgroundColor: colors.bg, padding: 16, gap: 12, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
          <H>{prompt.title}</H>
          {prompt.text ? <Muted>{prompt.text}</Muted> : null}
          <Field label={prompt.label} value={v} onChangeText={setV} placeholder={prompt.placeholder} autoFocus maxLength={300} keyboardType={prompt.keyboardType} />
          {err ? <Text style={{ color: colors.error, fontSize: 13 }}>{err}</Text> : null}
          <Button title={prompt.confirm || 'Xác nhận'} variant={prompt.danger ? 'danger' : 'primary'} loading={busy} onPress={ok} />
          <Button title="Hủy" variant="ghost" disabled={busy} onPress={() => onClose(false)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ===== Tổng quan quản trị =====
export function AdminHomeScreen({ navigation }) {
  const [range, setRange] = useState('today');
  const d = useLoad(async () => (await A.admin.dashboard({ range })).data, [range], { reloadOnFocus: true });
  const w = useLoad(async () => (await A.admin.withdrawals({ status: 'pending' })).data.pendingCount, [], { reloadOnFocus: true });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const k = d.data.kpis;
  const q = d.data.queue || {};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={() => { d.refresh(); w.refresh(); }} refreshing={d.refreshing}>
        <H style={{ fontSize: 22 }}>Tổng quan cửa hàng</H>
        <View style={{ flexDirection: 'row', gap: 8 }}>{[['today', 'Hôm nay'], ['7d', '7 ngày'], ['30d', '30 ngày']].map(([key, l]) => <Chip key={key} label={l} active={range === key} onPress={() => setRange(key)} />)}</View>
        <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <Text style={{ color: '#d8e2ff', fontWeight: '700', fontSize: 12 }}>DOANH THU</Text>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900' }}>{formatCurrency(k.sales?.value)}</Text>
          <Text style={{ color: '#d8e2ff', fontSize: 13 }}>{k.orders?.value || 0} đơn · TB {formatCurrency(k.avgOrderValue)}/đơn{k.sales?.changePct != null ? ` · ${k.sales.changePct > 0 ? '+' : ''}${k.sales.changePct}% so với kỳ trước` : ''}</Text>
        </Card>
        {w.data ? <Banner tone="warn" icon="cash-outline" title={`${w.data} yêu cầu rút tiền đang chờ`} text="Chuyển khoản cho khách rồi xác nhận trong mục Tài chính.">
          <Pressable onPress={() => navigation.navigate('AdminFinance', { tab: 'withdrawals' })}><Text style={{ fontWeight: '700', color: colors.warnText }}>Xử lý ngay</Text></Pressable></Banner> : null}
        <SectionTitle title="Đơn đang xử lý" icon="receipt-outline" action="Tất cả đơn" onAction={() => navigation.navigate('AdminOrders')} />
        <Grid>
          <Stat label="Mới" value={q.confirmed || 0} tone={q.confirmed ? 'warn' : ''} onPress={() => navigation.navigate('AdminOrders', { status: 'confirmed' })} />
          <Stat label="Đang chuẩn bị" value={q.preparing || 0} onPress={() => navigation.navigate('AdminOrders', { status: 'preparing' })} />
          <Stat label="Chờ khách nhận" value={q.ready_for_pickup || 0} tone="ok" onPress={() => navigation.navigate('AdminOrders', { status: 'ready_for_pickup' })} />
          <Stat label="Chờ thanh toán" value={q.pending_payment || 0} onPress={() => navigation.navigate('AdminOrders', { status: 'pending_payment' })} />
        </Grid>
        <SectionTitle title="Cửa hàng" icon="storefront-outline" />
        <Grid>
          <Stat label="Khách đã phục vụ" value={k.customersServed || 0} />
          <Stat label="Khách mới" value={k.newCustomers || 0} />
          <Stat label="Sắp hết hàng" value={k.lowStock || 0} tone={k.lowStock ? 'warn' : ''} onPress={() => navigation.navigate('AdminProducts')} />
          <Stat label="Hết hàng" value={k.outOfStock || 0} tone={k.outOfStock ? 'error' : ''} onPress={() => navigation.navigate('AdminProducts')} />
        </Grid>
        {(d.data.topProducts || []).length ? <SectionTitle title="Bán chạy" icon="trending-up-outline" /> : null}
        {(d.data.topProducts || []).slice(0, 5).map((p) => (
          <Card key={p.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
            <Thumb uri={p.image} size={40} /><View style={{ flex: 1 }}><T style={{ fontWeight: '600' }} numberOfLines={1}>{p.name}</T><Muted>{p.units} {p.unit}</Muted></View>
            <T style={{ fontWeight: '800' }}>{formatCurrency(p.revenue)}</T>
          </Card>))}
      </Screen>
    </SafeAreaView>
  );
}

// ===== Đơn hàng =====
const TABS = [['', 'Tất cả'], ['confirmed', 'Mới'], ['preparing', 'Đang chuẩn bị'], ['ready_for_pickup', 'Chờ nhận'], ['pending_payment', 'Chờ thanh toán'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy'], ['failed', 'Lỗi thanh toán']];
export function AdminOrdersScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status || '');
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const [shown, setShown] = useState(route.params?.status);
  if (route.params?.status !== shown) { setShown(route.params?.status); if (route.params?.status) setStatus(route.params.status); }
  const d = useLoad(async () => (await A.admin.orders({ status: status || undefined, q: dq || undefined, limit: 50 })).data, [status, dq], { reloadOnFocus: true });
  const c = d.data?.counts || {};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <H style={{ fontSize: 22 }}>Đơn hàng</H>
        <Field value={q} onChangeText={setQ} placeholder="Mã đơn, tên hoặc email khách" autoCapitalize="none" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map(([k, l]) => <Chip key={k} label={l} count={c[k || 'all']} active={status === k} onPress={() => setStatus(k)} />)}
        </ScrollView>
      </View>
      <FlatList data={d.data?.items || []} keyExtractor={(o) => o._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: o }) => (
          <Card onPress={() => navigation.navigate('AdminOrderDetail', { id: o._id })} style={{ padding: 14, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</T><StatusBadge status={o.status} /></View>
            <Muted>{o.source === 'store' ? 'Tại quầy' : 'Online'} · {o.customer?.fullName || 'Khách lẻ'} · {o.itemCount} món · {formatDateTime(o.createdAt)}</Muted>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>{PAYMENT_STATUS[o.paymentStatus]?.label}{o.openIssues ? ` · ${o.openIssues} sự cố` : ''}</Muted><T style={{ fontWeight: '800' }}>{formatCurrency(o.totalAmount)}</T>
            </View>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : d.error ? <ErrorView message={d.error} onRetry={d.reload} /> : <Empty icon="receipt-outline" title="Không có đơn" />} />
    </SafeAreaView>
  );
}

export function AdminOrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const d = useLoad(async () => (await A.admin.order(id)).data, [id], { reloadOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const o = d.data;
  const next = o.source === 'online' && o.paymentStatus === 'paid' ? NEXT[o.status] : null;
  const advance = async () => {
    setBusy(true);
    try { await A.admin.advance(o._id, { status: next }); d.refresh(); } catch (e) { Alert.alert('Không cập nhật được', errMsg(e)); d.refresh(); } finally { setBusy(false); }
  };
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Muted>{o.source === 'store' ? 'BÁN TẠI QUẦY' : 'ONLINE'}</Muted><StatusBadge status={o.status} /></View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{o.orderCode}</Text>
        <Muted>Đặt lúc {formatDateTime(o.createdAt)} · {formatCurrency(o.totalAmount)}</Muted>
        <Row label="Khách hàng" value={o.customer ? o.customer.fullName : 'Khách lẻ'} />
        {o.customer?.email ? <Row label="Email" value={o.customer.email} /> : null}
        {o.customer?.phone ? <Row label="SĐT" value={o.customer.phone} /> : null}
      </Card>
      {o.status === 'cancelled' ? <Banner tone="error" icon="close-circle-outline" title={`Đã hủy${o.cancelFault ? ` · ${o.cancelFault === 'store' ? 'do cửa hàng' : 'do khách'}` : ''}`}
        text={`Lý do: ${reasonVi(o.cancelReason)}${o.refund ? `\nĐã hoàn ${formatCurrency(o.refund.amount)} vào ví khách.` : ''}${o.compensation?.code ? `\nVoucher xin lỗi: ${o.compensation.code}` : ''}`} /> : null}

      <Card>
        <H>Người xử lý</H>
        {!o.handledBy?.length ? <Muted>Chưa có nhân viên nào xử lý đơn này.</Muted> : o.handledBy.map((h) => (
          <View key={h._id} style={{ gap: 4 }}>
            <Pressable disabled={h.role !== 'staff'} onPress={() => navigation.navigate('AdminStaffDetail', { id: h._id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={{ fontWeight: '800', color: h.role === 'staff' ? colors.primary : colors.text }}>{h.fullName}{h.role === 'admin' ? ' (admin)' : ''}</Text>
              {h.role === 'staff' ? <Icon name="chevron-forward" size={14} color={colors.primary} /> : null}
            </Pressable>
            {h.steps.map((s, i) => <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingLeft: 26 }}><T style={{ flex: 1, fontSize: 13 }}>{stepVi(s.label)}</T><Muted style={{ fontSize: 12 }}>{formatDateTime(s.at)}</Muted></View>)}
          </View>))}
      </Card>

      <Card>
        <H>Sản phẩm</H>
        {o.items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Thumb uri={it.image} size={42} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }} numberOfLines={2}>{it.name}</T><Muted>{formatCurrency(it.unitPrice)} × {it.quantity}</Muted></View>
            <T style={{ fontWeight: '700' }}>{formatCurrency(it.lineTotal)}</T>
          </View>))}
        <Divider />
        <Row label="Tạm tính" value={formatCurrency(o.subtotal)} />
        {o.promotionDiscount > 0 ? <Row label="Khuyến mãi" value={`-${formatCurrency(o.promotionDiscount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        {o.discountCode ? <Row label={`Mã ${o.discountCode.code}`} value={`-${formatCurrency(o.discountCode.amount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        <Row label="Tổng" value={formatCurrency(o.totalAmount)} bold />
      </Card>

      <Card>
        <H>Thanh toán</H>
        <Row label="Phương thức" value={PAYMENT_METHOD[o.paymentMethod] || '—'} />
        <Row label="Trạng thái" value={PAYMENT_STATUS[o.paymentStatus]?.label || o.paymentStatus} />
        {o.walletAmount > 0 ? <Row label="Trừ ví" value={formatCurrency(o.walletAmount)} /> : null}
        {(o.transactions || []).map((t) => <Muted key={t._id}>• {PAYMENT_METHOD[t.method] || t.method} {formatCurrency(t.amount)} · {t.status}{t.processedBy ? ` · ${t.processedBy}` : ''} · {formatDateTime(t.paidAt || t.createdAt)}</Muted>)}
      </Card>

      <Card>
        <H>Lịch sử trạng thái</H>
        {o.statusHistory.map((h, i) => <Muted key={i}>• {ORDER_STATUS[h.status]?.label || h.status} · {formatDateTime(h.changedAt)} · {h.changedBy || 'Hệ thống'}{h.note ? ` · ${h.note}` : ''}</Muted>)}
      </Card>

      {next ? <Button title={NEXT_LABEL[next]} icon="arrow-forward-circle-outline" loading={busy} onPress={advance} /> : null}
      {CANCELLABLE.includes(o.status) ? <Button title="Hủy đơn" icon="close-circle-outline" variant="ghost" onPress={() => setCancelOpen(true)} /> : null}
      <CancelSheet visible={cancelOpen} order={o} mode="staff" onSubmit={(body) => A.admin.cancel(o._id, body)} onClose={(ok) => { setCancelOpen(false); if (ok) d.refresh(); }} />
    </Screen>
  );
}

// ===== Tài chính: hoàn tiền đơn hủy + duyệt rút tiền =====
const W_STATUS = { pending: ['Chờ chuyển', 'warn'], paid: ['Đã chuyển', 'success'], rejected: ['Từ chối', 'error'] };
export function AdminFinanceScreen({ route }) {
  const [tab, setTab] = useState(route.params?.tab || 'withdrawals');
  const [wStatus, setWStatus] = useState('pending');
  const [fault, setFault] = useState('');
  const [prompt, setPrompt] = useState(null);
  const w = useLoad(async () => (tab === 'withdrawals' ? (await A.admin.withdrawals({ status: wStatus || undefined })).data : null), [tab, wStatus], { reloadOnFocus: true });
  const r = useLoad(async () => (tab === 'refunds' ? (await A.admin.refunds({ fault: fault || undefined, limit: 50 })).data : null), [tab, fault], { reloadOnFocus: true });
  const transfer = (x) => setPrompt({ title: `Xác nhận đã chuyển ${formatCurrency(x.amount)}`, text: `Chuyển tới ${x.bankName} ${x.accountNumber} (${x.accountName}) từ tài khoản cửa hàng, rồi nhập mã giao dịch.`, label: 'Mã chuyển khoản', placeholder: 'FT2631...', confirm: 'Đã chuyển khoản', onSubmit: (v) => A.admin.processWithdrawal(x._id, { action: 'paid', reference: v }) });
  const reject = (x) => setPrompt({ title: `Từ chối yêu cầu ${formatCurrency(x.amount)}`, text: 'Số tiền được trả lại vào ví của khách.', label: 'Lý do (khách sẽ thấy)', placeholder: 'Tên chủ tài khoản không khớp', confirm: 'Từ chối', danger: true, onSubmit: (v) => A.admin.processWithdrawal(x._id, { action: 'rejected', note: v }) });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={() => (tab === 'withdrawals' ? w.refresh() : r.refresh())} refreshing={w.refreshing || r.refreshing}>
        <H style={{ fontSize: 22 }}>Tài chính</H>
        <View style={{ flexDirection: 'row', gap: 8 }}><Chip label="Rút tiền" active={tab === 'withdrawals'} onPress={() => setTab('withdrawals')} /><Chip label="Hoàn tiền đơn" active={tab === 'refunds'} onPress={() => setTab('refunds')} /></View>
        {tab === 'withdrawals' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[['pending', 'Chờ chuyển'], ['paid', 'Đã chuyển'], ['rejected', 'Từ chối'], ['', 'Tất cả']].map(([k, l]) => <Chip key={k} label={l} count={k === 'pending' ? w.data?.pendingCount : undefined} active={wStatus === k} onPress={() => setWStatus(k)} />)}
            </ScrollView>
            {w.loading && !w.data ? <Loading /> : w.error ? <ErrorView message={w.error} onRetry={w.reload} /> : !w.data?.items.length ? <Empty icon="cash-outline" title="Không có yêu cầu" /> : w.data.items.map((x) => (
              <Card key={x._id} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{formatCurrency(x.amount)}</Text><Badge label={W_STATUS[x.status]?.[0]} tone={W_STATUS[x.status]?.[1]} /></View>
                <T style={{ fontWeight: '700' }}>{x.customer?.fullName} <Muted>· {x.customer?.email}</Muted></T>
                <Muted>{x.bankName} · {x.accountNumber} · {x.accountName}</Muted>
                <Muted>Yêu cầu lúc {formatDateTime(x.createdAt)}{x.processedAt ? ` · xử lý ${formatDateTime(x.processedAt)}` : ''}</Muted>
                {x.reference ? <Muted>Mã chuyển khoản: {x.reference}</Muted> : null}{x.note ? <Muted>Lý do: {x.note}</Muted> : null}
                {x.status === 'pending' ? <View style={{ flexDirection: 'row', gap: 8 }}><Button small title="Đã chuyển" icon="checkmark" style={{ flex: 1 }} onPress={() => transfer(x)} /><Button small title="Từ chối" variant="ghost" style={{ flex: 1 }} onPress={() => reject(x)} /></View> : null}
              </Card>))}
          </>) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>{[['', 'Tất cả'], ['customer', 'Do khách'], ['store', 'Do cửa hàng']].map(([k, l]) => <Chip key={k} label={l} active={fault === k} onPress={() => setFault(k)} />)}</View>
            {r.data ? <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{r.data.total}</Text><Muted>Đơn đã hoàn</Muted></View>
              <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, fontWeight: '900', color: colors.tertiary }}>{formatCurrency(r.data.summary.totalAmount)}</Text><Muted>Đã hoàn vào ví</Muted></View>
            </Card> : null}
            {r.loading && !r.data ? <Loading /> : r.error ? <ErrorView message={r.error} onRetry={r.reload} /> : !r.data?.items.length ? <Empty icon="wallet-outline" title="Chưa có hoàn tiền" /> : r.data.items.map((x) => (
              <Card key={x._id} style={{ gap: 4, padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{x.orderCode}</T><T style={{ fontWeight: '800' }}>{formatCurrency(x.amount)}</T></View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{x.fault ? <Badge label={x.fault === 'store' ? 'Do cửa hàng' : 'Do khách'} tone={x.fault === 'store' ? 'warn' : 'neutral'} /> : null}{x.voucher ? <Badge icon="gift-outline" label={x.voucher} tone="info" /> : null}</View>
                <Muted>{x.customer?.fullName || 'Khách lẻ'} · {reasonVi(x.reason)}</Muted>
                <Muted>Hoàn lúc {formatDateTime(x.refundedAt)}{x.refundedBy ? ` · ${x.refundedBy}` : ''}</Muted>
              </Card>))}
          </>)}
      </Screen>
      <PromptSheet prompt={prompt} onClose={(ok) => { setPrompt(null); if (ok) { w.refresh(); } }} />
    </SafeAreaView>
  );
}

// ===== Ca làm: mở ca trống theo tuần, xem ai nhận, chấm công =====
const PRESETS = [['06:00', '14:00', 'Sáng'], ['14:00', '22:00', 'Chiều'], ['22:00', '06:00', 'Đêm']];
const SHIFT_ST = { scheduled: ['Sắp tới', 'info'], in_progress: ['Đang làm', 'warn'], completed: ['Hoàn thành', 'success'], missed: ['Vắng', 'error'] };
export function AdminShiftsScreen() {
  const [week, setWeek] = useState(monday(new Date()));
  const from = ymd(week), to = ymd(addDays(week, 6));
  const s = useLoad(async () => (await A.shifts.slots({ from, to })).data.items, [from], { reloadOnFocus: true });
  const att = useLoad(async () => (await A.shifts.attendance({ from, to, limit: 100 })).data, [from], { reloadOnFocus: true });
  const [form, setForm] = useState(null);
  const reload = () => { s.refresh(); att.refresh(); };
  const byDay = Array.from({ length: 7 }, (_, i) => ymd(addDays(week, i))).map((day) => [day, (s.data || []).filter((x) => ymd(new Date(x.shiftDate)) === day)]);
  const del = (x) => Alert.alert('Xóa ca trống?', `${dayText(x.shiftDate)} ${x.startTime}–${x.endTime}`, [{ text: 'Không', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await A.shifts.deleteSlot(x._id); } catch (e) { Alert.alert('Không xóa được', errMsg(e)); } reload(); } }]);
  const removeStaff = (p, x) => Alert.alert('Gỡ nhân viên khỏi ca?', `${p.fullName} · ${dayText(x.shiftDate)} ${x.startTime}–${x.endTime}`, [{ text: 'Không', style: 'cancel' }, { text: 'Gỡ', style: 'destructive', onPress: async () => { try { await A.shifts.removeStaff(p.shiftId); } catch (e) { Alert.alert('Không gỡ được', errMsg(e)); } reload(); } }]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={reload} refreshing={s.refreshing}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><H style={{ fontSize: 22 }}>Ca làm</H><Button small title="Mở ca" icon="add" onPress={() => setForm({ from: ymd(new Date()), to: ymd(addDays(new Date(), 6)), startTime: '06:00', endTime: '14:00', capacity: '2' })} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => setWeek(addDays(week, -7))} hitSlop={10}><Icon name="chevron-back" size={24} color={colors.primary} /></Pressable>
          <T style={{ fontWeight: '800' }}>{formatDate(week)} – {formatDate(addDays(week, 6))}</T>
          <Pressable onPress={() => setWeek(addDays(week, 7))} hitSlop={10}><Icon name="chevron-forward" size={24} color={colors.primary} /></Pressable>
        </View>
        {s.loading && !s.data ? <Loading /> : byDay.map(([day, list]) => (
          <Card key={day} style={{ padding: 12, gap: 8, borderColor: day === ymd(new Date()) ? colors.primary : colors.border }}>
            <T style={{ fontWeight: '800' }}>{dayText(day)}</T>
            {!list.length ? <Muted>Chưa mở ca</Muted> : list.map((x) => (
              <View key={x._id} style={{ gap: 4, padding: 10, borderRadius: radius.md, backgroundColor: x.full ? colors.okBg : x.started ? colors.surfaceLow : '#fff8e6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T style={{ fontWeight: '800' }}>{x.startTime}–{x.endTime}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Badge label={`${x.filled}/${x.capacity}`} tone={x.full ? 'success' : 'warn'} />{!x.started && x.filled === 0 ? <Pressable onPress={() => del(x)} hitSlop={8}><Icon name="trash-outline" size={18} color={colors.error} /></Pressable> : null}</View>
                </View>
                {x.staff.map((p) => (
                  <View key={p.shiftId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Badge label={SHIFT_ST[p.status]?.[0]} tone={SHIFT_ST[p.status]?.[1]} /><T style={{ flex: 1 }} numberOfLines={1}>{p.fullName}</T>
                    {p.status === 'scheduled' && !x.started ? <Pressable onPress={() => removeStaff(p, x)} hitSlop={8}><Icon name="close" size={18} color={colors.error} /></Pressable> : null}
                  </View>))}
                {!x.started && x.filled < x.capacity ? <Muted style={{ color: colors.tertiary, fontWeight: '600' }}>Còn {x.capacity - x.filled} chỗ</Muted> : null}
              </View>))}
          </Card>))}
        {att.data?.summary?.length ? <SectionTitle title="Giờ công tuần này" icon="stats-chart-outline" /> : null}
        {(att.data?.summary || []).map((r) => (
          <Card key={r.staff._id} style={{ padding: 12, gap: 4 }}>
            <T style={{ fontWeight: '800' }}>{r.staff.fullName} <Muted>· {r.staff.employeeCode}</Muted></T>
            <Muted>{r.shifts} ca · làm {Math.round(r.workedMinutes / 6) / 10}h / {Math.round(r.plannedMinutes / 6) / 10}h · {r.completed} hoàn thành · {r.missed} vắng · {r.late} trễ</Muted>
            <T style={{ fontWeight: '700' }}>Lương: {formatCurrency(r.pay)}</T>
          </Card>))}
      </Screen>
      <SlotForm form={form} setForm={setForm} onDone={reload} />
    </SafeAreaView>
  );
}

// Form mở ca trống cho nhiều ngày liên tiếp
function SlotForm({ form, setForm, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!form) return null;
  const set = (k) => (v) => { setForm({ ...form, [k]: v }); setErr(''); };
  const save = async () => {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(form.from) || !re.test(form.to) || form.from > form.to) return setErr('Ngày theo dạng YYYY-MM-DD, ngày bắt đầu trước ngày kết thúc.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.endTime)) return setErr('Giờ theo dạng HH:MM.');
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return setErr('Số người từ 1 đến 20.');
    const dates = [];
    for (let d = new Date(`${form.from}T00:00:00`); ymd(d) <= form.to && dates.length < 31; d = addDays(d, 1)) dates.push(ymd(d));
    setBusy(true); setErr('');
    try { await A.shifts.createSlots({ dates, startTime: form.startTime, endTime: form.endTime, capacity }); setForm(null); onDone(); Alert.alert('Đã mở ca', `${dates.length} ca × ${capacity} người. Nhân viên có thể nhận ca ngay.`); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,24,66,.45)' }} onPress={() => !busy && setForm(null)} />
        <ScrollView style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%' }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <H>Mở ca trống</H>
          <Muted>Mỗi ngày trong khoảng sẽ có một ca. Nhân viên tự nhận ca trong app.</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>{PRESETS.map(([a, b, l]) => <Chip key={l} label={`${l} ${a}–${b}`} active={form.startTime === a && form.endTime === b} onPress={() => setForm({ ...form, startTime: a, endTime: b })} />)}</View>
          <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Từ ngày" value={form.from} onChangeText={set('from')} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Đến ngày" value={form.to} onChangeText={set('to')} placeholder="YYYY-MM-DD" /></View></View>
          <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Bắt đầu" value={form.startTime} onChangeText={set('startTime')} placeholder="06:00" /></View><View style={{ flex: 1 }}><Field label="Kết thúc" value={form.endTime} onChangeText={set('endTime')} placeholder="14:00" /></View></View>
          <Field label="Số nhân viên mỗi ca" value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad" />
          {err ? <Text style={{ color: colors.error, fontSize: 13 }}>{err}</Text> : null}
          <Button title="Mở ca" loading={busy} onPress={save} />
          <Button title="Hủy" variant="ghost" disabled={busy} onPress={() => setForm(null)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ===== Nhân viên: danh sách + chi tiết (đơn đã xử lý) =====
export function AdminStaffScreen({ navigation }) {
  const d = useLoad(async () => (await A.admin.staffList({ limit: 100 })).data, [], { reloadOnFocus: true });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <FlatList data={d.data?.items || []} keyExtractor={(x) => x._id} contentContainerStyle={{ padding: 16, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: x }) => (
          <Card onPress={() => navigation.navigate('AdminStaffDetail', { id: x._id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <Icon name="person-circle" size={40} color={x.status === 'locked' ? colors.outline : colors.primary} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{x.fullName}</T><Muted>{x.employeeCode} · {x.position || 'Nhân viên'} · {x.email}</Muted><Muted style={{ fontSize: 12 }}>Đăng nhập gần nhất {x.lastLoginAt ? formatDateTime(x.lastLoginAt) : '—'}</Muted></View>
            <Badge label={x.status === 'locked' ? 'Đã khóa' : 'Hoạt động'} tone={x.status === 'locked' ? 'error' : 'success'} />
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : <Empty icon="people-outline" title="Chưa có nhân viên" />} />
    </SafeAreaView>
  );
}

export function AdminStaffDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [range, setRange] = useState('all');
  const params = range === 'today' ? { from: ymd(new Date()), to: ymd(new Date()) } : range === '7d' ? { from: ymd(addDays(new Date(), -6)), to: ymd(new Date()) } : {};
  const info = useLoad(async () => (await A.admin.staffDetail(id, params)).data, [id, range], { reloadOnFocus: true });
  const orders = useLoad(async () => (await A.admin.staffOrders(id, { ...params, limit: 30 })).data, [id, range]);
  const [busy, setBusy] = useState(false);
  if (info.loading && !info.data) return <Loading />;
  if (info.error && !info.data) return <ErrorView message={info.error} onRetry={info.reload} />;
  const { staff: st, stats: n } = info.data;
  const toggleLock = () => Alert.alert(st.status === 'locked' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?', st.status === 'locked' ? `${st.fullName} sẽ đăng nhập lại được.` : `${st.fullName} sẽ không đăng nhập được cho đến khi mở khóa.`,
    [{ text: 'Hủy', style: 'cancel' }, { text: st.status === 'locked' ? 'Mở khóa' : 'Khóa', style: 'destructive', onPress: async () => { setBusy(true); try { await (st.status === 'locked' ? A.admin.unlockStaff(id) : A.admin.lockStaff(id)); } catch (e) { Alert.alert('Lỗi', errMsg(e)); } setBusy(false); info.refresh(); } }]);
  return (
    <Screen onRefresh={() => { info.refresh(); orders.refresh(); }} refreshing={info.refreshing}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><H style={{ fontSize: 20 }}>{st.fullName}</H><Badge label={st.status === 'locked' ? 'Đã khóa' : 'Hoạt động'} tone={st.status === 'locked' ? 'error' : 'success'} /></View>
        <Muted>{st.employeeCode} · {st.position || 'Nhân viên'}</Muted>
        <Row label="Email" value={st.email} />{st.phone ? <Row label="SĐT" value={st.phone} /> : null}
        <Row label="Vào làm" value={st.hiredAt ? formatDate(st.hiredAt) : '—'} />
        <Row label="Đăng nhập gần nhất" value={st.lastLoginAt ? formatDateTime(st.lastLoginAt) : '—'} />
        <Button small variant={st.status === 'locked' ? 'soft' : 'ghost'} title={st.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'} loading={busy} onPress={toggleLock} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[['all', 'Toàn bộ'], ['today', 'Hôm nay'], ['7d', '7 ngày']].map(([k, l]) => <Chip key={k} label={l} active={range === k} onPress={() => setRange(k)} />)}</View>
      <Grid>
        <Stat label="Đơn đã xử lý" value={n.handled} /><Stat label="Bắt đầu chuẩn bị" value={n.prepared} />
        <Stat label="Đã giao khách" value={n.handedOver} tone="ok" /><Stat label="Đã hủy" value={n.cancelled} tone={n.cancelled ? 'warn' : ''} />
        <Stat label="Bill tại quầy" value={n.counterSales} /><Stat label="Tiền đã thu" value={formatCurrency(n.collected)} />
      </Grid>
      <SectionTitle title="Đơn đã xử lý" icon="receipt-outline" />
      {orders.loading && !orders.data ? <Loading /> : !orders.data?.items.length ? <Muted>Chưa xử lý đơn nào trong khoảng này.</Muted> : orders.data.items.map((o) => (
        <Card key={o._id} onPress={() => navigation.navigate('AdminOrderDetail', { id: o._id })} style={{ padding: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</T><StatusBadge status={o.status} /></View>
          <Muted>{o.source === 'store' ? 'Tại quầy' : 'Online'} · {o.customer || 'Khách lẻ'} · {formatCurrency(o.totalAmount)}</Muted>
          {o.steps.map((s, i) => <Muted key={i} style={{ fontSize: 12 }}>{formatTime(s.at)} {formatDate(s.at).slice(0, 5)} · {stepVi(s.label)}{s.amount ? ` (${formatCurrency(s.amount)})` : ''}</Muted>)}
        </Card>))}
    </Screen>
  );
}

// ===== Sản phẩm: xem tồn, đổi giá, bật / tắt bán =====
export function AdminProductsScreen() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const [stock, setStock] = useState('');
  const d = useLoad(async () => (await A.admin.products({ q: dq || undefined, stock: stock || undefined, limit: 100 })).data, [dq, stock], { reloadOnFocus: true });
  const [prompt, setPrompt] = useState(null);
  const toggle = (p) => Alert.alert(p.status === 'active' ? 'Ngừng bán?' : 'Mở bán lại?', p.name, [{ text: 'Hủy', style: 'cancel' }, { text: 'Đồng ý', onPress: async () => { try { await (p.status === 'active' ? A.admin.deactivateProduct(p._id) : A.admin.activateProduct(p._id)); } catch (e) { Alert.alert('Lỗi', errMsg(e)); } d.refresh(); } }]);
  const price = (p) => setPrompt({ title: `Đổi giá: ${p.name}`, text: `Giá hiện tại ${formatCurrency(p.price)}.`, label: 'Giá mới (VND)', placeholder: String(p.price), keyboardType: 'number-pad', confirm: 'Lưu giá', onSubmit: (v) => A.admin.updatePrice(p._id, { price: Number(v.replace(/\D/g, '')) }) });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <Field value={q} onChangeText={setQ} placeholder="Tìm tên hoặc SKU" />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[['', 'Tất cả'], ['low', 'Sắp hết'], ['out', 'Hết hàng']].map(([k, l]) => <Chip key={k} label={l} active={stock === k} onPress={() => setStock(k)} />)}</View>
      </View>
      <FlatList data={d.data?.items || []} keyExtractor={(p) => p._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: p }) => (
          <Card style={{ padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Thumb uri={p.images?.[0]} size={52} />
              <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }} numberOfLines={2}>{p.name}</T><Muted>{p.sku} · {p.categoryId?.name} · tồn {p.stockQuantity}</Muted></View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}><T style={{ fontWeight: '800', color: colors.primary }}>{formatCurrency(p.price)}</T><Badge label={p.status === 'active' ? 'Đang bán' : 'Ngừng bán'} tone={p.status === 'active' ? 'success' : 'neutral'} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}><Button small variant="soft" title="Đổi giá" icon="pricetag-outline" style={{ flex: 1 }} onPress={() => price(p)} /><Button small variant="ghost" title={p.status === 'active' ? 'Ngừng bán' : 'Mở bán'} style={{ flex: 1 }} onPress={() => toggle(p)} /></View>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : <Empty icon="cube-outline" title="Không có sản phẩm" />} />
      <PromptSheet prompt={prompt} onClose={(ok) => { setPrompt(null); if (ok) d.refresh(); }} />
    </SafeAreaView>
  );
}

// ===== Khách hàng =====
export function AdminCustomersScreen({ navigation }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const d = useLoad(async () => (await A.admin.customers({ q: dq || undefined, limit: 100 })).data, [dq], { reloadOnFocus: true });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ padding: 16, paddingBottom: 8 }}><Field value={q} onChangeText={setQ} placeholder="Tên, email hoặc SĐT" autoCapitalize="none" /></View>
      <FlatList data={d.data?.items || []} keyExtractor={(x) => x._id} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }} refreshing={d.refreshing} onRefresh={d.refresh}
        renderItem={({ item: x }) => (
          <Card onPress={() => navigation.navigate('AdminCustomerDetail', { id: x._id })} style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontWeight: '800' }}>{x.fullName}</T><Badge label={x.tier || 'Thành viên'} tone="warn" /></View>
            <Muted>{x.email || '—'}{x.phone ? ` · ${x.phone}` : ''}</Muted>
            <Muted>{x.orderCount} đơn{x.openComplaints ? ` · ${x.openComplaints} khiếu nại mở` : ''}{x.status !== 'active' ? ` · ${x.status}` : ''}</Muted>
          </Card>)}
        ListEmptyComponent={d.loading ? <Loading /> : <Empty icon="people-outline" title="Không có khách hàng" />} />
    </SafeAreaView>
  );
}

export function AdminCustomerDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const d = useLoad(async () => (await A.admin.customer(id)).data, [id]);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const c = d.data;
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Card>
        <H style={{ fontSize: 20 }}>{c.fullName}</H>
        <Row label="Email" value={c.email || '—'} /><Row label="SĐT" value={c.phone || '—'} />
        <Row label="Hạng" value={`${c.membership?.tier || '—'} · ${c.membership?.points || 0} điểm`} />
        <Row label="Tham gia" value={formatDate(c.joinedAt)} />
        <Row label="Trạng thái" value={c.status} />
      </Card>
      <Grid>
        <Stat label="Tổng đơn" value={c.stats.orderCount} /><Stat label="Đã nhận" value={c.stats.completedCount} />
        <Stat label="Tổng chi tiêu" value={formatCurrency(c.stats.totalSpent)} /><Stat label="Khiếu nại mở" value={c.complaints?.openCount || 0} tone={c.complaints?.openCount ? 'warn' : ''} />
      </Grid>
      <SectionTitle title="Đơn gần đây" icon="receipt-outline" />
      {(c.recentOrders || []).map((o) => (
        <Card key={o._id} onPress={() => navigation.navigate('AdminOrderDetail', { id: o._id })} style={{ padding: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T style={{ fontWeight: '800', color: colors.primary }}>{o.orderCode}</T><StatusBadge status={o.status} /></View>
          <Muted>{formatDateTime(o.createdAt)} · {formatCurrency(o.totalAmount)}</Muted>
        </Card>))}
    </Screen>
  );
}

export const AdminMoreScreen = (p) => <MoreScreen {...p} links={[
  ['people-outline', 'Nhân viên', 'AdminStaff'], ['cube-outline', 'Sản phẩm & giá', 'AdminProducts'], ['person-outline', 'Khách hàng', 'AdminCustomers'],
  ['notifications-outline', 'Thông báo', 'Notifications'], ['person-circle-outline', 'Hồ sơ cá nhân', 'Profile'],
]} />;
