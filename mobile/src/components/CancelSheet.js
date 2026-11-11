import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { Banner, Button, Field, H, Icon, Muted, T, Text } from './ui';
import { colors, radius } from '../theme';
import { errMsg, formatCurrency } from '../utils/format';

// Lý do hủy có sẵn (gửi lên server bằng tiếng Anh như web để báo cáo thống nhất), hiển thị tiếng Việt
export const CANCEL_REASONS = {
  customer: [
    ['I changed my mind', 'Tôi đổi ý, không muốn mua nữa'],
    ['I ordered the wrong items or quantity', 'Tôi đặt nhầm sản phẩm hoặc số lượng'],
    ['I want to use a different payment method', 'Tôi muốn dùng phương thức thanh toán khác'],
    ['I cannot come to the store to pick it up', 'Tôi không thể đến cửa hàng nhận hàng'],
    ['The pickup time is too long', 'Thời gian chờ nhận hàng quá lâu'],
    ['I found a better price elsewhere', 'Tôi tìm được nơi bán rẻ hơn'],
  ],
  customerSide: [
    ['Customer requested the cancellation', 'Khách yêu cầu hủy'],
    ['Customer did not pick up in time', 'Khách không đến nhận đúng hạn'],
    ['Customer ordered the wrong items', 'Khách đặt nhầm sản phẩm'],
    ['Suspected fake or duplicate order', 'Nghi đơn ảo hoặc đơn trùng'],
  ],
  store: [
    ['Item out of stock or damaged', 'Hết hàng hoặc hàng bị hỏng'],
    ['Store cannot prepare the order (closed / understaffed)', 'Cửa hàng không chuẩn bị được (đóng cửa / thiếu người)'],
    ['Payment or system problem', 'Lỗi thanh toán hoặc hệ thống'],
    ['Wrong price or product information', 'Sai giá hoặc sai thông tin sản phẩm'],
  ],
};
const OTHER = '__other__';
const VI = Object.fromEntries(Object.values(CANCEL_REASONS).flat());
// Lý do hủy hiển thị tiếng Việt (lý do tự nhập giữ nguyên)
export const reasonVi = (r) => VI[r] || r || '—';

// Một lựa chọn dạng radio
const Option = ({ on, title, sub, icon, onPress, disabled }) => (
  <Pressable disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.primary : colors.outlineVariant, backgroundColor: on ? colors.primaryFixed : '#fff' }}>
    {icon ? <Icon name={icon} size={20} color={colors.primary} /> : null}
    <View style={{ flex: 1 }}><T style={{ fontWeight: on ? '700' : '500' }}>{title}</T>{sub ? <Muted>{sub}</Muted> : null}</View>
    <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
  </Pressable>
);

// Hộp hủy đơn. mode="customer": chỉ chọn lý do. mode="staff": chọn bên có lỗi → lý do; lỗi cửa hàng có thể tặng voucher.
export default function CancelSheet({ visible, onClose, order, mode = 'customer', onSubmit }) {
  const [fault, setFault] = useState(mode === 'customer' ? 'customer' : '');
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const [compensate, setCompensate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (visible) { setFault(mode === 'customer' ? 'customer' : ''); setChoice(''); setOther(''); setCompensate(true); setError(''); } }, [visible, mode]);

  const list = mode === 'customer' ? CANCEL_REASONS.customer : fault === 'store' ? CANCEL_REASONS.store : fault === 'customer' ? CANCEL_REASONS.customerSide : [];
  const reason = choice === OTHER ? other.trim() : choice;
  const paid = order?.paymentStatus === 'paid';
  const submit = async () => {
    if (!fault) return setError('Chọn bên gây ra việc hủy đơn.');
    if (reason.length < 3) return setError(choice === OTHER ? 'Nhập lý do (ít nhất 3 ký tự).' : 'Chọn lý do hủy.');
    setBusy(true); setError('');
    try {
      await onSubmit(mode === 'customer' ? { reason } : { reason, fault, compensate: fault === 'store' && compensate });
      onClose(true);
    } catch (e) { setError(errMsg(e, 'Không hủy được đơn. Vui lòng thử lại.')); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !busy && onClose(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,24,66,.45)' }} onPress={() => !busy && onClose(false)} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <H>Hủy đơn {order?.orderCode}</H>
              <Pressable onPress={() => !busy && onClose(false)} hitSlop={10}><Icon name="close" size={24} /></Pressable>
            </View>
            <Muted>Sản phẩm trong đơn sẽ được trả lại kho.{paid ? ` Số tiền đã thanh toán (${formatCurrency(order.totalAmount)}) được hoàn vào ví ${mode === 'customer' ? 'của bạn' : 'của khách'}.` : ''}</Muted>
            {mode === 'staff' ? (
              <View style={{ gap: 8 }}>
                <T style={{ fontWeight: '700' }}>Ai gây ra việc hủy đơn? <Text style={{ color: colors.error }}>*</Text></T>
                <Option on={fault === 'customer'} icon="person-outline" title="Do khách hàng" sub="Khách yêu cầu, không đến nhận, đặt nhầm…" disabled={busy} onPress={() => { setFault('customer'); setChoice(''); }} />
                <Option on={fault === 'store'} icon="storefront-outline" title="Do cửa hàng" sub="Hết hàng, không chuẩn bị được, lỗi hệ thống…" disabled={busy} onPress={() => { setFault('store'); setChoice(''); }} />
              </View>) : null}
            {list.length ? (
              <View style={{ gap: 8 }}>
                <T style={{ fontWeight: '700' }}>Lý do <Text style={{ color: colors.error }}>*</Text></T>
                {list.map(([value, label]) => <Option key={value} on={choice === value} title={label} disabled={busy} onPress={() => setChoice(value)} />)}
                <Option on={choice === OTHER} title="Lý do khác" disabled={busy} onPress={() => setChoice(OTHER)} />
                {choice === OTHER ? <Field value={other} onChangeText={setOther} multiline maxLength={500} placeholder="Nhập lý do (ít nhất 3 ký tự)" autoFocus /> : null}
              </View>) : null}
            {mode === 'staff' && fault === 'store' && (order?.customer || order?.customerId) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.warnBg }}>
                <Icon name="gift-outline" size={22} color={colors.warnText} />
                <Text style={{ flex: 1, color: colors.warnText, fontWeight: '600', fontSize: 13 }}>Tặng voucher xin lỗi: giảm 10% đơn sau, tối đa {formatCurrency(10000)} (1 lần, hạn 30 ngày)</Text>
                <Switch value={compensate} onValueChange={setCompensate} disabled={busy} />
              </View>) : null}
            {error ? <Banner tone="error" icon="alert-circle-outline" text={error} /> : null}
            <Button title="Xác nhận hủy đơn" variant="danger" icon="close-circle-outline" loading={busy} disabled={!fault || reason.length < 3} onPress={submit} />
            <Button title="Giữ đơn" variant="ghost" disabled={busy} onPress={() => onClose(false)} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
