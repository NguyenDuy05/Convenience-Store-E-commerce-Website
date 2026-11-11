import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as A from '../api';
import { useAuth } from '../context/AuthContext';
import NeedLogin from '../components/NeedLogin';
import { useLoad } from '../components/hooks';
import { Badge, Banner, Button, Card, Chip, Divider, Empty, ErrorView, Field, H, Icon, Loading, Muted, Screen, T, Text } from '../components/ui';
import { colors, radius } from '../theme';
import { errMsg, formatDate, formatDateTime, formatNumber } from '../utils/format';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;

const Avatar = ({ uri, name, size = 72 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {uri ? <Image source={{ uri }} style={{ width: size, height: size }} /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: size / 2.6 }}>{(name || '?').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()}</Text>}
  </View>
);

export function AccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const m = useLoad(async () => (user ? (await A.membership.me().catch(() => ({ data: null }))).data : null), [user?.id], { reloadOnFocus: true });
  const p = useLoad(async () => (user ? (await A.profile.get()).data : null), [user?.id], { reloadOnFocus: true });
  if (!user) return <NeedLogin title="Tài khoản của bạn" text="Đăng nhập để quản lý hồ sơ, địa chỉ, điểm thành viên và đơn hàng." />;
  const links = [
    ['person-outline', 'Hồ sơ cá nhân', 'Profile'], ['receipt-outline', 'Đơn hàng của tôi', 'Orders'], ['wallet-outline', 'Ví QUICK & rút tiền', 'Wallet'], ['notifications-outline', 'Thông báo', 'Notifications'], ['location-outline', 'Địa chỉ', 'Addresses'],
    ['qr-code-outline', 'Thẻ thành viên (mã QR)', 'MemberCard'], ['ribbon-outline', 'Thành viên & điểm thưởng', 'Membership'], ['ticket-outline', 'Kho voucher', 'Vouchers'], ['heart-outline', 'Yêu thích & đã xem', 'Favorites'], ['storefront-outline', 'Thông tin cửa hàng', 'StoreInfo'], ['star-outline', 'Đánh giá của tôi', 'MyReviews'], ['pricetags-outline', 'Khuyến mãi', 'Promotions'], ['help-buoy-outline', 'Hỗ trợ & khiếu nại', 'Support'],
  ];
  const go = (name) => navigation.navigate(name);
  const confirmLogout = () => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: logout }]);
  const prof = p.data;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen edges={[]} onRefresh={() => { m.refresh(); p.refresh(); }} refreshing={m.refreshing}>
        <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Avatar uri={prof?.avatarUrl} name={user.fullName} />
          <View style={{ flex: 1, gap: 2 }}>
            <H style={{ fontSize: 19 }}>{prof?.fullName || user.fullName}</H>
            <Muted>{user.email}</Muted>
            {m.data?.tier ? <Badge icon="ribbon" tone="warn" label={`Hạng ${m.data.tier.name}`} /> : null}
          </View>
        </Card>
        {m.data ? (
          <Card onPress={() => navigation.navigate('Membership')} style={{ backgroundColor: colors.primary }}>
            <Text style={{ color: '#d8e2ff', fontSize: 12, fontWeight: '700' }}>ĐIỂM THƯỞNG KHẢ DỤNG</Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{formatNumber(m.data.points)} <Text style={{ fontSize: 14, fontWeight: '600' }}>điểm</Text></Text>
            <Text style={{ color: '#d8e2ff', fontSize: 12 }}>{m.data.nextTier ? `Còn ${formatNumber(m.data.pointsToNextTier)} điểm để lên hạng ${m.data.nextTier.name}` : 'Bạn đang ở hạng cao nhất'}</Text>
          </Card>) : null}
        <Card style={{ padding: 4 }}>
          {links.map(([icon, label, to], i) => (
            <View key={to}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => go(to)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }, pressed && { opacity: 0.6 }]}>
                <Icon name={icon} size={22} color={colors.primary} /><T style={{ flex: 1, fontWeight: '600' }}>{label}</T><Icon name="chevron-forward" size={18} color={colors.outline} />
              </Pressable>
            </View>))}
        </Card>
        <Button title="Đăng xuất" icon="log-out-outline" variant="ghost" onPress={confirmLogout} />
      </Screen>
    </SafeAreaView>
  );
}

