import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import GoogleButton from '../../components/auth/GoogleButton';

// UC-01 Register
export default function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Please enter a valid email address.';
    if (form.phone && !/^[0-9\s+]{9,13}$/.test(form.phone.trim())) errs.phone = 'Please enter a valid phone number.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    if (!agree) errs.agree = 'You need to accept the Terms of Service.';
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
      setError(err.response?.data?.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google: tài khoản mới sẽ được tạo tự động, nếu email đã có thì đăng nhập luôn
  const onGoogle = async (credential) => {
    setError('');
    try {
      await googleLogin(credential);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
    }
  };

  return (
    <AuthShell active="register">
      {error && (
        <div className="auth-banner error">
          <Icon name="error" />
          <div>
            <p className="auth-banner-title">Sign-up failed</p>
            <p className="auth-banner-text">{error}</p>
          </div>
        </div>
      )}

      <div className="auth-head">
        <div className="auth-head-icon green"><Icon name="person_add" size="lg" /></div>
        <div>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Shop faster. Pick up in just 15 minutes.</p>
        </div>
      </div>

      <GoogleButton text="signup_with" onCredential={onGoogle} />
      <div className="auth-or"><span>or sign up with email</span></div>

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Full name" icon="badge" name="fullName" autoComplete="name"
          placeholder="e.g. Nguyen Van A" value={form.fullName} onChange={onChange} error={fieldErrors.fullName}
        />
        <div className="auth-grid">
          <AuthField
            label="Email" icon="mail" name="email" type="email" autoComplete="email"
            placeholder="you@example.com" value={form.email} onChange={onChange} error={fieldErrors.email}
          />
          <AuthField
            label="Phone" hint="Optional" icon="phone_iphone" name="phone" type="tel" autoComplete="tel"
            placeholder="090 123 4567" value={form.phone} onChange={onChange} error={fieldErrors.phone}
          />
        </div>
        <AuthField
          label="Password" hint="Min. 8 characters" icon="lock" name="password" type="password" autoComplete="new-password"
          placeholder="At least 8 characters" value={form.password} onChange={onChange} error={fieldErrors.password}
        />
        <AuthField
          label="Confirm password" icon="verified_user" name="confirm" type="password" autoComplete="new-password"
          placeholder="Re-enter your password" value={form.confirm} onChange={onChange} error={fieldErrors.confirm}
        />

        <div>
          <label className="auth-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span>
          </label>
          {fieldErrors.agree && <p className="auth-field-error"><Icon name="error" size="sm" /> {fieldErrors.agree}</p>}
        </div>

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? (<><span className="auth-spinner" /> Creating account...</>) : (<>Create account <Icon name="how_to_reg" size="md" /></>)}
        </button>
      </form>

      <div className="auth-foot">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthShell>
  );
}