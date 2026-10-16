// TODO (module Payment): tích hợp VNPay (sandbox).
exports.createPaymentUrl = (/* { orderCode, amount, ipAddr } */) => {
  throw new Error('Chưa triển khai vnpay.createPaymentUrl');
};
exports.verifyCallback = (/* query */) => {
  throw new Error('Chưa triển khai vnpay.verifyCallback');   // kiểm tra chữ ký trước khi tin kết quả
};
