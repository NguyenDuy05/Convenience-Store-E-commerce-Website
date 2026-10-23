
const mongoose = require('mongoose');
const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notImplemented } = require('../utils/notImplemented');

const toProductId = (value) => {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, 'Invalid product ID');
  }
  return new mongoose.Types.ObjectId(value);
};

const toQuantity = (value) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ApiError(400, 'Quantity must be a positive integer');
  }
  return value;
};

async function readCart(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart) return { items: [], totalQuantity: 0, subtotal: 0 };

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.productId) },
  }).select('name description images unit price status stockQuantity').lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const items = cart.items.map((item) => {
    const productId = String(item.productId);
    const product = byId.get(productId) || null;
    return {
      productId,
      product,
      quantity: item.quantity,
      lineTotal: product ? product.price * item.quantity : 0,
      available: Boolean(product && product.status === 'active' && product.stockQuantity >= item.quantity),
    };
  });

  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

// UC-08.1 View Cart
// GET /api/cart
// Lấy giỏ theo tài khoản đăng nhập; giá và tồn kho lấy từ Product.
exports.getCart = asyncHandler(async (req, res) => {
  res.json(await readCart(req.user.id));
});

// UC-08.2 Add Product to Cart
// POST /api/cart/items
// Thêm sản phẩm hoặc cộng số lượng nếu đã có, không vượt tồn kho.
exports.addCartItem = asyncHandler(async (req, res) => {
  const productId = toProductId(req.body?.productId);
  const quantity = toQuantity(req.body?.quantity ?? 1);
  const product = await Product.findOne({ _id: productId, status: 'active' }).lean();

  if (!product) throw new ApiError(404, 'Product is unavailable');
  if (quantity > product.stockQuantity) throw new ApiError(409, 'Quantity exceeds available stock');

  try {
    await Cart.updateOne(
      { userId: req.user.id },
      { $setOnInsert: { userId: req.user.id, items: [] } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const increment = await Cart.updateOne(
    {
      userId: req.user.id,
      items: { $elemMatch: { productId, quantity: { $lte: product.stockQuantity - quantity } } },
    },
    { $inc: { 'items.$.quantity': quantity } }
  );

  if (!increment.modifiedCount) {
    const insert = await Cart.updateOne(
      { userId: req.user.id, 'items.productId': { $ne: productId } },
      { $push: { items: { productId, quantity } } }
    );
    if (!insert.modifiedCount) throw new ApiError(409, 'Cart quantity exceeds available stock');
  }

  res.json(await readCart(req.user.id));
});

// UC-08.3 Update Cart Item
// PUT /api/cart/items/:productId
// Đổi số lượng của một sản phẩm; khi tăng phải kiểm tra tồn kho.
exports.updateCartItem = asyncHandler(async (req, res) => {
  const productId = toProductId(req.params.productId);
  const quantity = toQuantity(req.body?.quantity);
  const cart = await Cart.findOne(
    { userId: req.user.id, 'items.productId': productId },
    { 'items.$': 1 }
  ).lean();

  const current = cart?.items?.[0];
  if (!current) throw new ApiError(404, 'Product is not in your cart');

  if (quantity > current.quantity) {
    const product = await Product.findOne({ _id: productId, status: 'active' }).lean();
    if (!product) throw new ApiError(409, 'Product is unavailable');
    if (quantity > product.stockQuantity) throw new ApiError(409, 'Quantity exceeds available stock');
  }

  const result = await Cart.updateOne(
    { userId: req.user.id, items: { $elemMatch: { productId, quantity: current.quantity } } },
    { $set: { 'items.$.quantity': quantity } }
  );
  if (!result.matchedCount) throw new ApiError(409, 'Cart has changed. Please try again');

  res.json(await readCart(req.user.id));
});

// UC-08.4 Remove Cart Item
// DELETE /api/cart/items/:productId
// Chỉ xóa sản phẩm khỏi giỏ của tài khoản đang đăng nhập.
exports.removeCartItem = asyncHandler(async (req, res) => {
  const productId = toProductId(req.params.productId);
  const result = await Cart.updateOne(
    { userId: req.user.id, 'items.productId': productId },
    { $pull: { items: { productId } } }
  );
  if (!result.modifiedCount) throw new ApiError(404, 'Product is not in your cart');
  res.json(await readCart(req.user.id));
});

exports.getCartSuggestions = notImplemented('Budget cart suggestions');
