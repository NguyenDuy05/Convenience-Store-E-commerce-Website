const ApiError = require('../utils/ApiError');

const notFound = (req, res) => res.status(404).json({ message: 'Không tìm thấy đường dẫn' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: Object.values(err.errors).map((e) => e.message) });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Giá trị không hợp lệ: ' + err.path });
  if (err.code === 11000) return res.status(409).json({ message: 'Dữ liệu đã tồn tại', fields: Object.keys(err.keyValue || {}) });
  console.error(err);
  res.status(500).json({ message: 'Lỗi server' });
};

module.exports = { notFound, errorHandler };
