import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import GoogleButton from '../../components/auth/GoogleButton';

const roleHome = { customer: '/', staff: '/staff', admin: '/admin' };

// UC-03 / UC-14 / UC-26 Login
export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const goHome = (user) => navigate(location.state?.from?.pathname || roleHome[user.role] || '/', { replace: true });

  const validate = () => {
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Please enter a valid email address.';
    if (!form.password) errs.password = 'Please enter your password.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      goHome(await login(form.email, form.password));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (credential) => {
    setError('');
    try {
      goHome(await googleLogin(credential));
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <AuthShell active="login">
      {error && (
        <div className="auth-banner error">
          <Icon name="error" />
          <div>
            <p className="auth-banner-title">Login failed</p>
            <p className="auth-banner-text">{error}</p>
          </div>
        </div>
      )}

      <div className="auth-head">
        <div className="auth-head-icon blue"><Icon name="local_mall" size="lg" /></div>
        <div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Log in to order and pick up at the store faster.</p>
        </div>
      </div>

      <GoogleButton text="signin_with" onCredential={onGoogle} />
      <div className="auth-or"><span>or log in with email</span></div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Email" icon="mail" name="email" type="email" autoComplete="email"
          placeholder="you@example.com" value={form.email} onChange={onChange} error={fieldErrors.email}
        />
        <div>
          <AuthField
            label="Password" icon="lock" name="password" type="password" autoComplete="current-password"
            placeholder="Enter your password" value={form.password} onChange={onChange} error={fieldErrors.password}
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
        </div>

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? (<><span className="auth-spinner" /> Logging in...</>) : (<>Log in <Icon name="arrow_forward" size="md" /></>)}
        </button>
      </form>

      <div className="auth-foot">
        Don&rsquo;t have an account? <Link to="/register">Sign up</Link>
      </div>
    </AuthShell>
  );
}