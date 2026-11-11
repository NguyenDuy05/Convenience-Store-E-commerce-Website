import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { Badge, Banner, Button, Card, Divider, Empty, ErrorView, Field, H, Icon, Loading, Muted, Screen, T, Text } from '../components/ui';
import { colors } from '../theme';
import { errMsg, formatCurrency, formatDateTime } from '../utils/format';

const MIN_WITHDRAW = 10000;
const W_STATUS = { pending: ['Chờ chuyển khoản', 'warn'], paid: ['Đã chuyển', 'success'], rejected: ['Bị từ chối, đã trả lại ví', 'error'] };
const EMPTY = { amount: '', bankName: '', accountNumber: '', accountName: '' };
// Mô tả giao dịch ví bằng tiếng Việt (server ghi tiếng Anh như web)
const WALLET_TEXT = [
  [/^Order refund to wallet$/, 'Hoàn tiền đơn bị hủy'], [/^Wallet payment returned$/, 'Trả lại tiền ví đã dùng cho đơn'], [/^Order payment$/, 'Thanh toán đơn hàng'],
  [/^Checkout reversed$/, 'Hoàn lại do đặt hàng không thành công'], [/^Additional payment returned to wallet$/, 'Hoàn khoản thanh toán thừa'],
  [/^Withdrawal to (.+) \(pending\)$/, 'Rút tiền về $1'], [/^Withdrawal rejected: (.+)$/, 'Yêu cầu rút bị từ chối: $1'],
];
const walletText = (t) => { for (const [re, vi] of WALLET_TEXT) if (re.test(t || '')) return t.replace(re, vi); return t; };

