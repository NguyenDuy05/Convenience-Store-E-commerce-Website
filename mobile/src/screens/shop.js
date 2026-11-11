import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { Badge, Banner, Button, Card, Divider, Empty, ErrorView, Field, H, Icon, Loading, Muted, ProductCard, Row, Screen, SectionTitle, Stepper, T, Text, Thumb, Toast } from '../components/ui';
import { colors, radius, shadow, shadowLg } from '../theme';
import { useQuickAdd } from '../components/cartActions';
import { errMsg, formatCurrency, formatDateTime, newIdempotencyKey } from '../utils/format';
import { CHECKOUT_METHODS } from '../utils/orderMeta';

const ISSUE_TEXT = {
  unavailable: () => 'Sản phẩm không còn bán, vui lòng xóa khỏi giỏ',
  out_of_stock: () => 'Sản phẩm đã hết hàng',
  insufficient_stock: (n) => `Chỉ còn ${n} sản phẩm, vui lòng giảm số lượng`,
};

export function CartScreen({ navigation }) {
  const { user, setCartCount } = useAuth();
  const [busyId, setBusyId] = useState('');
  const [rowError, setRowError] = useState({});
  const quick = useQuickAdd();
  const d = useLoad(async () => {
    if (!user) return null;
    const [cart, prods, store, vouchers] = await Promise.all([
      A.cart.get().then((r) => r.data), A.products.list({ limit: 40 }).then((r) => r.data.items || []).catch(() => []),
      A.stores.list().then((r) => r.data?.[0] || null).catch(() => null), A.discountCodes.available().then((r) => r.data.items || []).catch(() => []),
    ]);
    setCartCount(cart.itemCount || 0);
    return { cart, prods, store, vouchers };
  }, [user?.id], { reloadOnFocus: true });
  useEffect(() => { if (quick.toast?.ok) d.refresh(); }, [quick.toast]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <NeedLogin title="Đăng nhập để xem giỏ hàng" text="Giỏ hàng được lưu theo tài khoản của bạn." />;
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const { cart, prods, store, vouchers } = d.data;
  const act = async (id, fn) => {
    if (busyId) return;
    setBusyId(id); setRowError((e) => ({ ...e, [id]: '' }));
    try { await fn(); await d.refresh(); } catch (e) { setRowError((r) => ({ ...r, [id]: errMsg(e, 'Không cập nhật được.') })); } finally { setBusyId(''); }
  };
  const clearAll = () => Alert.alert('Xóa giỏ hàng', 'Bỏ tất cả sản phẩm khỏi giỏ?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa tất cả', style: 'destructive', onPress: () => act('all', async () => { for (const it of cart.items) await A.cart.remove(String(it.productId)); }) }]);

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Empty icon="cart" title="Giỏ hàng đang trống" text="Chọn vài món bạn thích rồi quay lại đây để đặt hàng." action={<Button title="Khám phá sản phẩm" icon="storefront-outline" onPress={() => navigation.navigate('Products', {})} />} />
      </SafeAreaView>
    );
  }
  const inCart = new Set(cart.items.map((i) => String(i.productId)));
  const suggest = prods.filter((p) => !inCart.has(String(p._id)) && p.stockQuantity > 0 && p.images?.length).slice(0, 8);
  const blocked = cart.issues.length > 0;
  const qty = cart.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen onRefresh={d.refresh} refreshing={d.refreshing} edges={[]}
        footer={
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadowLg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textVariant, letterSpacing: 1 }}>TẠM TÍNH</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{formatCurrency(cart.subtotal)}</Text>
            </View>
            <Button title={`Đặt hàng (${qty})`} icon="arrow-forward" disabled={blocked} onPress={() => navigation.navigate('Checkout')} style={{ paddingHorizontal: 22 }} />
          </View>}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Giỏ hàng của bạn</Text>
          <View style={{ backgroundColor: colors.surfaceContainer, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{qty} món</Text></View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={clearAll} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="trash-outline" size={16} color={colors.textVariant} /><Text style={{ color: colors.textVariant, fontSize: 13 }}>Xóa tất cả</Text></Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.secondaryContainer, borderRadius: radius.lg, padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' }}><Icon name="storefront" size={20} color={colors.secondary} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: colors.onSecondaryContainer }}>Nhận tại cửa hàng</Text>
              {store ? <View style={{ backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }} numberOfLines={1}>{store.name}</Text></View> : null}
            </View>
            <Text style={{ fontSize: 12, color: colors.onSecondaryContainer }}>Đơn được chuẩn bị sẵn tại quầy. Đến nơi, bạn chỉ cần đọc mã đơn.</Text>
          </View>
        </View>

        <SectionTitle title="Món đã chọn" dot={false} />
        {cart.items.map((it) => {
          const id = String(it.productId);
          const busy = busyId === id || busyId === 'all';
          const issue = it.issue ? (ISSUE_TEXT[it.issue] || (() => ''))(it.stockQuantity) : '';
          return (
            <View key={id} style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, gap: 8, borderWidth: 1, borderColor: it.issue ? colors.error : colors.border, ...shadow }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable disabled={it.issue === 'unavailable'} onPress={() => navigation.navigate('ProductDetail', { id })}><Thumb uri={it.image} size={84} /></Pressable>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: colors.text }} numberOfLines={2}>{it.name}</Text>
                    <Pressable disabled={busy} onPress={() => act(id, () => A.cart.remove(id))} hitSlop={10}><Icon name="close" size={20} color={colors.textVariant} /></Pressable>
                  </View>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surfaceLow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm }}><Text style={{ fontSize: 12, color: colors.textVariant }}>{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''}</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <Text style={{ fontWeight: '900', fontSize: 17, color: colors.primary }}>{formatCurrency(it.lineTotal)}</Text>
                    {it.issue !== 'unavailable' && <Stepper value={it.quantity} max={Math.max(Math.min(it.stockQuantity, 99), 1)} disabled={busy} onChange={(v) => act(id, () => A.cart.update(id, { quantity: v }))} />}
                  </View>
                </View>
              </View>
              {issue ? <Text style={{ color: colors.error, fontSize: 13 }}>⚠ {issue}</Text> : null}
              {rowError[id] ? <Text style={{ color: colors.error, fontSize: 13 }}>{rowError[id]}</Text> : null}
            </View>
          );
        })}

        {suggest.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionTitle icon="sparkles-outline" title="Gợi ý mua kèm" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {suggest.map((p) => (
                <View key={p._id} style={{ width: 150 }}>
                  <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { id: p._id })} onAdd={() => quick.add(p)} adding={quick.busyId === p._id} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable onPress={() => navigation.navigate('Deals')} style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="ticket-outline" size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontWeight: '800', fontSize: 16, color: colors.text }}>Voucher ưu đãi Quick</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Xem kho ›</Text>
          </View>
          <Muted>{vouchers.length ? `Bạn có ${vouchers.length} voucher dùng được. Chọn mã và dùng điểm ở bước đặt hàng.` : 'Nhập mã giảm giá hoặc dùng điểm thành viên ở bước đặt hàng.'}</Muted>
        </Pressable>

        <View style={{ backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: colors.text }}>Tóm tắt</Text>
          <Row label={`Tạm tính (${qty} món)`} value={formatCurrency(cart.subtotal)} />
          <Row label="Phí nhận tại quầy" value="0₫" valueStyle={{ color: colors.secondary, fontWeight: '700' }} />
          <Divider />
          {blocked ? <Text style={{ color: colors.error, fontSize: 13 }}>Vui lòng xử lý các sản phẩm có cảnh báo trước khi đặt hàng.</Text>
            : <Muted style={{ fontSize: 12 }}>Khuyến mãi, voucher và điểm thưởng được trừ ở bước đặt hàng.</Muted>}
        </View>
      </Screen>
      <Toast toast={quick.toast} />
    </SafeAreaView>
  );
}

