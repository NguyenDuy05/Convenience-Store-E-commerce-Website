const bcrypt = require('bcryptjs');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../services/activity.service');

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const MIN_PASSWORD = 8;
const MAX_AVATAR_CHARS = 400000;
const DATA_IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

// Kiểm tra ngày sinh hợp lệ (không ở tương lai)
function parseDateOfBirth(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'Date of birth is invalid');
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new ApiError(400, 'Date of birth is invalid');
  const now = new Date();
  if (d > now) throw new ApiError(400, 'Date of birth cannot be in the future');
  if (now.getUTCFullYear() - d.getUTCFullYear() > 120) throw new ApiError(400, 'Date of birth is invalid');
  return d;
}

// Lấy tài khoản của chính người đang đăng nhập
async function loadMe(userId, withPassword = false) {
  const query = User.findById(userId);
  if (withPassword) query.select('+passwordHash');
  const user = await query;
  if (!user || user.status !== 'active') throw new ApiError(401, 'Account is not available');
  return user;
}

// Dữ liệu hồ sơ trả về (kèm mã thành viên với khách)
const toProfile = (u) => ({
  id: u._id,
  role: u.role,
  fullName: u.fullName,
  email: u.email,
  phone: u.phone || '',
  avatarUrl: u.avatarUrl || '',
  dateOfBirth: u.dateOfBirth || null,
  hasGoogle: !!u.googleId,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  ...(u.role === 'staff' ? { staffInfo: u.staffInfo || {} } : {}),
});

// UC-06.1/17.1/28.1 Xem hồ sơ cá nhân
exports.getProfile = asyncHandler(async (req, res) => {
  res.json(toProfile(await loadMe(req.user.id)));
});

// UC-06.2/17.2/28.2 Sửa hồ sơ (họ tên, SĐT, ngày sinh, ảnh đại diện)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, avatarUrl, dateOfBirth } = req.body || {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  if (!name) throw new ApiError(400, 'Full name is required');
  if (name.length > 100) throw new ApiError(400, 'Full name must be 100 characters or fewer');

  const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[\s.-]/g, '') : '';
  if (cleanPhone && !PHONE_RE.test(cleanPhone)) throw new ApiError(400, 'Phone number is invalid');

  const avatar = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  if (avatar) {
    if (avatar.length > MAX_AVATAR_CHARS) throw new ApiError(400, 'Avatar image is too large');
    if (!/^https?:\/\/\S+$/i.test(avatar) && !DATA_IMAGE_RE.test(avatar)) throw new ApiError(400, 'Avatar must be a PNG, JPEG or WebP image');
  }
  const dob = parseDateOfBirth(dateOfBirth);

  const user = await loadMe(req.user.id);
  user.fullName = name;
  user.phone = cleanPhone || undefined;
  user.avatarUrl = avatar || undefined;
  user.dateOfBirth = dob;
  await user.save();
  await logActivity(req, { action: 'PROFILE_UPDATE', targetType: 'User', targetId: user._id });
  res.json(toProfile(user));
});

// UC-06.3/17.3/28.3 Đổi mật khẩu (phải nhập đúng mật khẩu cũ)
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword) throw new ApiError(400, 'Current password is required');
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) {
    throw new ApiError(400, `New password must be at least ${MIN_PASSWORD} characters`);
  }
  if (newPassword.length > 72) throw new ApiError(400, 'New password must be 72 characters or fewer');
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    throw new ApiError(400, 'Password confirmation does not match');
  }

  const user = await loadMe(req.user.id, true);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordReset = undefined;
  await user.save();
  await logActivity(req, { action: 'PASSWORD_CHANGE', targetType: 'User', targetId: user._id });
  res.json({ message: 'Password changed' });
});