// Ví QUICK: số dư, rút tiền về ngân hàng, lịch sử cộng / trừ
export function WalletScreen({ navigation }) {
  const { user } = useAuth();
  const w = useLoad(async () => (user ? (await A.wallet.get({ limit: 30 })).data : null), [user?.id], { reloadOnFocus: true });
  const wd = useLoad(async () => (user ? (await A.wallet.myWithdrawals()).data.items : []), [user?.id], { reloadOnFocus: true });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!user) return <NeedLogin title="Ví QUICK" text="Đăng nhập để xem số dư và tiền hoàn." />;
  if (w.loading && !w.data) return <Loading />;
  if (w.error && !w.data) return <ErrorView message={w.error} onRetry={w.reload} />;
  const data = w.data;
  const set = (k) => (v) => { setF({ ...f, [k]: v }); setError(''); };
  const submit = async () => {
    const amount = Number(String(f.amount).replace(/\D/g, ''));
    if (!amount || amount < MIN_WITHDRAW) return setError(`Rút tối thiểu ${formatCurrency(MIN_WITHDRAW)}.`);
    if (amount > data.balance) return setError('Số tiền lớn hơn số dư ví.');
    if (!/^\d{6,20}$/.test(f.accountNumber.replace(/\s/g, ''))) return setError('Số tài khoản gồm 6–20 chữ số.');
    if (f.bankName.trim().length < 2 || f.accountName.trim().length < 2) return setError('Nhập tên ngân hàng và tên chủ tài khoản.');
    setBusy(true); setError('');
    try {
      await A.wallet.withdraw({ amount, bankName: f.bankName, accountNumber: f.accountNumber, accountName: f.accountName });
      setNotice(`Đã gửi yêu cầu rút ${formatCurrency(amount)}. Số tiền được giữ trong ví cho đến khi cửa hàng chuyển khoản (thường 1–3 ngày làm việc).`);
      setF(EMPTY); setOpen(false); w.refresh(); wd.refresh();
    } catch (e) { setError(errMsg(e, 'Không gửi được yêu cầu. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  };
  return (
    <Screen onRefresh={() => { w.refresh(); wd.refresh(); }} refreshing={w.refreshing}>
      <Card style={{ backgroundColor: '#174d3b', borderColor: '#174d3b' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="wallet" size={22} color="#fff" /><Text style={{ color: '#cfe8dc', fontWeight: '700' }}>SỐ DƯ KHẢ DỤNG</Text></View>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{formatCurrency(data.balance)}</Text>
        <Text style={{ color: '#cfe8dc', fontSize: 13 }}>Tự trừ trước khi thanh toán VNPay ở đơn tiếp theo.</Text>
      </Card>
      {notice ? <Banner tone="success" icon="checkmark-circle-outline" text={notice} /> : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <H>Rút về ngân hàng</H>
          {!open ? <Button small title="Rút tiền" icon="arrow-up-circle-outline" disabled={data.balance < MIN_WITHDRAW} onPress={() => { setOpen(true); setNotice(''); }} /> : null}
        </View>
        {!open && data.balance < MIN_WITHDRAW ? <Muted>Cần tối thiểu {formatCurrency(MIN_WITHDRAW)} trong ví để rút.</Muted> : null}
        {open ? (
          <View style={{ gap: 10 }}>
            <Field label="Số tiền (VND)" value={f.amount} onChangeText={set('amount')} keyboardType="number-pad" placeholder={`${formatCurrency(MIN_WITHDRAW)} – ${formatCurrency(data.balance)}`} />
            <Pressable onPress={() => setF({ ...f, amount: String(data.balance) })}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Rút toàn bộ</Text></Pressable>
            <Field label="Ngân hàng" value={f.bankName} onChangeText={set('bankName')} placeholder="Vietcombank" maxLength={100} />
            <Field label="Số tài khoản" value={f.accountNumber} onChangeText={set('accountNumber')} keyboardType="number-pad" placeholder="0123456789" maxLength={24} />
            <Field label="Tên chủ tài khoản" value={f.accountName} onChangeText={set('accountName')} autoCapitalize="characters" placeholder="NGUYEN VAN A" maxLength={100} />
            {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Gửi yêu cầu" loading={busy} onPress={submit} style={{ flex: 1 }} />
              <Button title="Hủy" variant="ghost" disabled={busy} onPress={() => { setOpen(false); setError(''); }} />
            </View>
          </View>) : null}
        {(wd.data || []).map((x) => (
          <View key={x._id} style={{ gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T style={{ fontWeight: '700', flex: 1 }}>{x.bankName} {x.accountNumber}</T>
              <T style={{ fontWeight: '800', color: x.status === 'rejected' ? colors.outline : colors.text, textDecorationLine: x.status === 'rejected' ? 'line-through' : 'none' }}>{formatCurrency(x.amount)}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={W_STATUS[x.status]?.[0] || x.status} tone={W_STATUS[x.status]?.[1]} />
              <Muted>{formatDateTime(x.createdAt)}</Muted>
            </View>
            {x.reference ? <Muted>Mã chuyển khoản: {x.reference}</Muted> : null}
            {x.note ? <Muted>Lý do: {x.note}</Muted> : null}
          </View>))}
      </Card>

      <Card>
        <H>Lịch sử ví</H>
        {!data.items.length ? <Muted>Chưa có giao dịch. Tiền hoàn từ đơn hủy và tiền ví đã dùng sẽ hiện ở đây.</Muted> : data.items.map((e, i) => (
          <View key={e.key || i}>
            {i > 0 ? <Divider /> : null}
            <Pressable disabled={!e.orderId} onPress={() => navigation.navigate('OrderDetail', { id: e.orderId })} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 }}>
              <Icon name={e.amount > 0 ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={24} color={e.amount > 0 ? colors.secondary : colors.textVariant} />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '600' }} numberOfLines={2}>{walletText(e.description)}</T>
                <Muted>{formatDateTime(e.createdAt)}{e.orderCode ? ` · #${e.orderCode}` : ''}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T style={{ fontWeight: '800', color: e.amount > 0 ? colors.secondary : colors.text }}>{e.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(e.amount))}</T>
                <Muted style={{ fontSize: 11 }}>Số dư {formatCurrency(e.balanceAfter)}</Muted>
              </View>
            </Pressable>
          </View>))}
      </Card>
      <Muted>Đơn bị hủy (do bạn hoặc do cửa hàng) được hoàn tiền vào ví. Nếu cửa hàng hủy vì lỗi phía cửa hàng, bạn còn nhận thêm voucher xin lỗi.</Muted>
    </Screen>
  );
}

// Thông báo trong app (đơn hàng, khuyến mãi, voucher…) cho mọi vai trò
export function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const d = useLoad(async () => (await A.notifications.list({ limit: 50 })).data, [user?.id], { reloadOnFocus: true });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const open = async (n) => {
    if (!n.readAt) { try { await A.notifications.read(n._id); } catch { /* bỏ qua */ } d.refresh(); }
    const m = /\/orders\/([a-f0-9]{24})/.exec(n.link || '');
    if (m) navigation.navigate(user?.role === 'customer' ? 'OrderDetail' : user?.role === 'staff' ? 'StaffOrderDetail' : 'AdminOrderDetail', { id: m[1] });
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <FlatList data={d.data.items} keyExtractor={(n) => n._id} contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshing={d.refreshing} onRefresh={d.refresh}
        ListHeaderComponent={d.data.unreadCount > 0 ? (
          <Pressable onPress={async () => { try { await A.notifications.readAll(); } catch { /* bỏ qua */ } d.refresh(); }} style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Đánh dấu đã đọc tất cả ({d.data.unreadCount})</Text>
          </Pressable>) : null}
        renderItem={({ item: n }) => (
          <Card onPress={() => open(n)} style={[{ gap: 4 }, !n.readAt && { borderColor: colors.primaryFixedDim, backgroundColor: '#f6f8ff' }]}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {!n.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
              <T style={{ fontWeight: n.readAt ? '600' : '800', flex: 1 }}>{n.title}</T>
            </View>
            <Muted>{n.message}</Muted>
            <Muted style={{ fontSize: 11 }}>{formatDateTime(n.publishedAt)}</Muted>
          </Card>)}
        ListEmptyComponent={<Empty icon="notifications-outline" title="Chưa có thông báo" text="Cập nhật đơn hàng và ưu đãi sẽ hiện ở đây." />} />
    </SafeAreaView>
  );
}