// Mở trang thanh toán (VNPay / cổng giả lập) bằng trình duyệt, xong thì sang màn hình kết quả để kiểm tra trạng thái đơn.
async function payOnline(navigation, orderId, method) {
  const res = await A.payments.online({ orderId, method });
  await WebBrowser.openBrowserAsync(res.data.paymentUrl);
  navigation.replace('PaymentResult', { orderId });
}

export function CheckoutScreen({ navigation }) {
  const { setCartCount } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const method = 'vnpay';
  const [note, setNote] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [voucherOpen, setVoucherOpen] = useState(false);
  const vouchers = useLoad(() => A.discountCodes.available().then((r) => r.data.items || []).catch(() => []), []);
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const keyRef = useRef(newIdempotencyKey());

  const loadPreview = useCallback((code) => {
    setLoading(true); setLoadError('');
    A.orders.preview({ discountCode: code || undefined }).then((r) => setSummary(r.data))
      .catch((e) => setLoadError(errMsg(e, 'Không tải được thông tin đơn hàng.'))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadPreview(''); }, [loadPreview]);

  const applyCode = (value) => { const c = String(value ?? codeInput).trim().toUpperCase(); if (!c) return; setCodeInput(c); setAppliedCode(c); setNotice(''); setSubmitError(''); keyRef.current = newIdempotencyKey(); loadPreview(c); };
  const clearCode = () => { setCodeInput(''); setAppliedCode(''); keyRef.current = newIdempotencyKey(); loadPreview(''); };

  const submit = async () => {
    if (submittingRef.current || !summary?.canCheckout) return;
    const walletUse = Math.min(summary.walletBalance || 0, summary.totalAmount);
    submittingRef.current = true; setSubmitting(true); setSubmitError(''); setNotice('');
    let order;
    try {
      const res = await A.orders.create({
        paymentMethod: method, discountCode: appliedCode || undefined, customerNote: note.trim() || undefined,
        expectedTotal: summary.totalAmount, expectedWalletAmount: walletUse,
      }, keyRef.current);
      order = res.data.order;
    } catch (err) {
      const status = err.response?.status; const data = err.response?.data || {};
      if (!err.response || status >= 500) setSubmitError('Chưa nhận được phản hồi từ hệ thống. Bạn có thể bấm "Đặt hàng" lại, hệ thống sẽ không tạo đơn trùng.');
      else {
        keyRef.current = newIdempotencyKey();
        if (data.code === 'PRICE_CHANGED' && data.summary) { setSummary(data.summary); setNotice(data.message); }
        else if (data.code === 'CART_ISSUES' || data.code === 'INSUFFICIENT_STOCK') { if (data.summary) setSummary(data.summary); else loadPreview(appliedCode); setNotice(data.message); }
        else if (data.code === 'STORE_CLOSED') { setSubmitError(data.message); loadPreview(appliedCode); }
        else if (data.code === 'INVALID_DISCOUNT_CODE') { setAppliedCode(''); setNotice(data.message); loadPreview(''); }
        else if (data.code === 'WALLET_BALANCE_CHANGED') { setNotice(data.message); loadPreview(appliedCode); }
        else setSubmitError(data.message || 'Không đặt được hàng. Vui lòng thử lại.');
      }
      submittingRef.current = false; setSubmitting(false);
      return;
    }
    setCartCount(0);
    // Ví trả đủ: đơn được xác nhận ngay, không cần sang VNPay
    if (!order.payableAmount) { navigation.replace('PaymentResult', { orderId: order._id }); return; }
    try { await payOnline(navigation, order._id, method); }
    catch (err) { navigation.replace('PayOrder', { id: order._id, error: errMsg(err, 'Chưa kết nối được cổng thanh toán. Bạn có thể thử lại.') }); }
  };

  if (loading && !summary) return <Loading text="Đang tính đơn hàng…" />;
  if (loadError) return <ErrorView message={loadError} onRetry={() => loadPreview(appliedCode)} />;
  if (!summary || summary.items.length === 0) return <SafeAreaView style={{ flex: 1 }}><Empty icon="cart" title="Giỏ hàng đang trống" action={<Button title="Xem sản phẩm" onPress={() => navigation.popTo('Tabs', { screen: 'Products' })} />} /></SafeAreaView>;

  const store = summary.store;
  const walletUse = Math.min(summary.walletBalance || 0, summary.totalAmount);
  const toPay = summary.totalAmount - walletUse;
  const online = toPay > 0;
  return (
    <Screen footer={
      <View style={{ backgroundColor: '#fff', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.surfaceContainer }}>
        <Row label={online ? 'Thanh toán qua VNPay' : 'Trả bằng ví QUICK'} value={formatCurrency(online ? toPay : walletUse)} bold valueStyle={{ color: colors.primary }} />
        {submitError ? <Text style={{ color: colors.error, fontSize: 13 }}>{submitError}</Text> : null}
        <Button title={online ? 'Đặt hàng và thanh toán' : 'Đặt hàng (trả bằng ví)'} icon="arrow-forward" loading={submitting} disabled={loading || !summary.canCheckout} onPress={submit} />
      </View>}>
      {notice ? <Banner tone="warn" icon="warning-outline" title={notice} text="Thông tin bên dưới là giá và tồn kho mới nhất. Vui lòng xem lại rồi bấm Đặt hàng nếu đồng ý." /> : null}
      {summary.storeClosed ? <Banner tone="error" icon="storefront-outline" title="Cửa hàng đang tạm đóng cửa" text="Hiện chưa nhận đơn mới. Giỏ hàng của bạn vẫn được giữ." /> : null}
      {summary.issues.length > 0 ? (
        <Banner tone="error" icon="alert-circle-outline" title="Một số sản phẩm không thể đặt:">
          {summary.issues.map((i) => <Text key={`${i.productId}-${i.type}`} style={{ color: colors.errText, fontSize: 13 }}>• {i.name}: {i.type === 'unavailable' ? 'không còn bán' : i.available > 0 ? `chỉ còn ${i.available}` : 'đã hết hàng'}</Text>)}
          <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.errText, fontWeight: '700' }}>Quay lại giỏ hàng để chỉnh sửa</Text></Pressable>
        </Banner>) : null}

      <Card>
        <H>Sản phẩm ({summary.items.reduce((s, i) => s + i.quantity, 0)})</H>
        {summary.items.map((it) => (
          <View key={it.productId} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Thumb uri={it.image} size={46} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }} numberOfLines={2}>{it.name}</T>
              <Muted>{formatCurrency(it.unitPrice)} × {it.quantity}</Muted>
              {it.discountAmount > 0 ? <Text style={{ color: colors.secondary, fontSize: 12 }}>Giảm {formatCurrency(it.discountAmount)}</Text> : null}
            </View>
            <T style={{ fontWeight: '700' }}>{formatCurrency(it.lineTotal)}</T>
          </View>
        ))}
      </Card>

      <Card>
        <H>Nhận hàng tại cửa hàng</H>
        {store ? <View style={{ gap: 4 }}><T style={{ fontWeight: '700' }}>{store.name}</T>{store.address ? <Muted>📍 {store.address}</Muted> : null}{store.phone ? <Muted>📞 {store.phone}</Muted> : null}</View> : <Muted>Cửa hàng sẽ thông báo địa điểm nhận hàng.</Muted>}
        <Muted>Đơn được chuẩn bị sẵn tại quầy. Khi đến nhận, bạn đọc <Text style={{ fontWeight: '800' }}>mã đơn</Text> cho nhân viên.</Muted>
        <Field label="Ghi chú cho cửa hàng (không bắt buộc)" value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Ví dụ: cho mình xin túi giấy" />
      </Card>

      <Card>
        <H>Thanh toán</H>
        {walletUse > 0 ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.okBg }}>
            <Icon name="wallet-outline" size={24} color={colors.okText} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700', color: colors.okText }}>Ví QUICK: trừ {formatCurrency(walletUse)}</T><Muted>Số dư ví ({formatCurrency(summary.walletBalance)}) được dùng trước.</Muted></View>
          </View>) : null}
        {online ? CHECKOUT_METHODS.map((m) => (
          <View key={m.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryFixed }}>
            <Icon name={m.icon} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{m.label}{walletUse > 0 ? `: ${formatCurrency(toPay)}` : ''}</T><Muted>{m.desc}</Muted></View>
            <Icon name="radio-button-on" size={22} color={colors.primary} />
          </View>)) : <Muted>Ví đủ để trả toàn bộ đơn, đơn được xác nhận ngay sau khi đặt.</Muted>}
        {online ? <Muted>Sau khi đặt hàng bạn được chuyển sang cổng VNPay. Hàng được giữ trong 15 phút, quá hạn đơn sẽ tự hủy{walletUse > 0 ? ' và tiền ví được hoàn lại' : ''}.</Muted> : null}
      </Card>

      <Card>
        <H>Mã giảm giá</H>
        {appliedCode && summary.discountCode ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge icon="pricetag" tone="success" label={summary.discountCode.code} /><Pressable onPress={clearCode}><Text style={{ color: colors.error, fontWeight: '700' }}>Bỏ mã</Text></Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}><Field value={codeInput} onChangeText={setCodeInput} autoCapitalize="characters" placeholder="Nhập mã" maxLength={30} onSubmitEditing={() => applyCode()} /></View>
            <Button title="Áp dụng" variant="soft" disabled={!codeInput.trim() || loading} onPress={() => applyCode()} style={{ paddingVertical: 14 }} />
          </View>)}
        {summary.discountError ? <Text style={{ color: colors.error, fontSize: 13 }}>{summary.discountError}</Text> : null}
        {!(appliedCode && summary.discountCode) && (vouchers.data || []).length > 0 ? (
          <Pressable onPress={() => setVoucherOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="ticket-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', flex: 1 }}>Chọn từ kho voucher ({vouchers.data.length})</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>) : null}
      </Card>

      <Card>
        <H>Tổng kết</H>
        <Row label="Tạm tính" value={formatCurrency(summary.subtotal)} />
        {(summary.appliedPromotions || []).map((p) => <Row key={p.promotionId || p.name} label={p.name} value={`-${formatCurrency(p.amount)}`} valueStyle={{ color: colors.secondary }} />)}
        {summary.discountCode ? <Row label={`Mã ${summary.discountCode.code}`} value={`-${formatCurrency(summary.discountCode.amount)}`} valueStyle={{ color: colors.secondary }} /> : null}
        <Divider />
        <Row label="Tổng đơn" value={formatCurrency(summary.totalAmount)} bold />
        {walletUse > 0 ? <Row label="Trừ ví QUICK" value={`-${formatCurrency(walletUse)}`} valueStyle={{ color: colors.secondary }} /> : null}
        {walletUse > 0 ? <Row label="Còn trả qua VNPay" value={formatCurrency(toPay)} bold /> : null}
        {summary.estimatedPoints > 0 ? <Muted>Nhận khoảng {summary.estimatedPoints} điểm thành viên sau khi nhận hàng.</Muted> : null}
      </Card>
      <VoucherSheet visible={voucherOpen} onClose={() => setVoucherOpen(false)} items={vouchers.data || []} amount={summary.subtotal - (summary.promotionDiscount || 0)}
        onPick={(c) => { setVoucherOpen(false); applyCode(c.code); }} />
    </Screen>
  );
}

export const voucherValue = (c) => (c.type === 'percent' ? `Giảm ${c.value}%${c.maxDiscount ? `, tối đa ${formatCurrency(c.maxDiscount)}` : ''}` : `Giảm ${formatCurrency(c.value)}`);

export function VoucherTicket({ c, disabledReason, onPress, action = 'Dùng' }) {
  return (
    <Pressable disabled={!!disabledReason || !onPress} onPress={onPress} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceHigh, opacity: disabledReason ? 0.55 : 1 }}>
      <View style={{ width: 84, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 }}>
        <Icon name="ticket" size={26} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{c.type === 'percent' ? `${c.value}%` : `${Math.round(c.value / 1000)}K`}</Text>
      </View>
      <View style={{ flex: 1, padding: 12, gap: 2 }}>
        <Text style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>{c.code}</Text>
        <Text style={{ color: colors.text, fontSize: 13 }}>{voucherValue(c)}</Text>
        {c.personal ? <Muted numberOfLines={2}>Voucher tặng riêng cho bạn</Muted> : c.description ? <Muted numberOfLines={2}>{c.description}</Muted> : null}
        <Muted>{c.minOrderAmount ? `Đơn từ ${formatCurrency(c.minOrderAmount)} · ` : ''}HSD {formatDateTime(c.endDate).slice(0, 10)}{c.remainingUses > 1 ? ` · còn ${c.remainingUses} lượt` : ''}</Muted>
        {disabledReason ? <Text style={{ color: colors.error, fontSize: 12 }}>{disabledReason}</Text> : null}
      </View>
      {onPress && !disabledReason ? <View style={{ justifyContent: 'center', paddingRight: 12 }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{action}</Text></View> : null}
    </Pressable>
  );
}

