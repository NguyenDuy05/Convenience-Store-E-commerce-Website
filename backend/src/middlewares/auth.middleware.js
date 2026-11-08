const jwt = require('jsonwebtoken');
const { User } = require('../models');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Require authentication using the token in the header "Authorization: Bearer <token>".
// Sau khi kiểm tra chữ ký còn đối chiếu tài khoản trong database: tài khoản bị khóa / xóa thì token cũ mất hiệu lực ngay,
// (hệ thống không có chức năng đổi vai trò nên vai trò lấy từ token là đủ).
async function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  try {
    const user = await User.findById(payload.id).select('status').lean();
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Account is not available' });
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional authentication: attach req.user when a valid token is provided
function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* ignore and continue as a guest */ }
  }
  next();
}

// Authorize by role, for example: authorize('admin', 'staff')
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied' });

module.exports = { authenticate, optionalAuth, authorize };
