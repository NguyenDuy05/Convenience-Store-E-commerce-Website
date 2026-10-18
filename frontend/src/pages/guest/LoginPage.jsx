import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';

const roleHome = { customer: '/', staff: '/staff', admin: '/admin' };

// UC-03 / UC-14 / UC-26 Login
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Vui lòng nhập email hợp lệ.';
    if (form.password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from?.pathname || roleHome[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Không đăng nhập được');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell active="login">
      {error && (
        <div className="auth-banner error">
          <Icon name="error" />
          <div>
            <p className="auth-banner-title">Đăng nhập thất bại</p>
            <p className="auth-banner-text">{error}</p>
          </div>
        </div>
      )}

      <div className="auth-head">
        <div className="auth-head-icon blue"><Icon name="local_mall" size="lg" /></div>
        <div>
          <h1 className="auth-title">Chào mừng trở lại</h1>
          <p className="auth-sub">Đăng nhập để đặt hàng và nhận tại cửa hàng nhanh hơn.</p>
        </div>
      </div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Email" icon="mail" name="email" type="email" autoComplete="email"
          placeholder="ban@example.com" value={form.email} onChange={onChange} error={fieldErrors.email}
        />
        <div>
          <AuthField
            label="Mật khẩu" icon="lock" name="password" type="password" autoComplete="current-password"
            placeholder="Nhập mật khẩu" value={form.password} onChange={onChange} error={fieldErrors.password}
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link to="/forgot-password" className="auth-link">Quên mật khẩu?</Link>
          </div>
        </div>

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? (<><span className="auth-spinner" /> Đang đăng nhập...</>) : (<>Đăng nhập <Icon name="arrow_forward" size="md" /></>)}
        </button>
      </form>

      <div className="auth-foot">
        Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
      </div>
    </AuthShell>
  );
}