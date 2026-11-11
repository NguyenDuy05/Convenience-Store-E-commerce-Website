const ApiError = require('../utils/ApiError');

// Trả 404 cho đường dẫn API không tồn tại
const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

// eslint-disable-next-line no-unused-vars
// Trả lỗi dạng JSON { message } (ApiError giữ mã lỗi, lỗi khác trả 500)
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' });
  if (err instanceof ApiError) return res.status(err.status).json({ ...(err.data || {}), message: err.message });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid data', errors: Object.values(err.errors).map((e) => e.message) });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid value: ' + err.path });
  if (err.code === 11000) return res.status(409).json({ message: 'A record with these values already exists', fields: Object.keys(err.keyValue || {}) });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};

module.exports = { notFound, errorHandler };
