import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';

// UC-01 Register
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Email không hợp lệ.';
    if (form.phone && !/^[0-9\s+]{9,13}$/.test(form.phone.trim())) errs.phone = 'Số điện thoại không hợp lệ.';
    if (form.password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự.';
    if (form.confirm !== form.password) errs.confirm = 'Mật khẩu nhập lại không khớp.';
    if (!agree) errs.agree = 'Bạn cần đồng ý với Điều khoản dịch vụ.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      navigate('/', { replace: true });   // đăng ký xong tự đăng nhập luôn
    } catch (err) {
      setError(err.response?.data?.message || 'Không tạo được tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell active="register">
      {error && (
        <div className="auth-banner error">
          <Icon name="error" />
          <div>
            <p className="auth-banner-title">Đăng ký thất bại</p>
            <p className="auth-banner-text">{error}</p>
          </div>
        </div>
      )}

      <div className="auth-head">
        <div className="auth-head-icon green"><Icon name="person_add" size="lg" /></div>
        <div>
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-sub">Mua sắm nhanh hơn. Nhận hàng chỉ sau 15 phút.</p>
        </div>
      </div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Họ và tên" icon="badge" name="fullName" autoComplete="name"
          placeholder="VD: Nguyễn Văn A" value={form.fullName} onChange={onChange} error={fieldErrors.fullName}
        />
        <div className="auth-grid">
          <AuthField
            label="Email" icon="mail" name="email" type="email" autoComplete="email"
            placeholder="ban@example.com" value={form.email} onChange={onChange} error={fieldErrors.email}
          />
          <AuthField
            label="Số điện thoại" hint="Không bắt buộc" icon="phone_iphone" name="phone" type="tel" autoComplete="tel"
            placeholder="090 123 4567" value={form.phone} onChange={onChange} error={fieldErrors.phone}
          />
        </div>
        <AuthField
          label="Mật khẩu" hint="Tối thiểu 8 ký tự" icon="lock" name="password" type="password" autoComplete="new-password"
          placeholder="Ít nhất 8 ký tự" value={form.password} onChange={onChange} error={fieldErrors.password}
        />
        <AuthField
          label="Nhập lại mật khẩu" icon="verified_user" name="confirm" type="password" autoComplete="new-password"
          placeholder="Nhập lại mật khẩu" value={form.confirm} onChange={onChange} error={fieldErrors.confirm}
        />

        <div>
          <label className="auth-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Tôi đồng ý với <a href="#terms">Điều khoản dịch vụ</a> và <a href="#privacy">Chính sách bảo mật</a>.</span>
          </label>
          {fieldErrors.agree && <p className="auth-field-error"><Icon name="error" size="sm" /> {fieldErrors.agree}</p>}
        </div>

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? (<><span className="auth-spinner" /> Đang tạo tài khoản...</>) : (<>Tạo tài khoản <Icon name="how_to_reg" size="md" /></>)}
        </button>
      </form>

      <div className="auth-foot">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </div>
    </AuthShell>
  );
}