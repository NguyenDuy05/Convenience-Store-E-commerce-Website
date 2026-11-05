// Dòng hàng trả về: snapshot trong đơn + ảnh/đơn vị lấy từ Product (đơn cũ vẫn đúng giá, tên)
exports.toItem = (it) => {
  const product = it.productId && it.productId._id ? it.productId : null;
  return {
    productId: product ? product._id : null,
    name: it.name,
    sku: it.sku,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
    discountAmount: it.discountAmount || 0,
    lineTotal: it.lineTotal,
    image: product?.images?.[0] || null,
    unit: product?.unit || null,
  };
};
