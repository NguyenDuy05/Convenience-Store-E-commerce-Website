import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth.api';
import AuthShell, { Icon } from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';

// UC-05 / UC-16 Forgot Password: nhập email để nhận link đặt lại mật khẩu
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setFieldError('Please enter a valid email address.'); return; }
    setFieldError('');
    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-head">
        <div className="auth-head-icon blue"><Icon name="lock_reset" size="lg" /></div>
        <div>
          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-sub">Enter your email and we&rsquo;ll send you a link to reset it.</p>
        </div>
      </div>

      {sent ? (
        <>
          <div className="auth-banner success" style={{ marginTop: 16 }}>
            <Icon name="mark_email_read" />
            <div>
              <p className="auth-banner-title">Check your inbox</p>
              <p className="auth-banner-text">If an account exists for <b>{email.trim()}</b>, we&rsquo;ve sent a password reset link. It is valid for 30 minutes. Don&rsquo;t forget to check your spam folder.</p>
            </div>
          </div>
          <Link to="/login" className="auth-btn auth-btn-link">Back to log in</Link>
          <div className="auth-foot">
            Didn&rsquo;t get it? <button type="button" className="auth-textbtn" onClick={() => setSent(false)}>Try again</button>
          </div>
        </>
      ) : (
        <>
          {error && (
            <div className="auth-banner error" style={{ marginTop: 16 }}>
              <Icon name="error" />
              <div><p className="auth-banner-title">Something went wrong</p><p className="auth-banner-text">{error}</p></div>
            </div>
          )}
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <AuthField
              label="Email" icon="mail" name="email" type="email" autoComplete="email"
              placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError}
            />
            <button className="auth-btn" type="submit" disabled={submitting}>
              {submitting ? (<><span className="auth-spinner" /> Sending...</>) : (<>Send reset link <Icon name="send" size="md" /></>)}
            </button>
          </form>
          <div className="auth-foot">
            Remembered it? <Link to="/login">Back to log in</Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}