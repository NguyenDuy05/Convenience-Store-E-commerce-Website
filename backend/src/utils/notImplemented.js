// Handler tạm cho API chưa làm. Trả 501 kèm tên use case để cả nhóm biết còn thiếu gì.
exports.notImplemented = (uc) => (req, res) =>
  res.status(501).json({ message: `Chưa triển khai: ${uc}` });
