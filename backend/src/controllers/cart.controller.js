const { notImplemented } = require('../utils/notImplemented');
const { Cart, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { buildCartView, MAX_PER_ITEM } = require('../services/cart.service');

const parseQty = (v, label = 'Số lượng') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PER_ITEM) throw new ApiError(400, `${label} phải là số nguyên từ 1 đến ${MAX_PER_ITEM}`);
  return n;
};

const loadItems = async (userId) => (await Cart.findOne({ userId }).lean())?.items || [];
const saveItems = (userId, items) => Cart.updateOne({ userId }, { $set: { items } }, { upsert: true });

// Chỉ cho đặt số lượng không vượt tồn kho (BR-18)
const assertSellable = async (productId, quantity) => {
  const p = await Product.findOne({ _id: productId, status: 'active' }).lean();
  if (!p) throw new ApiError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  if (p.stockQuantity <= 0) throw new ApiError(409, `"${p.name}" đã hết hàng`);
  if (quantity > p.stockQuantity) throw new ApiError(409, `"${p.name}" chỉ còn ${p.stockQuantity} sản phẩm`);
};

// UC-07.1 View Cart (catalog tài liệu; code cũ ghi UC-08.1)
exports.getCart = asyncHandler(async (req, res) => {
  res.json(await buildCartView(req.user.id));
});

// UC-07.2 Add Product. Body: { productId, quantity = 1 }. Thêm lại sản phẩm đã có thì cộng dồn số lượng.
exports.addCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, 'Thiếu productId');
  const add = parseQty(req.body.quantity ?? 1);
  const items = await loadItems(req.user.id);
  const existing = items.find((i) => String(i.productId) === String(productId));
  const next = (existing ? existing.quantity : 0) + add;
  if (next > MAX_PER_ITEM) throw new ApiError(400, `Mỗi sản phẩm tối đa ${MAX_PER_ITEM} trong giỏ`);
  await assertSellable(productId, next);
  if (existing) existing.quantity = next; else items.push({ productId, quantity: add, addedAt: new Date() });
  await saveItems(req.user.id, items);
  res.status(201).json(await buildCartView(req.user.id));
});

// UC-07.3 Update Cart Item. Body: { quantity }. Muốn bỏ sản phẩm thì dùng DELETE.
exports.updateCartItem = asyncHandler(async (req, res) => {
  const quantity = parseQty(req.body.quantity);
  const items = await loadItems(req.user.id);
  const item = items.find((i) => String(i.productId) === String(req.params.productId));
  if (!item) throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng');
  await assertSellable(req.params.productId, quantity);
  item.quantity = quantity;
  await saveItems(req.user.id, items);
  res.json(await buildCartView(req.user.id));
});

// UC-07.4 Remove Cart Item
exports.removeCartItem = asyncHandler(async (req, res) => {
  const items = await loadItems(req.user.id);
  const next = items.filter((i) => String(i.productId) !== String(req.params.productId));
  if (next.length === items.length) throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng');
  await saveItems(req.user.id, next);
  res.json(await buildCartView(req.user.id));
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.getCartSuggestions = notImplemented('Tính năng đặc biệt: 4 giỏ hàng gợi ý theo ngân sách (ngoài catalog UC)');