const toDisplayDob = (iso) => (iso ? formatDate(iso) : '');
function parseDob(text) {
  const t = text.trim();
  if (!t) return { value: null };
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return { error: 'Ngày sinh theo định dạng DD/MM/YYYY' };
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { error: 'Ngày sinh không hợp lệ' };
  if (dt > new Date()) return { error: 'Ngày sinh không được ở tương lai' };
  return { value: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

export function ProfileScreen() {
  const { setUser } = useAuth();
  const d = useLoad(() => A.profile.get().then((r) => r.data), []);
  const [form, setForm] = useState({ fullName: '', phone: '', dob: '', avatarUrl: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => { if (d.data) setForm({ fullName: d.data.fullName || '', phone: d.data.phone || '', dob: toDisplayDob(d.data.dateOfBirth), avatarUrl: d.data.avatarUrl || '' }); }, [d.data]);
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const pick = async (fromCamera) => {
    setMenu(false);
    try {
      const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setMsg({ ok: false, text: 'Bạn chưa cấp quyền truy cập.' }); return; }
      const opts = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 320, height: 320 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      set('avatarUrl')(`data:image/jpeg;base64,${out.base64}`);
      setMsg({ ok: true, text: 'Đã chọn ảnh mới. Nhấn "Lưu thay đổi" để cập nhật.' });
    } catch { setMsg({ ok: false, text: 'Không chọn được ảnh. Vui lòng thử lại.' }); }
  };

  const save = async () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim().replace(/[\s.-]/g, ''))) e.phone = 'Số điện thoại không hợp lệ';
    const dob = parseDob(form.dob);
    if (dob.error) e.dob = dob.error;
    setErrors(e); setMsg(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { data } = await A.profile.update({ fullName: form.fullName.trim(), phone: form.phone.trim(), avatarUrl: form.avatarUrl, dateOfBirth: dob.value });
      setUser((u) => ({ ...u, fullName: data.fullName })); d.reload();
      setMsg({ ok: true, text: 'Đã cập nhật hồ sơ.' });
    } catch (err) { setMsg({ ok: false, text: errMsg(err, 'Không cập nhật được hồ sơ.') }); } finally { setBusy(false); }
  };

  const changePw = async () => {
    if (!pw.currentPassword) { setPwMsg({ ok: false, text: 'Vui lòng nhập mật khẩu hiện tại.' }); return; }
    if (pw.newPassword.length < 8) { setPwMsg({ ok: false, text: 'Mật khẩu mới tối thiểu 8 ký tự.' }); return; }
    if (pw.newPassword !== pw.confirmPassword) { setPwMsg({ ok: false, text: 'Mật khẩu xác nhận không khớp.' }); return; }
    setPwBusy(true); setPwMsg(null);
    try { await A.profile.changePassword(pw); setPw({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPwMsg({ ok: true, text: 'Đã đổi mật khẩu.' }); }
    catch (err) { setPwMsg({ ok: false, text: errMsg(err, 'Không đổi được mật khẩu.') }); } finally { setPwBusy(false); }
  };

  const Opt = ({ icon, label, onPress, danger }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}>
      <Icon name={icon} size={22} color={danger ? colors.error : colors.primary} /><T style={{ fontWeight: '600', color: danger ? colors.error : colors.text }}>{label}</T>
    </Pressable>);

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Pressable onPress={() => setMenu(true)}>
          <Avatar uri={form.avatarUrl} name={form.fullName} size={96} />
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}><Icon name="camera" size={16} color={colors.primaryDark} /></View>
        </Pressable>
        <Muted>Chạm vào ảnh để xem, đổi hoặc xóa</Muted>
        <Muted>Thành viên từ {formatDate(d.data.createdAt)}</Muted>
      </Card>

      <Card>
        <H>Thông tin cá nhân</H>
        {msg ? <Banner tone={msg.ok ? 'success' : 'error'} icon={msg.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={msg.text} /> : null}
        <Field label="Họ và tên" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} maxLength={100} />
        <Field label="Email" value={d.data.email} editable={false} style={{ backgroundColor: colors.surfaceLow, color: colors.outline }} />
        <Field label="Số điện thoại" value={form.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" />
        <Field label="Ngày sinh (DD/MM/YYYY)" value={form.dob} onChangeText={set('dob')} error={errors.dob} placeholder="Ví dụ: 25/12/2000" keyboardType="numbers-and-punctuation" />
        <Button title="Lưu thay đổi" loading={busy} onPress={save} />
      </Card>

      <Card>
        <H>Đổi mật khẩu</H>
        {pwMsg ? <Banner tone={pwMsg.ok ? 'success' : 'error'} icon={pwMsg.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={pwMsg.text} /> : null}
        <Field label="Mật khẩu hiện tại" value={pw.currentPassword} onChangeText={(v) => setPw((x) => ({ ...x, currentPassword: v }))} secureTextEntry />
        <Field label="Mật khẩu mới" value={pw.newPassword} onChangeText={(v) => setPw((x) => ({ ...x, newPassword: v }))} secureTextEntry placeholder="Tối thiểu 8 ký tự" />
        <Field label="Nhập lại mật khẩu mới" value={pw.confirmPassword} onChangeText={(v) => setPw((x) => ({ ...x, confirmPassword: v }))} secureTextEntry />
        <Button title="Đổi mật khẩu" variant="soft" loading={pwBusy} onPress={changePw} />
      </Card>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(12,24,66,.45)', justifyContent: 'flex-end' }} onPress={() => setMenu(false)}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: 24 }}>
            <Opt icon="eye-outline" label="Xem ảnh đại diện" onPress={() => { setMenu(false); setView(true); }} />
            <Opt icon="images-outline" label="Chọn từ thư viện" onPress={() => pick(false)} />
            <Opt icon="camera-outline" label="Chụp ảnh mới" onPress={() => pick(true)} />
            {form.avatarUrl ? <Opt icon="trash-outline" danger label="Xóa ảnh đại diện" onPress={() => { set('avatarUrl')(''); setMenu(false); setMsg({ ok: true, text: 'Đã gỡ ảnh. Nhấn "Lưu thay đổi" để cập nhật.' }); }} /> : null}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={view} transparent animationType="fade" onRequestClose={() => setView(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setView(false)}>
          {form.avatarUrl ? <Image source={{ uri: form.avatarUrl }} style={{ width: '90%', aspectRatio: 1, borderRadius: radius.lg }} /> : <Text style={{ color: '#fff' }}>Bạn chưa có ảnh đại diện</Text>}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const EMPTY = { label: '', receiverName: '', phone: '', addressLine: '', isDefault: false };
export function AddressesScreen() {
  const d = useLoad(() => A.addresses.list().then((r) => r.data), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const open = (a) => { setEditing(a || 'new'); setForm(a ? { label: a.label || '', receiverName: a.receiverName, phone: a.phone, addressLine: a.addressLine, isDefault: !!a.isDefault } : EMPTY); setErrors({}); };
  const save = async () => {
    const e = {};
    if (!form.receiverName.trim()) e.receiverName = 'Vui lòng nhập tên người nhận';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại'; else if (!PHONE_RE.test(form.phone.trim().replace(/[\s.-]/g, ''))) e.phone = 'Số điện thoại không hợp lệ';
    if (!form.addressLine.trim()) e.addressLine = 'Vui lòng nhập địa chỉ';
    setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (editing === 'new') await A.addresses.add(form); else await A.addresses.update(editing._id, form);
      setEditing(null); setMsg({ ok: true, text: 'Đã lưu địa chỉ.' }); d.reload();
    } catch (err) { setErrors({ form: errMsg(err, 'Không lưu được địa chỉ.') }); } finally { setBusy(false); }
  };
  const remove = (a) => Alert.alert('Xóa địa chỉ', `Xóa địa chỉ của ${a.receiverName}?`, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => {
    try { await A.addresses.remove(a._id); setMsg({ ok: true, text: 'Đã xóa địa chỉ.' }); d.reload(); } catch (err) { setMsg({ ok: false, text: errMsg(err) }); } } }]);
  const makeDefault = async (a) => { try { await A.addresses.update(a._id, { ...a, isDefault: true }); setMsg({ ok: true, text: 'Đã đặt làm địa chỉ mặc định.' }); d.reload(); } catch (err) { setMsg({ ok: false, text: errMsg(err) }); } };

  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorView message={d.error} onRetry={d.reload} />;
  const f = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  if (editing) {
    return (
      <Screen>
        <Card>
          <H>{editing === 'new' ? 'Thêm địa chỉ' : 'Sửa địa chỉ'}</H>
          {errors.form ? <Banner tone="error" icon="alert-circle-outline" text={errors.form} /> : null}
          <Field label="Nhãn (không bắt buộc)" value={form.label} onChangeText={f('label')} maxLength={50} placeholder="Nhà, Công ty…" />
          <Field label="Tên người nhận *" value={form.receiverName} onChangeText={f('receiverName')} error={errors.receiverName} maxLength={100} />
          <Field label="Số điện thoại *" value={form.phone} onChangeText={f('phone')} error={errors.phone} keyboardType="phone-pad" />
          <Field label="Địa chỉ *" value={form.addressLine} onChangeText={f('addressLine')} error={errors.addressLine} multiline maxLength={255} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T>Đặt làm địa chỉ mặc định</T><Switch value={form.isDefault} disabled={editing !== 'new' && editing.isDefault} onValueChange={f('isDefault')} /></View>
          <Button title="Lưu" loading={busy} onPress={save} />
          <Button title="Hủy" variant="ghost" disabled={busy} onPress={() => setEditing(null)} />
        </Card>
      </Screen>
    );
  }
  const list = d.data;
  return (
    <Screen onRefresh={d.refresh} refreshing={d.refreshing}>
      <Banner tone="info" icon="information-circle-outline" text="Cửa hàng không giao hàng tận nơi, đơn được nhận tại cửa hàng. Địa chỉ chỉ dùng để lưu thông tin liên hệ của bạn." />
      {msg ? <Banner tone={msg.ok ? 'success' : 'error'} icon={msg.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} text={msg.text} /> : null}
      <Button title="Thêm địa chỉ" icon="add" disabled={list.length >= 10} onPress={() => open(null)} />
      {list.length >= 10 ? <Muted>Bạn đã đạt tối đa 10 địa chỉ.</Muted> : null}
      {list.length === 0 ? <Empty icon="location-outline" title="Chưa có địa chỉ" text="Thêm địa chỉ để lưu thông tin liên hệ." /> : list.map((a) => (
        <Card key={a._id}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T style={{ fontWeight: '800', flex: 1 }}>{a.label || 'Địa chỉ'}</T>{a.isDefault ? <Badge label="Mặc định" tone="success" icon="star" /> : null}</View>
          <T>{a.receiverName}</T><Muted>📞 {a.phone}</Muted><Muted>📍 {a.addressLine}</Muted>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button small title="Sửa" variant="soft" icon="create-outline" onPress={() => open(a)} />
            {!a.isDefault ? <Button small title="Đặt mặc định" variant="ghost" onPress={() => makeDefault(a)} /> : null}
            <Button small title="Xóa" variant="ghost" icon="trash-outline" onPress={() => remove(a)} />
          </View>
        </Card>))}
    </Screen>
  );
}

const TYPES = { earn: 'Nhận điểm', redeem: 'Đổi điểm', adjust: 'Điều chỉnh' };
export function MembershipScreen({ navigation }) {
  const { user } = useAuth();
  const [type, setType] = useState('');
  const m = useLoad(() => A.membership.me().then((r) => r.data), [], { reloadOnFocus: true });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [hLoading, setHLoading] = useState(true);
  const [hError, setHError] = useState('');
  const loadHist = async (p, reset) => {
    setHLoading(true); setHError('');
    try { const { data } = await A.membership.history({ page: p, limit: 10, type: type || undefined }); setItems((c) => (reset ? data.items : [...c, ...data.items])); setPage(p); setPages(data.pages || 1); }
    catch (e) { setHError(errMsg(e)); } finally { setHLoading(false); }
  };
  useEffect(() => { loadHist(1, true); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  if (m.loading && !m.data) return <Loading />;
  if (m.error && !m.data) return <ErrorView message={m.error} onRetry={m.reload} />;
  const mem = m.data;
  const tierStart = mem.tier?.minPoints || 0;
  const progress = mem.nextTier ? Math.min(100, Math.max(0, ((mem.lifetimePoints - tierStart) / Math.max(1, mem.nextTier.minPoints - tierStart)) * 100)) : 100;
  return (
    <Screen onRefresh={() => { m.refresh(); loadHist(1, true); }} refreshing={m.refreshing}>
      <Card style={{ backgroundColor: colors.primary, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>QUICK MEMBER</Text>{mem.tier ? <Badge icon="ribbon" tone="warn" label={mem.tier.name} /> : null}</View>
        <Text style={{ color: '#d8e2ff', fontSize: 12, fontWeight: '700', marginTop: 8 }}>ĐIỂM KHẢ DỤNG</Text>
        <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900' }}>{formatNumber(mem.points)}</Text>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{mem.fullName || user?.fullName}</Text>
        <Text style={{ color: '#d8e2ff', fontSize: 12 }}>Mã thành viên: {mem.memberCode}</Text>
      </Card>
      <Button title="Hiện mã QR thành viên" icon="qr-code-outline" onPress={() => navigation.navigate('MemberCard')} />
      <Card>
        <H>Tiến độ hạng {mem.tier?.name || ''}</H>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceContainer, overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: '100%', backgroundColor: colors.secondary }} /></View>
        <Muted>{mem.nextTier ? `Còn ${formatNumber(mem.pointsToNextTier)} điểm để lên hạng ${mem.nextTier.name} (${formatNumber(mem.nextTier.minPoints)} điểm)` : 'Bạn đang ở hạng cao nhất. Cảm ơn bạn!'}</Muted>
        <Muted>Tích lũy trọn đời: {formatNumber(mem.lifetimePoints)} điểm. Mỗi 10.000₫ khi nhận hàng = 1 điểm.</Muted>
      </Card>
      <Card>
        <H>Dùng điểm</H>
        <Muted>• 1 điểm = 100₫, trừ thẳng vào đơn ở bước xác nhận đơn hàng.</Muted>
        <Muted>• Dùng tối thiểu 100 điểm, giảm tối đa 50% giá trị đơn.</Muted>
        <Muted>• Đơn bị hủy hoặc hết hạn thanh toán sẽ được hoàn lại điểm.</Muted>
        <Muted style={{ fontWeight: '700', color: colors.text }}>Điểm của bạn đang trị giá {formatNumber(mem.points * 100)}₫.</Muted>
      </Card>
      <Card>
        <H>Lịch sử điểm</H>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[['', 'Tất cả'], ...Object.entries(TYPES)].map(([k, l]) => <Chip key={k} label={l} active={type === k} onPress={() => setType(k)} />)}</View>
        {hError ? <Muted style={{ color: colors.error }}>{hError}</Muted> : null}
        {items.length === 0 && !hLoading ? <Muted>Chưa có biến động điểm nào.</Muted> : null}
        {items.map((h) => (
          <View key={h._id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 10 }}>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '600' }}>{TYPES[h.type] || h.type}</T><Muted numberOfLines={2}>{h.reason || ''}</Muted><Muted>{formatDateTime(h.createdAt)}</Muted></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '900', color: h.points >= 0 ? colors.secondary : colors.error }}>{h.points >= 0 ? '+' : ''}{formatNumber(h.points)}</Text><Muted>Còn {formatNumber(h.balanceAfter)}</Muted></View>
          </View>))}
        {hLoading ? <Muted>Đang tải…</Muted> : null}
        {!hLoading && page < pages ? <Button small variant="soft" title="Xem thêm" onPress={() => loadHist(page + 1, false)} /> : null}
      </Card>
    </Screen>
  );
}
