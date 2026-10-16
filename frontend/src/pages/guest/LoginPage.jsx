import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const roleHome = { customer: '/', staff: '/staff', admin: '/admin' };

// UC-03 / UC-14 / UC-26 Login
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
    <section className="narrow">
      <h2>Đăng nhập</h2>
      <form onSubmit={onSubmit} className="form">
        <label>Email<input name="email" type="email" value={form.email} onChange={onChange} required /></label>
        <label>Mật khẩu<input name="password" type="password" value={form.password} onChange={onChange} required /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
      <p><Link to="/forgot-password">Quên mật khẩu?</Link> · <Link to="/register">Tạo tài khoản</Link></p>
    </section>
  );
}
