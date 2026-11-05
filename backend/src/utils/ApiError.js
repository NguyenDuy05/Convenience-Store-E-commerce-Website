// Ném lỗi có mã HTTP: throw new ApiError(404, 'Không tìm thấy sản phẩm')
class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data; // (tuỳ chọn) object gộp vào JSON trả về, vd { code, issues }
  }
}
module.exports = ApiError;
