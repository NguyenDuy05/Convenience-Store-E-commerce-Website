// Nhãn tiếng Việt cho yêu cầu hỗ trợ / khiếu nại (khớp enum trong backend/src/models/SupportRequest.js)
export const COMPLAINT_STATUS = {
  open: { label: 'Mới', tone: 'warn' },
  in_progress: { label: 'Đang xử lý', tone: 'info' },
  resolved: { label: 'Đã giải quyết', tone: 'success' },
};
export const COMPLAINT_TYPE = { complaint: 'Khiếu nại', support: 'Hỗ trợ' };
export const COMPLAINT_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'open', label: 'Mới' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'resolved', label: 'Đã giải quyết' },
];
// Nhãn nút/lựa chọn khi chuyển sang từng trạng thái
export const STATUS_ACTION = {
  in_progress: { label: 'Nhận xử lý', hint: 'Đánh dấu bạn đang xử lý yêu cầu này' },
  resolved: { label: 'Đã giải quyết', hint: 'Đóng yêu cầu, bắt buộc có phản hồi gửi khách' },
};
export const CUSTOMER_STATUS = { active: 'Hoạt động', locked: 'Bị khóa' };
