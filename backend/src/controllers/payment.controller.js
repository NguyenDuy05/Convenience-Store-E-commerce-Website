const { notImplemented } = require('../utils/notImplemented');

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.createOnlinePayment = notImplemented('UC-09.2 Make Payment (tạo link VNPay/Momo)');
exports.vnpayReturn = notImplemented('VNPay chuyển hướng trình duyệt về sau khi thanh toán');
exports.vnpayIpn = notImplemented('VNPay gọi server báo kết quả (IPN)');
exports.momoIpn = notImplemented('Momo gọi server báo kết quả (IPN)');
exports.processCashPayment = notImplemented('UC-23.1 Process Cash Payment');
exports.processCardPayment = notImplemented('UC-23.2 Process Card/E-wallet Payment');
exports.listPayments = notImplemented('UC-41.1 View Payment Transactions');
exports.listFailedPayments = notImplemented('UC-41.2 View Failed Payments');
exports.listPendingPayments = notImplemented('UC-41.3 View Pending Payments');
exports.handlePaymentError = notImplemented('UC-41.4 Handle Payment Error');
