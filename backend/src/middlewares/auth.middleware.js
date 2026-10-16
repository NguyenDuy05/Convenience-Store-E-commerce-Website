const jwt = require('jsonwebtoken');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Bắt buộc đăng nhập: đọc token từ header "Authorization: Bearer <token>"
function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

// Không bắt buộc đăng nhập, nhưng nếu có token hợp lệ thì gắn req.user (dùng cho route Guest xem được)
function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* bỏ qua, coi như khách */ }
  }
  next();
}

// Phân quyền theo role, ví dụ: authorize('admin', 'staff')
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Không có quyền truy cập' });

module.exports = { authenticate, optionalAuth, authorize };
