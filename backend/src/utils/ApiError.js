// Lỗi nghiệp vụ có mã HTTP và dữ liệu kèm theo
class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
module.exports = ApiError;
