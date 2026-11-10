const { notImplemented } = require('../utils/notImplemented');
const { Cart, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { buildCartView, MAX_PER_ITEM, mutateCart } = require('../services/cart.service');
const { sellableMap } = require('../services/stock.service');

const parseQty = (v, label = "Quantity") => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PER_ITEM) throw new ApiError(400, `${label} must be an integer from 1 to ${MAX_PER_ITEM}`);
  return n;
};


// Chỉ cho đặt số lượng không vượt tồn kho (BR-18)
const assertSellable = async (productId, quantity) => {
  const p = await Product.findOne({ _id: productId, status: 'active' }).lean();
  if (!p) throw new ApiError(404, "Product not found or no longer available");
  const available = (await sellableMap([p._id])).get(String(p._id)) ?? 0;   // không tính hàng đã quá hạn
  if (available <= 0) throw new ApiError(409, `"${p.name}" is out of stock`);
  if (quantity > available) throw new ApiError(409, `"${p.name}" only has ${available} items available`);
};

// UC-07.1 View Cart (catalog tài liệu; code cũ ghi UC-08.1)
exports.getCart = asyncHandler(async (req, res) => {
  res.json(await buildCartView(req.user.id));
});

// UC-07.2 Add Product. Body: { productId, quantity = 1 }. Thêm lại sản phẩm đã có thì cộng dồn số lượng.
exports.addCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, "productId is required");
  const add = parseQty(req.body.quantity ?? 1);
  await mutateCart(req.user.id, async items => {
  const existing = items.find((i) => String(i.productId) === String(productId));
  const next = (existing ? existing.quantity : 0) + add;
  if (next > MAX_PER_ITEM) throw new ApiError(400, `Each product may have at most ${MAX_PER_ITEM} in the cart`);
  await assertSellable(productId, next);
  if (existing) existing.quantity = next; else items.push({ productId, quantity: add, addedAt: new Date() });
  return items;
  });
  res.status(201).json(await buildCartView(req.user.id));
});

// UC-07.3 Update Cart Item. Body: { quantity }. Muốn bỏ sản phẩm thì dùng DELETE.
exports.updateCartItem = asyncHandler(async (req, res) => {
  const quantity = parseQty(req.body.quantity);
  await mutateCart(req.user.id, async items => {
  const item = items.find((i) => String(i.productId) === String(req.params.productId));
  if (!item) throw new ApiError(404, "This product is not in the cart");
  await assertSellable(req.params.productId, quantity);
  item.quantity = quantity;
  return items;
  });
  res.json(await buildCartView(req.user.id));
});

// UC-07.4 Remove Cart Item
exports.removeCartItem = asyncHandler(async (req, res) => {
  await mutateCart(req.user.id, async items => {
  const next = items.filter((i) => String(i.productId) !== String(req.params.productId));
  if (next.length === items.length) throw new ApiError(404, "This product is not in the cart");
  return next;
  });
  res.json(await buildCartView(req.user.id));
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.getCartSuggestions = notImplemented("Budget-based cart suggestions");
