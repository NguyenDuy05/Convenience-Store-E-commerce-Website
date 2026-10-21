const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, MembershipTier } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('../services/mail.service');

const MAX_FAILED = 5;        // nhập sai 5 lần thì khóa tạm
const LOCK_MINUTES = 15;
const RESET_MINUTES = 30;    // link đặt lại mật khẩu có hiệu lực 30 phút

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

const publicUser = (u) => ({ id: u._id, fullName: u.fullName, email: u.email, role: u.role });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Tạo tài khoản customer (dùng chung cho Register và Google)
async function createCustomer({ fullName, email, phone, passwordHash, avatarUrl, googleId }) {
  const tier = await MembershipTier.findOne().sort({ minPoints: 1 });   // hạng thấp nhất
  return User.create({
    role: 'customer', fullName, email, phone, passwordHash, avatarUrl, googleId,
    membership: tier ? { tierId: tier._id } : undefined,
  });
}

// UC-01 Register (chỉ tạo tài khoản customer)
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (!fullName || !email || !password) throw new ApiError(400, 'Please enter your full name, email and password');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw new ApiError(409, 'This email is already in use');

  const user = await createCustomer({ fullName, email, phone, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// UC-03 / UC-14 / UC-26 Login (Customer, Staff, Admin dùng chung)
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Please enter your email and password');

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

// Đăng ký / đăng nhập bằng Google (Google Identity Services gửi lên ID token = "credential")
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
    // Tài khoản Google không có mật khẩu: lưu hash của chuỗi ngẫu nhiên (muốn đặt mật khẩu thì dùng Forgot Password)
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = await createCustomer({
      fullName: payload.name || email.split('@')[0],
      email, passwordHash: randomHash, avatarUrl: payload.picture, googleId: payload.sub,
    });
  }

  user.lastLoginAt = new Date();
  await user.save();
  res.status(isNew ? 201 : 200).json({ token: signToken(user), user: publicUser(user), isNew });
});

// UC-04 / UC-15 / UC-27 Logout: JWT không lưu phía server, client xóa token là xong
exports.logout = (req, res) => res.json({ message: 'Logged out' });

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.status !== 'active') throw new ApiError(401, 'Account is not available');
  res.json(publicUser(user));
});

// UC-05 / UC-16 Forgot Password: gửi link đặt lại mật khẩu qua email (Customer, Staff)
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Please enter a valid email address');

  // Luôn trả lời giống nhau để không lộ email nào đã đăng ký
  const generic = { message: 'If an account exists for that email, a password reset link has been sent.' };

  const user = await User.findOne({ email });
  if (!user || user.status !== 'active' || !['customer', 'staff'].includes(user.role)) return res.json(generic);

  // Chống gửi dồn dập: vừa gửi trong 60 giây gần đây thì bỏ qua
  const expiresAt = user.passwordReset?.expiresAt;
  if (expiresAt && expiresAt.getTime() - Date.now() > (RESET_MINUTES * 60 - 60) * 1000) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordReset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) };
  await user.save();

  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const text = `Hi ${user.fullName},\n\nWe received a request to reset your password. Open the link below to choose a new one (valid for ${RESET_MINUTES} minutes):\n\n${link}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hi ${user.fullName},</p><p>We received a request to reset your password. Click the button below to choose a new one (valid for ${RESET_MINUTES} minutes).</p><p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0058bc;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p><p style="color:#666;font-size:13px">Or copy this link: ${link}<br/>If you did not request this, you can ignore this email.</p>`;
  try {
    await sendMail({ to: user.email, subject: 'Reset your password', text, html });
  } catch (e) {
    console.error('Could not send reset email:', e.message);
  }
  res.json(generic);
});

// UC-05 / UC-16 Forgot Password (đặt lại mật khẩu bằng token trong link)
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new ApiError(400, 'Missing reset token or new password');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await User.findOne({
    'passwordReset.tokenHash': sha256(String(token)),
    'passwordReset.expiresAt': { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one');

  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordReset = undefined;
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  await user.save();
  res.json({ message: 'Your password has been updated. You can now log in.' });
});