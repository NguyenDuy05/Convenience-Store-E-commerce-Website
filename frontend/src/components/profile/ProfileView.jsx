import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, updateProfile, changePassword } from '../../api/profile.api';
import Icon from '../common/Icon';
import AccountSidebar from '../order/AccountSidebar';
import '../../styles/qk-tokens.css';
import '../../styles/profile.css';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
// Lấy thông báo lỗi từ response API
const messageOf = (error, fallback) => error.response?.data?.message || fallback;
const ROLE_LABEL = { customer: 'Customer', staff: 'Staff', admin: 'Admin' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Đổi ngày sang dạng YYYY-MM-DD cho ô chọn ngày
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
// Ngày hôm nay dạng YYYY-MM-DD
const today = () => new Date().toISOString().slice(0, 10);

// Thu nhỏ ảnh đại diện về 256x256 JPEG trước khi lưu
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

// Định dạng ngày giờ
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
// Chữ cái đầu của họ tên (cho avatar)
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

// Dòng thông báo thành công / lỗi
function Message({ msg }) {
  if (!msg.text) return null;
  return <p className={`pf-msg ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>{msg.text}</p>;
}

// Trang hồ sơ dùng chung khách / staff / admin: sửa thông tin, ảnh, đổi mật khẩu
export default function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '' });
  const [formErrors, setFormErrors] = useState({});
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const nameRef = useRef(null);
  const fileRef = useRef(null);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const emptyPw = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState(emptyPw);
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [savingPw, setSavingPw] = useState(false);

  const fill = (data) => setForm({ fullName: data.fullName || '', phone: data.phone || '', dateOfBirth: toDateInput(data.dateOfBirth) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getProfile();
      setProfile(data);
      fill(data);
      setLoadError('');
    } catch (err) { setLoadError(messageOf(err, 'Unable to load your profile. Please try again.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitProfile = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim().replace(/[\s.-]/g, ''))) errors.phone = 'Phone number is invalid';
    if (form.dateOfBirth && form.dateOfBirth > today()) errors.dateOfBirth = 'Date of birth cannot be in the future';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingProfile(true); setProfileMsg({ type: '', text: '' });
    try {
      const { data } = await updateProfile({ ...form, avatarUrl: profile.avatarUrl });
      setProfile(data); fill(data);
      setProfileMsg({ type: 'ok', text: 'Profile updated.' });
    } catch (err) { setProfileMsg({ type: 'error', text: messageOf(err, 'Unable to update your profile.') }); }
    finally { setSavingProfile(false); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!pw.currentPassword) errors.currentPassword = 'Current password is required';
    if (pw.newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters';
    else if (pw.newPassword === pw.currentPassword) errors.newPassword = 'New password must be different from the current one';
    if (pw.confirmPassword !== pw.newPassword) errors.confirmPassword = 'Password confirmation does not match';
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPw(true); setPwMsg({ type: '', text: '' });
    try {
      await changePassword(pw);
      setPw(emptyPw);
      setShowPw(false);
      setPwMsg({ type: 'ok', text: 'Password changed.' });
    } catch (err) { setPwMsg({ type: 'error', text: messageOf(err, 'Unable to change your password.') }); }
    finally { setSavingPw(false); }
  };

  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setP = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));
  const saveAvatar = async (avatarUrl) => {
    setAvatarBusy(true); setProfileMsg({ type: '', text: '' });
    try {
      const { data } = await updateProfile({
        fullName: profile.fullName, phone: profile.phone, dateOfBirth: toDateInput(profile.dateOfBirth), avatarUrl,
      });
      setProfile(data);
      setProfileMsg({ type: 'ok', text: avatarUrl ? 'Profile photo updated.' : 'Profile photo removed.' });
    } catch (err) { setProfileMsg({ type: 'error', text: messageOf(err, 'Unable to update your photo.') }); }
    finally { setAvatarBusy(false); }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setProfileMsg({ type: 'error', text: 'Please choose a PNG, JPEG or WebP image.' }); return; }
    if (file.size > MAX_IMAGE_BYTES) { setProfileMsg({ type: 'error', text: 'Image must be 8MB or smaller.' }); return; }
    try { await saveAvatar(await resizeImage(file)); }
    catch { setProfileMsg({ type: 'error', text: 'Unable to read this image.' }); }
  };

  const editProfile = () => { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  const isCustomer = profile?.role === 'customer';

  const body = loading ? (
    <div className="pf-skeleton" aria-busy="true" />
  ) : loadError ? (
    <div className="pf-card pf-state" role="alert">
      <Icon name="cloud_off" size="xl" />
      <h3>Couldn't load your profile</h3>
      <p>{loadError}</p>
      <button type="button" className="pf-btn primary" onClick={load}><Icon name="refresh" size="md" />Try again</button>
    </div>
  ) : (
    <>
      <section className="pf-card pf-hero">
        <div className="pf-avatar-wrap">
          <button type="button" className="pf-avatar-btn" aria-label="Profile photo options" aria-haspopup="menu" aria-expanded={avatarMenu}
            disabled={avatarBusy} onClick={() => setAvatarMenu((v) => !v)}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" className="pf-avatar" />
              : <span className="pf-avatar" aria-hidden="true">{initials(profile.fullName)}</span>}
            <span className="pf-avatar-cam" aria-hidden="true"><Icon name="photo_camera" size="sm" /></span>
          </button>
          {avatarMenu && (
            <>
              <div className="pf-backdrop" onClick={() => setAvatarMenu(false)} />
              <ul className="pf-menu" role="menu">
                {profile.avatarUrl && <li><button type="button" role="menuitem" onClick={() => { setAvatarMenu(false); setViewPhoto(true); }}><Icon name="visibility" size="md" />View photo</button></li>}
                <li><button type="button" role="menuitem" onClick={() => { setAvatarMenu(false); fileRef.current?.click(); }}><Icon name="upload" size="md" />{profile.avatarUrl ? 'Change photo' : 'Upload photo'}</button></li>
                {profile.avatarUrl && <li><button type="button" role="menuitem" className="danger" onClick={() => { setAvatarMenu(false); saveAvatar(''); }}><Icon name="delete" size="md" />Remove photo</button></li>}
              </ul>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickFile} />
        </div>
        <div className="pf-hero-text">
          <h2>{profile.fullName}{isCustomer && <Icon name="verified" fill />}</h2>
          <p>
            <span><Icon name="mail" size="sm" />{profile.email}</span>
            {profile.phone && <span><Icon name="call" size="sm" />{profile.phone}</span>}
            {!isCustomer && <span className="pf-role">{ROLE_LABEL[profile.role]}</span>}
          </p>
        </div>
        <button type="button" className="pf-btn soft" onClick={editProfile}><Icon name="edit" size="md" />Edit Profile</button>
      </section>

      {viewPhoto && profile.avatarUrl && (
        <div className="pf-lightbox" role="dialog" aria-modal="true" aria-label="Profile photo" onClick={() => setViewPhoto(false)}>
          <img src={profile.avatarUrl} alt={profile.fullName} />
          <button type="button" className="pf-lightbox-close" aria-label="Close" onClick={() => setViewPhoto(false)}><Icon name="close" size="lg" /></button>
        </div>
      )}

      <form className="pf-card" onSubmit={submitProfile} noValidate>
        <h3>Personal Information</h3>
        <p className="pf-sub">Update your account name and phone number{isCustomer ? ' for store pickup identification' : ''}.</p>

        <div className="pf-fields">
          <label>Full Name
            <input ref={nameRef} value={form.fullName} onChange={setF('fullName')} maxLength={100} aria-invalid={!!formErrors.fullName} />
            {formErrors.fullName && <span className="pf-error">{formErrors.fullName}</span>}
          </label>
          <label>
            <span className="pf-label-row">Email Address<span className="pf-tag"><Icon name="check" size="sm" />Verified</span></span>
            <input value={profile.email} disabled />
          </label>
          <label>Phone Number
            <input value={form.phone} onChange={setF('phone')} inputMode="tel" aria-invalid={!!formErrors.phone} />
            {formErrors.phone && <span className="pf-error">{formErrors.phone}</span>}
          </label>
          <label>Date of Birth
            <input type="date" value={form.dateOfBirth} max={today()} onChange={setF('dateOfBirth')} aria-invalid={!!formErrors.dateOfBirth} />
            {formErrors.dateOfBirth && <span className="pf-error">{formErrors.dateOfBirth}</span>}
          </label>
        </div>

        {profile.role === 'staff' && (
          <dl className="pf-meta">
            <div><dt>Employee code</dt><dd>{profile.staffInfo?.employeeCode || '—'}</dd></div>
            <div><dt>Position</dt><dd>{profile.staffInfo?.position || '—'}</dd></div>
            <div><dt>Hired on</dt><dd>{profile.staffInfo?.hiredAt ? new Date(profile.staffInfo.hiredAt).toLocaleDateString() : '—'}</dd></div>
          </dl>
        )}

        <Message msg={profileMsg} />
        <div className="pf-foot">
          <p className="pf-note"><Icon name="info" size="md" />Last login: {fmtDate(profile.lastLoginAt)}</p>
          <button type="submit" className="pf-btn primary" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>

      <section className="pf-card">
        <h3>Account Security</h3>
        <p className="pf-sub">Control your password and keep your account protected.</p>

        <div className="pf-row">
          <span className="pf-row-icon"><Icon name="key" size="lg" /></span>
          <div className="pf-row-text">
            <strong>Password</strong>
            <span>••••••••</span>
          </div>
          <button type="button" className="pf-btn ghost" aria-expanded={showPw} onClick={() => { setShowPw((v) => !v); setPwErrors({}); setPwMsg({ type: '', text: '' }); }}>
            {showPw ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {!showPw && <Message msg={pwMsg} />}

        {showPw && (
          <form className="pf-pw" onSubmit={submitPassword} noValidate>
            <label>Current password
              <input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={setP('currentPassword')} aria-invalid={!!pwErrors.currentPassword} />
              {pwErrors.currentPassword && <span className="pf-error">{pwErrors.currentPassword}</span>}
            </label>
            <label>New password
              <input type="password" autoComplete="new-password" value={pw.newPassword} onChange={setP('newPassword')} aria-invalid={!!pwErrors.newPassword} />
              {pwErrors.newPassword && <span className="pf-error">{pwErrors.newPassword}</span>}
            </label>
            <label>Confirm new password
              <input type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={setP('confirmPassword')} aria-invalid={!!pwErrors.confirmPassword} />
              {pwErrors.confirmPassword && <span className="pf-error">{pwErrors.confirmPassword}</span>}
            </label>
            {profile.hasGoogle && <p className="pf-note">Signed up with Google and don't have a password? Use "Forgot password" on the login page to set one.</p>}
            <Message msg={pwMsg} />
            <button type="submit" className="pf-btn primary" disabled={savingPw}>{savingPw ? 'Saving...' : 'Update Password'}</button>
          </form>
        )}
      </section>
    </>
  );

  if (loading || isCustomer) {
    return (
      <div className="pf">
        <nav className="pf-crumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
          <span>My Account</span><Icon name="chevron_right" size="sm" />
          <span aria-current="page">Profile</span>
        </nav>
        <div className="pf-head">
          <h1>My Account</h1>
          <p>Manage your personal information and security.</p>
        </div>
        <div className="pf-grid">
          <div className="pf-side"><AccountSidebar /></div>
          <div className="pf-main">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf pf-narrow">
      <div className="pf-head"><h1>My Profile</h1></div>
      <div className="pf-main">{body}</div>
    </div>
  );
}
