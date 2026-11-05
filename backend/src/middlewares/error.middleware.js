const ApiError = require('../utils/ApiError');

const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
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