function VoucherSheet({ visible, onClose, items, amount, onPick }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,24,66,.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surfaceLow, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '75%', padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H>Kho voucher</H>
          <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={24} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
          {items.map((c) => (
            <VoucherTicket key={c._id} c={c} onPress={() => onPick(c)}
              disabledReason={amount < (c.minOrderAmount || 0) ? `Mua thêm ${formatCurrency(c.minOrderAmount - amount)} để dùng mã này` : ''} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function PayOrderScreen({ navigation, route }) {
  const { id } = route.params;
  const method = 'vnpay';
  const [payError, setPayError] = useState(route.params?.error || '');
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const d = useLoad(async () => (await A.orders.get(id)).data, [id]);
  const order = d.data;
  useEffect(() => {
    if (!order?.expiresAt) return undefined;
    const t = setInterval(() => { setNow(Date.now()); if (Date.now() >= new Date(order.expiresAt).getTime()) { clearInterval(t); d.reload(); } }, 1000);
    return () => clearInterval(t);
  }, [order?.expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (d.loading && !order) return <Loading />;
  if (d.error && !order) return <ErrorView message={d.error} onRetry={d.reload} />;
  const payable = order.status === 'pending_payment' && order.paymentStatus !== 'paid';
  const left = order.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : null;
  const mmss = left == null ? '' : `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  const pay = async () => {
    setPaying(true); setPayError('');
    try { await payOnline(navigation, order._id, method); }
    catch (err) { const data = err.response?.data || {}; setPayError(data.message || errMsg(err, 'Không kết nối được cổng thanh toán. Chưa có khoản tiền nào bị trừ.')); if (data.code === 'ORDER_EXPIRED' || data.code === 'NOT_PAYABLE') d.reload(); setPaying(false); }
  };
  return (
    <Screen>
      <Card>
        <Muted>Mã đơn</Muted><Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{order.orderCode}</Text>
        {order.walletAmount > 0 ? <Row label="Đã trừ ví QUICK" value={formatCurrency(order.walletAmount)} /> : null}
        <Row label="Cần thanh toán qua VNPay" value={formatCurrency(order.payableAmount ?? order.totalAmount)} bold />
        {payable && left != null ? <Banner tone={left < 120000 ? 'error' : 'warn'} icon="timer-outline" title={`Hàng được giữ trong ${mmss}`} text="Quá hạn đơn sẽ tự hủy và hoàn lại kho." /> : null}
      </Card>
      {!payable ? (
        <Banner tone={order.status === 'failed' ? 'error' : 'info'} icon="information-circle-outline" title="Đơn này không còn chờ thanh toán" text={order.status === 'failed' ? 'Đơn đã hết hạn hoặc thanh toán không thành công. Bạn có thể đặt lại từ giỏ hàng.' : 'Bạn không cần thanh toán thêm.'}>
          <Pressable onPress={() => navigation.replace('OrderDetail', { id })}><Text style={{ fontWeight: '700', color: colors.infoText }}>Xem chi tiết đơn</Text></Pressable>
        </Banner>
      ) : (
        <Card>
          <H>Thanh toán qua VNPay</H>
          <Muted>Bấm Thanh toán để mở cổng VNPay. Xong, quay lại app để xem kết quả.</Muted>
          {payError ? <Text style={{ color: colors.error, fontSize: 13 }}>{payError}</Text> : null}
          <Button title="Thanh toán" icon="lock-closed-outline" loading={paying} onPress={pay} />
        </Card>)}
    </Screen>
  );
}

const RESULT = {
  paid: { tone: 'success', icon: 'checkmark-circle', title: 'Thanh toán thành công', text: 'Cửa hàng đã nhận đơn và sẽ chuẩn bị ngay. Khi đơn sẵn sàng, bạn đến quầy và đọc mã đơn để nhận hàng.' },
  cash: { tone: 'success', icon: 'checkmark-circle', title: 'Đặt hàng thành công', text: 'Đơn đã được ghi nhận. Khi đơn sẵn sàng, đọc mã đơn cho nhân viên tại quầy.' },
  cancelled: { tone: 'error', icon: 'close-circle', title: 'Đơn đã bị hủy', text: 'Nếu đã thanh toán, tiền được hoàn vào ví QUICK của bạn.' },
  waiting: { tone: 'warn', icon: 'hourglass', title: 'Đang chờ xác nhận thanh toán', text: 'Cổng thanh toán chưa báo kết quả. Vui lòng không thanh toán lại để tránh bị trừ tiền hai lần.' },
  declined: { tone: 'error', icon: 'close-circle', title: 'Thanh toán chưa thành công', text: 'Chưa có khoản tiền nào được ghi nhận. Đơn vẫn được giữ hàng đến khi hết hạn, bạn có thể thanh toán lại.' },
  unpaid: { tone: 'warn', icon: 'card', title: 'Đơn chưa được thanh toán', text: 'Bạn chưa hoàn tất thanh toán. Đơn vẫn được giữ hàng đến khi hết hạn.' },
  expired: { tone: 'error', icon: 'timer', title: 'Đơn đã hết hạn thanh toán', text: 'Hàng đã được trả lại kho. Bạn có thể đặt lại từ giỏ hàng.' },
  late: { tone: 'warn', icon: 'help-buoy', title: 'Đã nhận thanh toán nhưng đơn đã hết hạn', text: 'Cửa hàng sẽ liên hệ để xử lý hoặc hoàn tiền cho bạn. Vui lòng lưu mã đơn.' },
};
function resolve(order) {
  const last = order.latestPayment;
  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'failed') return last?.status === 'success' ? 'late' : 'expired';
  if (order.status === 'pending_payment') {
    if (last?.status === 'pending') return 'waiting';
    if (order.paymentStatus === 'failed' || last?.status === 'failed') return 'declined';
    return 'unpaid';
  }
  return order.paymentStatus === 'paid' ? 'paid' : 'cash';
}

export function PaymentResultScreen({ navigation, route }) {
  const { orderId } = route.params;
  const [tick, setTick] = useState(0);
  const [polls, setPolls] = useState(0);
  const d = useLoad(() => A.orders.get(orderId).then((r) => r.data), [orderId, tick]);
  const order = d.data;
  const state = order ? resolve(order) : null;
  useEffect(() => {
    if (state !== 'waiting' || polls >= 10) return undefined;
    const t = setTimeout(() => { setPolls((p) => p + 1); setTick((k) => k + 1); }, 3000);
    return () => clearTimeout(t);
  }, [state, polls, tick]);
  if (d.loading && !order) return <Loading text="Đang kiểm tra kết quả…" />;
  if (d.error && !order) return <ErrorView message={d.error} onRetry={d.reload} />;
  const v = RESULT[state];
  const tone = { success: colors.secondary, warn: colors.tertiary, error: colors.error }[v.tone];
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Icon name={v.icon} size={64} color={tone} />
        <H style={{ fontSize: 20, textAlign: 'center' }}>{v.title}</H>
        <Muted style={{ textAlign: 'center' }}>{v.text}</Muted>
        {state === 'waiting' ? <Muted>{polls >= 10 ? 'Chưa có kết quả. Kết quả sẽ tự cập nhật trong mục Đơn hàng, bạn không cần thanh toán lại.' : 'Đang kiểm tra…'}</Muted> : null}
      </Card>
      <Card>
        <Row label="Mã đơn" value={order.orderCode} valueStyle={{ fontWeight: '900', color: colors.primary }} />
        <Row label="Tổng tiền" value={formatCurrency(order.totalAmount)} />
        <Row label="Đặt lúc" value={formatDateTime(order.createdAt)} />
        {order.store?.name ? <Row label="Nhận hàng tại" value={`${order.store.name}${order.store.address ? `, ${order.store.address}` : ''}`} /> : null}
      </Card>
      <View style={{ gap: 10 }}>
        {(state === 'declined' || state === 'unpaid') && <Button title="Thanh toán lại" icon="card-outline" onPress={() => navigation.replace('PayOrder', { id: order._id })} />}
        {(state === 'paid' || state === 'cash') && <Button title="Theo dõi đơn" icon="navigate-outline" onPress={() => navigation.replace('OrderTracking', { id: order._id })} />}
        <Button title="Xem chi tiết đơn" variant="ghost" onPress={() => navigation.replace('OrderDetail', { id: order._id })} />
        {(state === 'waiting') && <Button title="Kiểm tra lại" variant="soft" icon="refresh" onPress={() => { setPolls(0); setTick((k) => k + 1); }} />}
        <Button title="Tiếp tục mua sắm" variant="ghost" onPress={() => navigation.popTo('Tabs', { screen: 'Products' })} />
      </View>
    </Screen>
  );
}
