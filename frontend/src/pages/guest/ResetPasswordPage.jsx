import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth.api';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';

// UC-05 / UC-16 Forgot Password: đặt mật khẩu mới từ link trong email (?token=...)
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await resetPassword({ token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-head">
        <div className="auth-head-icon green"><Icon name="key" size="lg" /></div>
        <div>
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-sub">Choose a strong password you haven&rsquo;t used before.</p>
        </div>
      </div>

      {done ? (
        <>
          <div className="auth-banner success" style={{ marginTop: 16 }}>
            <Icon name="check_circle" />
            <div><p className="auth-banner-title">Password updated</p><p className="auth-banner-text">Your password has been changed. You can now log in with it.</p></div>
          </div>
          <Link to="/login" className="auth-btn auth-btn-link">Go to log in</Link>
        </>
      ) : !token ? (
        <>
          <div className="auth-banner error" style={{ marginTop: 16 }}>
            <Icon name="error" />
            <div><p className="auth-banner-title">Invalid link</p><p className="auth-banner-text">This reset link is missing or incomplete. Please request a new one.</p></div>
          </div>
          <Link to="/forgot-password" className="auth-btn auth-btn-link">Request a new link</Link>
        </>
      ) : (
        <>
          {error && (
            <div className="auth-banner error" style={{ marginTop: 16 }}>
              <Icon name="error" />
              <div>
                <p className="auth-banner-title">Could not reset password</p>
                <p className="auth-banner-text">{error} <Link to="/forgot-password" className="auth-link">Request a new link</Link></p>
              </div>
            </div>
          )}
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <AuthField
              label="New password" hint="Min. 8 characters" icon="lock" name="password" type="password" autoComplete="new-password"
              placeholder="At least 8 characters" value={form.password} onChange={onChange} error={fieldErrors.password}
            />
            <AuthField
              label="Confirm new password" icon="verified_user" name="confirm" type="password" autoComplete="new-password"
              placeholder="Re-enter your new password" value={form.confirm} onChange={onChange} error={fieldErrors.confirm}
            />
            <button className="auth-btn" type="submit" disabled={submitting}>
              {submitting ? (<><span className="auth-spinner" /> Updating...</>) : (<>Update password <Icon name="check" size="md" /></>)}
            </button>
          </form>
          <div className="auth-foot"><Link to="/login">Back to log in</Link></div>
        </>
      )}
    </AuthShell>
  );
}