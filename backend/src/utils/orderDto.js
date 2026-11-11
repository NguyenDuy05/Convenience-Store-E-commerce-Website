// Dòng hàng trả về: giá, tên đã chốt trong đơn + ảnh, đơn vị lấy từ sản phẩm
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
