
const mongoose = require('mongoose');
const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notImplemented } = require('../utils/notImplemented');
const { buildCartView, MAX_PER_ITEM } = require('../services/cart.service');

const toProductId = (value) => {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, 'Invalid product ID');
  }
  return new mongoose.Types.ObjectId(value);
};

const toQuantity = (value) => {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_PER_ITEM
  ) {
    throw new ApiError(
      400,
      `Quantity must be an integer between 1 and ${MAX_PER_ITEM}`
    );
  }
  return value;
};

const readCart = buildCartView;

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

  const product = await Product.findOne({
    _id: productId,
    status: 'active',
  }).lean();

  if (!product) {
    throw new ApiError(404, 'Product is unavailable');
  }

  const maxAllowed = Math.min(product.stockQuantity, MAX_PER_ITEM);

  if (quantity > maxAllowed) {
    throw new ApiError(409, 'Quantity exceeds available stock or cart limit');
  }

  try {
    await Cart.updateOne(
      { userId: req.user.id },
      {
        $setOnInsert: {
          userId: req.user.id,
          items: [],
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const increment = await Cart.updateOne(
    {
      userId: req.user.id,
      items: {
        $elemMatch: {
          productId,
          quantity: { $lte: maxAllowed - quantity },
        },
      },
    },
    {
      $inc: {
        'items.$.quantity': quantity,
      },
    }
  );

  if (!increment.modifiedCount) {
    const insert = await Cart.updateOne(
      {
        userId: req.user.id,
        'items.productId': { $ne: productId },
      },
      {
        $push: {
          items: { productId, quantity },
        },
      }
    );

    if (!insert.modifiedCount) {
      throw new ApiError(
        409,
        'Cart quantity exceeds available stock or cart limit'
      );
    }
  }

  res.status(201).json(await readCart(req.user.id));
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
