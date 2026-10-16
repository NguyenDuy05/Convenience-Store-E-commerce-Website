// Bọc controller async để lỗi tự chuyển sang error middleware (khỏi viết try/catch)
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
