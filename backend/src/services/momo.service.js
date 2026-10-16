// TODO (module Payment): tích hợp Momo (sandbox).
exports.createPayment = async (/* { orderCode, amount } */) => {
  throw new Error('Chưa triển khai momo.createPayment');
};
exports.verifyCallback = (/* body */) => {
  throw new Error('Chưa triển khai momo.verifyCallback');    // kiểm tra chữ ký trước khi tin kết quả
};
