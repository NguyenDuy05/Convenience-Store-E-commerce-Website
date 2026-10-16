const { notImplemented } = require('../utils/notImplemented');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, MembershipTier } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const MAX_FAILED = 5;      // nhập sai 5 lần thì khóa tạm
const LOCK_MINUTES = 15;

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

const publicUser = (u) => ({ id: u._id, fullName: u.fullName, email: u.email, role: u.role });

// UC-01 Register (chỉ tạo tài khoản customer)
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (!fullName || !email || !password) throw new ApiError(400, 'Vui lòng nhập họ tên, email và mật khẩu');
  if (password.length < 8) throw new ApiError(400, 'Mật khẩu tối thiểu 8 ký tự');

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw new ApiError(409, 'Email đã được sử dụng');

  const tier = await MembershipTier.findOne().sort({ minPoints: 1 });   // hạng thấp nhất
  const user = await User.create({
    role: 'customer',
    fullName,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    membership: tier ? { tierId: tier._id } : undefined,
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// UC-03 / UC-14 / UC-26 Login (Customer, Staff, Admin dùng chung)
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Vui lòng nhập email và mật khẩu');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user || user.status === 'deleted') throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
  if (user.status === 'locked') throw new ApiError(403, 'Tài khoản đã bị khóa');
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(403, 'Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILED) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ token: signToken(user), user: publicUser(user) });
});

// UC-04 / UC-15 / UC-27 Logout: JWT không lưu phía server, client xóa token là xong
exports.logout = (req, res) => res.json({ message: 'Đã đăng xuất' });

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.status !== 'active') throw new ApiError(401, 'Tài khoản không khả dụng');
  res.json(publicUser(user));
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.forgotPassword = notImplemented('UC-05/16 Forgot Password (Customer, Staff)');
exports.resetPassword = notImplemented('UC-05/16 Forgot Password (đặt lại mật khẩu)');
