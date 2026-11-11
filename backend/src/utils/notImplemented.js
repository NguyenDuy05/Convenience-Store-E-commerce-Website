// Handler tạm cho API chưa làm (trả 501)
exports.notImplemented = (uc) => (req, res) =>
  res.status(501).json({ message: `Not implemented: ${uc}` });
