const jwt = require('jsonwebtoken');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Require authentication using the token in the header "Authorization: Bearer <token>"
function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
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
