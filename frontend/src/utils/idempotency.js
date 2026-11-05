// Khoá chống đặt trùng cho mỗi lần bấm "Đặt hàng"
export const newIdempotencyKey = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(16).slice(2)}`);
