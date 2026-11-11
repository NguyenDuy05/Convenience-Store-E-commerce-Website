const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Lấy JWT từ header Authorization: Bearer <token>
function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Bắt buộc đăng nhập: kiểm tra token và tài khoản còn hoạt động, gắn req.user
async function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  try {
    const user = await User.findById(payload.id).select('status role').lean();
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Account is not available' });
    req.user = { ...payload, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Đăng nhập tùy chọn: có token hợp lệ thì gắn req.user, không có vẫn cho qua
async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return next(); }
    try {
      const user = await User.findById(payload.id).select('status role').lean();
      if (user?.status === 'active') req.user = { ...payload, role: user.role };
    } catch (error) { return next(error); }
  }
  next();
}

// Chỉ cho các vai trò được liệt kê, vd authorize("admin", "staff")
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied' });

module.exports = { authenticate, optionalAuth, authorize };
