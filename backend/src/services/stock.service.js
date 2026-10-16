// Quản lý tồn kho theo lô (StockBatch). Dùng chung cho Order, Inventory.
// TODO (module Inventory/Order): cài đặt hai hàm dưới, chạy trong MongoDB transaction (cần replica set, Atlas có sẵn).

// Trừ kho khi tạo đơn: lấy từ lô hết hạn sớm nhất trước (FEFO), ghi InventoryLog type 'sale',
// cập nhật Product.stockQuantity. Ném lỗi nếu không đủ hàng.
exports.deductStock = async (/* items, { orderId, userId, session } */) => {
  throw new Error('Chưa triển khai stock.service.deductStock');
};

// Hoàn kho khi thanh toán online thất bại / hết hạn: ghi InventoryLog type 'release'.
exports.releaseStock = async (/* orderId, { session } */) => {
  throw new Error('Chưa triển khai stock.service.releaseStock');
};
