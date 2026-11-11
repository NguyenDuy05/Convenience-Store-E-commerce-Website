const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, MembershipTier } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('../services/mail.service');

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const RESET_MINUTES = 30;

// Tạo JWT (hạn 1 ngày) chứa id và vai trò người dùng
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Thông tin người dùng trả về cho client (không có mật khẩu)
const publicUser = (u) => ({ id: u._id, fullName: u.fullName, email: u.email, role: u.role });
// Escape HTML khi chèn tên người dùng vào email
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
// Băm SHA-256 (dùng để lưu token đặt lại mật khẩu)
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Tạo tài khoản khách hàng hạng thấp nhất (dùng chung cho đăng ký thường và Google)
async function createCustomer({ fullName, email, phone, passwordHash, avatarUrl, googleId, signupChannel = 'online' }) {
  const tier = await MembershipTier.findOne().sort({ minPoints: 1 });
  return User.create({
    role: 'customer', fullName, email, phone, passwordHash, avatarUrl, googleId, signupChannel,
    membership: tier ? { tierId: tier._id } : undefined,
  });
}

// UC-01 Đăng ký tài khoản khách hàng
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (typeof fullName !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !fullName.trim() || !email.trim() || !password) {
    throw new ApiError(400, 'Please enter your full name, email and password');
  }
  if (fullName.trim().length > 100) throw new ApiError(400, 'Full name must be 100 characters or fewer');
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new ApiError(400, 'Please enter a valid email address');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (password.length > 72) throw new ApiError(400, 'Password must be 72 characters or fewer');
  const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[\s.-]/g, '') : '';
  if (cleanPhone && !/^(\+?84|0)\d{9,10}$/.test(cleanPhone)) throw new ApiError(400, 'Phone number is invalid');

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw new ApiError(409, exists.signupChannel === 'counter' ? 'This email is already a store member. Use "Forgot password" to set a password for it.' : 'This email is already in use');

  const user = await createCustomer({ fullName: fullName.trim(), email: email.toLowerCase().trim(), phone: cleanPhone || undefined, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// UC-03/14/26 Đăng nhập (khách, staff, admin); sai 5 lần thì khóa tạm 15 phút
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) throw new ApiError(400, 'Please enter your email and password');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user || user.status === 'deleted') throw new ApiError(401, 'Incorrect email or password');
  if (user.status === 'locked') throw new ApiError(403, 'This account has been locked');
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(403, 'Account temporarily locked after too many failed attempts. Please try again later');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILED) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    throw new ApiError(401, 'Incorrect email or password');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ token: signToken(user), user: publicUser(user) });
});

// Đăng nhập / đăng ký bằng Google: xác thực ID token, chưa có tài khoản thì tạo mới
exports.googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(503, 'Google sign-in is not configured on the server (missing GOOGLE_CLIENT_ID)');
  if (!credential) throw new ApiError(400, 'Missing Google credential');

  let payload;
  try {
    const { OAuth2Client } = require('google-auth-library');
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') throw new ApiError(503, 'Server is missing the google-auth-library package. Run: npm install google-auth-library');
    throw new ApiError(401, 'Google sign-in failed. Please try again');
  }
  if (!payload?.email || !payload.email_verified) throw new ApiError(401, 'Your Google email address is not verified');

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });
  let isNew = false;

  if (user) {
    if (user.status === 'deleted') throw new ApiError(401, 'This account is no longer available');
    if (user.status === 'locked') throw new ApiError(403, 'This account has been locked');
    if (user.role !== 'customer') throw new ApiError(403, 'Staff and admin accounts must log in with email and password');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(403, 'Account temporarily locked. Please try again later');
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
  } else {
    isNew = true;
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = await createCustomer({
      fullName: payload.name || email.split('@')[0],
      email, passwordHash: randomHash, avatarUrl: payload.picture, googleId: payload.sub, signupChannel: 'google',
    });
  }

  user.lastLoginAt = new Date();
  await user.save();
  res.status(isNew ? 201 : 200).json({ token: signToken(user), user: publicUser(user), isNew });
});

// UC-04/15/27 Đăng xuất (client tự xóa token)
exports.logout = (req, res) => res.json({ message: 'Logged out' });

// Lấy thông tin người đang đăng nhập
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.status !== 'active') throw new ApiError(401, 'Account is not available');
  res.json(publicUser(user));
});

// UC-05/16 Quên mật khẩu: gửi link đặt lại mật khẩu qua email (hiệu lực 30 phút)
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Please enter a valid email address');

  const generic = { message: 'If an account exists for that email, a password reset link has been sent.' };

  const user = await User.findOne({ email });
  if (!user || user.status !== 'active' || !['customer', 'staff'].includes(user.role)) return res.json(generic);

  const expiresAt = user.passwordReset?.expiresAt;
  if (expiresAt && expiresAt.getTime() - Date.now() > (RESET_MINUTES * 60 - 60) * 1000) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordReset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) };
  await user.save();

  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const text = `Hi ${user.fullName},\n\nWe received a request to reset your password. Open the link below to choose a new one (valid for ${RESET_MINUTES} minutes):\n\n${link}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hi ${escapeHtml(user.fullName)},</p><p>We received a request to reset your password. Click the button below to choose a new one (valid for ${RESET_MINUTES} minutes).</p><p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0058bc;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p><p style="color:#666;font-size:13px">Or copy this link: ${link}<br/>If you did not request this, you can ignore this email.</p>`;
  try {
    await sendMail({ to: user.email, subject: 'Reset your password', text, html });
  } catch (e) {
    console.error('Could not send reset email:', e.message);
  }
  res.json(generic);
});

// UC-05/16 Đặt mật khẩu mới bằng token trong link email
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || typeof password !== 'string' || !token || !password) throw new ApiError(400, 'Missing reset token or new password');
  if (password.length > 72) throw new ApiError(400, 'Password must be 72 characters or fewer');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await User.findOne({
    'passwordReset.tokenHash': sha256(String(token)),
    'passwordReset.expiresAt': { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one');

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await User.findOneAndUpdate({
    _id: user._id, status: 'active',
    'passwordReset.tokenHash': sha256(token), 'passwordReset.expiresAt': { $gt: new Date() },
  }, {
    $set: { passwordHash, failedLoginCount: 0 },
    $unset: { passwordReset: '', lockedUntil: '' },
  });
  if (!updated) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one');
  res.json({ message: 'Your password has been updated. You can now log in.' });
});
