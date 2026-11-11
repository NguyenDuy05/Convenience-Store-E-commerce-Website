import { useState } from 'react';
import { Keyboard, Pressable, View, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import * as A from '../api';
import { Banner, Button, Field, H, Icon, Muted, Text } from '../components/ui';
import { colors, radius, shadow } from '../theme';
import { BrandRow } from '../components/Brand';
import { errMsg } from '../utils/format';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^(\+?84|0)\d{9,10}$/;

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <BrandRow />
            <Image source={require('../../assets/mascot.png')} style={{ width: 110, height: 110, borderRadius: 55 }} />
          </View>
          <View style={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow }}>
            <View><H style={{ fontSize: 22 }}>{title}</H>{subtitle ? <Muted style={{ marginTop: 4 }}>{subtitle}</Muted> : null}</View>
            {children}
          </View>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const Link = ({ children, onPress }) => <Pressable onPress={onPress} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '700' }}>{children}</Text></Pressable>;

const done = (nav) => { Keyboard.dismiss(); if (nav.canGoBack()) nav.goBack(); else nav.navigate('Tabs'); };

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!EMAIL_RE.test(email.trim()) || !password) { setError('Vui lòng nhập email hợp lệ và mật khẩu.'); return; }
    setBusy(true); setError('');
    try {
      const u = await login(email.trim(), password);
      // Nhân viên / quản trị viên: app tự chuyển sang giao diện theo vai trò
      if (u.role !== 'customer') return;
      done(navigation);
    } catch (e) { setError(errMsg(e, 'Email hoặc mật khẩu không đúng.')); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Đăng nhập" subtitle="Chào mừng bạn quay lại cửa hàng"
      footer={<View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => done(navigation)}><Muted>Để sau, tiếp tục xem sản phẩm</Muted></Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}><Muted>Chưa có tài khoản?</Muted><Link onPress={() => navigation.replace('Register')}>Đăng ký</Link></View>
      </View>}>
      {error ? <Banner tone="error" icon="alert-circle-outline" text={error} /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ten@email.com" />
      <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mật khẩu" onSubmitEditing={submit} />
      <View style={{ alignItems: 'flex-end' }}><Link onPress={() => navigation.navigate('ForgotPassword')}>Quên mật khẩu?</Link></View>
      <Button title="Đăng nhập" loading={busy} onPress={submit} />
    </AuthShell>
  );
}

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const e = {};
    if (!f.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Email không hợp lệ';
    if (f.phone.trim() && !PHONE_RE.test(f.phone.trim().replace(/[\s.-]/g, ''))) e.phone = 'Số điện thoại không hợp lệ';
    if (f.password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (f.confirm !== f.password) e.confirm = 'Mật khẩu xác nhận không khớp';
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await register({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, password: f.password }); done(navigation); }
    catch (err) { setError(errMsg(err, 'Không đăng ký được. Vui lòng thử lại.')); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Đặt hàng online, nhận tại cửa hàng"
      footer={<View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}><Muted>Đã có tài khoản?</Muted><Link onPress={() => navigation.replace('Login')}>Đăng nhập</Link></View>}>
      {error ? <Banner tone="error" icon="alert-circle-outline" text={error} /> : null}
      <Field label="Họ và tên" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} maxLength={100} />
      <Field label="Email" value={f.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Số điện thoại (không bắt buộc)" value={f.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" />
      <Field label="Mật khẩu" value={f.password} onChangeText={set('password')} error={errors.password} secureTextEntry placeholder="Tối thiểu 8 ký tự" />
      <Field label="Nhập lại mật khẩu" value={f.confirm} onChangeText={set('confirm')} error={errors.confirm} secureTextEntry />
      <Button title="Đăng ký" loading={busy} onPress={submit} />
    </AuthShell>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Vui lòng nhập email hợp lệ.'); return; }
    setBusy(true); setError('');
    try { await A.auth.forgotPassword({ email: email.trim() }); setSent(true); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại mật khẩu">
      {sent ? (
        <>
          <Banner tone="success" icon="mail-outline" title="Đã gửi hướng dẫn" text="Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu (hiệu lực có thời hạn)." />
          <Button title="Tôi đã có liên kết / mã" onPress={() => navigation.replace('ResetPassword')} />
        </>
      ) : (
        <>
          {error ? <Banner tone="error" icon="alert-circle-outline" text={error} /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title="Gửi liên kết" loading={busy} onPress={submit} />
          <Button title="Đã có mã đặt lại" variant="ghost" onPress={() => navigation.replace('ResetPassword')} />
        </>
      )}
    </AuthShell>
  );
}

// Dán liên kết trong email (…/reset-password?token=…) hoặc chỉ mã token đều được
const parseToken = (v) => { const m = /token=([a-f0-9]+)/i.exec(v); return (m ? m[1] : v).trim(); };

export function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState(route.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const t = parseToken(token);
    if (!t) { setError('Vui lòng dán liên kết hoặc mã đặt lại từ email.'); return; }
    if (password.length < 8) { setError('Mật khẩu tối thiểu 8 ký tự.'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true); setError('');
    try { await A.auth.resetPassword({ token: t, password }); setOk(true); }
    catch (e) { setError(errMsg(e, 'Liên kết không hợp lệ hoặc đã hết hạn.')); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Dán liên kết trong email rồi chọn mật khẩu mới">
      {ok ? (
        <>
          <Banner tone="success" icon="checkmark-circle-outline" title="Đổi mật khẩu thành công" text="Bạn có thể đăng nhập bằng mật khẩu mới." />
          <Button title="Đăng nhập" onPress={() => navigation.replace('Login')} />
        </>
      ) : (
        <>
          {error ? <Banner tone="error" icon="alert-circle-outline" text={error} /> : null}
          <Field label="Liên kết hoặc mã từ email" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
          <Field label="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry placeholder="Tối thiểu 8 ký tự" />
          <Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry />
          <Button title="Đặt lại mật khẩu" loading={busy} onPress={submit} />
        </>
      )}
    </AuthShell>
  );
}
