// UC-09, UC-10, UC-22, UC-35. Đơn nhận tại cửa hàng (không giao hàng).
// Không có trạng thái cancelled/refunded vì catalog đã bỏ Cancel Order và Refund.
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Snapshot sản phẩm tại thời điểm đặt: đổi giá / đổi tên / xóa Product sau này không làm sai đơn cũ
const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: String,
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  discountAmount: { type: Number, default: 0, min: 0 },     // giảm giá khuyến mãi áp trên dòng này
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

// UC-10.3 Track Order Status
const statusHistorySchema = new Schema({
  status: String,
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  note: String,
}, { _id: false });

// UC-35.4 Handle Order Issue
const issueSchema = new Schema({
  description: { type: String, required: true },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
  resolvedAt: Date,
}, { timestamps: true });

const orderSchema = new Schema({
  orderCode: { type: String, required: true, unique: true },   // dạng CM-20261008-0001 (dùng Counter), khách đọc cho nhân viên khi nhận hàng
  source: { type: String, enum: ['online', 'store'], required: true },
  customerId: {                                                // khách vãng lai mua tại quầy (UC-22) thì để trống
    type: Schema.Types.ObjectId, ref: 'User', index: true,
    required: function () { return this.source === 'online'; },
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },     // staff tạo đơn tại quầy (UC-22)

  items: { type: [orderItemSchema], validate: v => v.length > 0 },

  subtotal: { type: Number, required: true, min: 0 },
  appliedPromotions: [{                                        // UC-21.2 Apply Promotion
    promotionId: { type: Schema.Types.ObjectId, ref: 'Promotion' },
    name: String,
    amount: Number,
    _id: false,
  }],
  promotionDiscount: { type: Number, default: 0, min: 0 },
  discountCode: {
    codeId: { type: Schema.Types.ObjectId, ref: 'DiscountCode' },
    code: String,
    amount: { type: Number, default: 0 },
  },
  pointsUsed: { type: Number, default: 0, min: 0 },            // đổi điểm thành tiền giảm trực tiếp
  pointsDiscount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  pointsEarned: { type: Number, default: 0, min: 0 },

  // pending_payment: chờ khách thanh toán online | confirmed: đã xác nhận (đã trả, hoặc chọn trả tiền mặt khi nhận)
  // preparing: cửa hàng đang chuẩn bị | ready_for_pickup: chờ khách đến lấy | completed: đã giao khách
  // failed: thanh toán online lỗi / hết hạn (hệ thống tự chuyển, không phải khách hủy)
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'failed'],
    default: 'pending_payment',
    index: true,
  },
  statusHistory: [statusHistorySchema],

  paymentMethod: { type: String, enum: ['cash', 'card', 'vnpay', 'momo'] },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },
  paidAt: Date,

  customerNote: String,
  readyAt: Date,
  pickedUpAt: Date,
  issues: [issueSchema],
}, { timestamps: true });

orderSchema.index({ customerId: 1, createdAt: -1 });         // UC-10.1 / 10.4 lịch sử đơn + giỏ gợi ý cá nhân hóa
orderSchema.index({ 'items.productId': 1 });                 // gợi ý "Combo hot" / best-seller
orderSchema.index({ status: 1, createdAt: -1 });             // UC-35.1 / 35.2

module.exports = mongoose.model('Order', orderSchema);
