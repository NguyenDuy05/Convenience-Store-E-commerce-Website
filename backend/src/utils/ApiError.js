// Ném lỗi có mã HTTP: throw new ApiError(404, 'Không tìm thấy sản phẩm')
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = ApiError;
