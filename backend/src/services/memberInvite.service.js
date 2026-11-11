const crypto = require('crypto');
const { sendMail } = require('./mail.service');

const INVITE_DAYS = 7;
// Băm SHA-256 (dùng để lưu token đặt mật khẩu)
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Escape HTML khi chèn vào email
const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Gửi email chào mừng thành viên đăng ký tại quầy kèm link tự đặt mật khẩu
exports.sendSetPasswordInvite = async (user, memberCode) => {
  if (!user.email) return false;
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordReset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_DAYS * 86400000) };
  await user.save();
  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const text = `Hi ${user.fullName},\n\nWelcome to QUICK membership! Your member code is ${memberCode}. Show it (or tell us your phone number) at the counter to collect points.\n\nTo also order online, set your password here (valid for ${INVITE_DAYS} days):\n${link}\n\nIf you did not sign up at our store, you can ignore this email.`;
  const html = `<p>Hi ${esc(user.fullName)},</p><p>Welcome to <b>QUICK membership</b>! Your member code is <b>${esc(memberCode)}</b>. Show it, or tell us your phone number, at the counter to collect points.</p><p>To also order online, set your password (valid for ${INVITE_DAYS} days):</p><p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0058bc;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Set my password</a></p><p style="color:#666;font-size:13px">Or copy this link: ${link}<br/>If you did not sign up at our store, you can ignore this email.</p>`;
  try { await sendMail({ to: user.email, subject: 'Welcome to QUICK membership', text, html }); return true; }
  catch (e) { console.error('Could not send member invite:', e.message); return false; }
};
