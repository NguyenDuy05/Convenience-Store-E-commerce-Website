const { Product, Category, StockBatch } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { log } = require('../services/activityLog.service');
const { sellableMap } = require('../services/stock.service');

// Người gọi có phải staff/admin không
const canManage = (req) => !!req.user && ['staff', 'admin'].includes(req.user.role);
const MEAL_TYPES = Product.schema.path('mealType').enumValues;
const SETTABLE_STATUS = ['active', 'inactive'];
const MAX_IMAGES = 8;

// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Tạo slug từ tên sản phẩm (bỏ dấu, nối bằng gạch ngang)
const slugify = (text) => String(text)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'san-pham';

// Tạo slug không trùng (thêm hậu tố số nếu đã có)
async function uniqueSlug(name, excludeId) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i += 1) slug = `${base}-${i}`;
  return slug;
}

const LOW_STOCK = { $expr: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] } };

// Kiểm tra giá bán là số nguyên hợp lệ
const parsePrice = (v) => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isInteger(n) || n < 0 || n > 100000000) {
    throw new ApiError(400, "Price must be a whole VND amount from 0 to 100,000,000");
  }
  return n;
};

const cleanImages = require('../services/productImages.service').clean;

// Đọc và kiểm tra các trường sản phẩm gửi lên (partial = chỉ kiểm tra trường có gửi)
async function readFields(body, { partial, existingImages = [] }) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  const need = (k, label) => { if (!partial && (!has(k) || body[k] === '')) throw new ApiError(400, `Please enter ${label}`); };

  need('name', "product name");
  if (has('name')) {
    out.name = String(body.name).trim();
    if (!out.name || out.name.length > 120) throw new ApiError(400, "Product name must contain 1–120 characters");
  }
  need('sku', "SKU");
  if (has('sku')) {
    out.sku = String(body.sku).trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(out.sku)) throw new ApiError(400, "SKU must contain 2–40 letters, digits, dashes, underscores or periods");
  }
  if (has('barcode')) {
    const bc = String(body.barcode || '').trim();
    out.barcode = bc || undefined;
    if (bc && !/^\d{8,14}$/.test(bc)) throw new ApiError(400, "Barcode must contain 8–14 digits");
  }
  need('categoryId', "category");
  if (has('categoryId')) {
    const cat = await Category.findById(body.categoryId).select('_id').lean().catch(() => null);
    if (!cat) throw new ApiError(400, "Category not found");
    out.categoryId = cat._id;
  }
  need('price', "selling price");
  if (has('price')) out.price = parsePrice(body.price);
  need('mealType', "meal type");
  if (has('mealType')) {
    if (!MEAL_TYPES.includes(body.mealType)) throw new ApiError(400, `Meal type must be one of: ${MEAL_TYPES.join(', ')}`);
    out.mealType = body.mealType;
  }
  if (has('unit')) out.unit = String(body.unit || '').trim().slice(0, 30) || 'cái';
  if (has('description')) out.description = String(body.description || '').trim().slice(0, 2000);
  if (has('images')) out.images = cleanImages(body.images, existingImages);
  if (has('lowStockThreshold')) {
    const n = Number(body.lowStockThreshold);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw new ApiError(400, "Low-stock threshold must be a non-negative integer");
    out.lowStockThreshold = n;
  }
  if (has('status')) {
    if (!SETTABLE_STATUS.includes(body.status)) throw new ApiError(400, "Status must be active or inactive");
    out.status = body.status;
  }
  return out;
}

// Thông báo lỗi khi SKU / mã vạch bị trùng
const duplicateMessage = (err) => {
  const f = Object.keys(err.keyValue || {})[0];
  return f === 'sku' ? "SKU already exists" : f === 'barcode' ? "Barcode already exists" : "This record already exists";
};
// Đổi lỗi trùng khóa của MongoDB thành lỗi 409 dễ hiểu
const guardDuplicate = (err) => { if (err && err.code === 11000) throw new ApiError(409, duplicateMessage(err), { fields: Object.keys(err.keyValue || {}) }); throw err; };

// Khách chỉ thấy số lượng còn bán được (không tính lô đã hết hạn)
const withSellableStock = async (products) => {
  const rows = products.map((p) => (p.toObject ? p.toObject() : p));
  const sellable = await sellableMap(rows.map((p) => p._id));
  return rows.map((p) => ({ ...p, stockQuantity: sellable.get(String(p._id)) ?? 0 }));
};

// Lấy sản phẩm chưa bị xóa theo id (404 nếu không có)
const loadProduct = async (id) => {
  const p = await Product.findOne({ _id: id, status: { $ne: 'deleted' } }).catch(() => null);
  if (!p) throw new ApiError(404, "Product not found");
  return p;
};

// UC-02.1/18.1/32.1 Xem / tìm sản phẩm (khách: chỉ sản phẩm đang bán; staff/admin: lọc thêm trạng thái, tồn kho)
exports.listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
  const { q, categoryId, status, stock, sort } = req.query;
  const manage = canManage(req);

  const filter = {};
  if (manage) {
    filter.status = ['active', 'inactive'].includes(status) ? status : { $ne: 'deleted' };
    if (stock === 'out') filter.stockQuantity = 0;
    if (stock === 'low') Object.assign(filter, LOW_STOCK);
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ name: rx }, { sku: rx }, { barcode: rx }];
    }
  } else {
    filter.status = 'active';
    if (q) filter.$text = { $search: q };
  }
  if (categoryId) filter.categoryId = categoryId;

  const SORTS = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, name: { name: 1 }, stock: { stockQuantity: 1 } };
  const order = manage && SORTS[sort] ? SORTS[sort] : { createdAt: 1 };

  const [items, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').sort({ ...order, _id: 1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  const body = { items: manage ? items : await withSellableStock(items), total, page, limit };
  if (manage && req.query.withCounts) {
    const live = { status: { $ne: 'deleted' } };
    const [all, active, inactive, low, out] = await Promise.all([
      Product.countDocuments(live),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'inactive' }),
      Product.countDocuments({ ...live, ...LOW_STOCK }),
      Product.countDocuments({ ...live, stockQuantity: 0 }),
    ]);
    body.counts = { all, active, inactive, low, out };
  }
  res.json(body);
});

// UC-02.2/18.3/32.3 Chi tiết sản phẩm (staff/admin có thể kèm các lô và lịch sử giá)
exports.getProduct = asyncHandler(async (req, res) => {
  const manage = canManage(req);
  const status = manage ? { $ne: 'deleted' } : 'active';
  let query = Product.findOne({ _id: req.params.id, status }).populate('categoryId', 'name');
  if (manage && req.query.include === 'batches') query = query.populate('priceHistory.changedBy', 'fullName');
  const product = await query.catch(() => null);
  if (!product) throw new ApiError(404, "Product not found");
  if (!manage) return res.json((await withSellableStock([product]))[0]);
  if (req.query.include !== 'batches') return res.json(product);

  const batches = await StockBatch.find({ productId: product._id }).sort({ expiryDate: 1, receivedAt: 1 }).lean();
  res.json({ ...product.toObject(), batches });
});

// UC-18.4/32.4 Thêm sản phẩm (tồn kho bắt đầu từ 0, nhập hàng qua Inventory)
exports.createProduct = asyncHandler(async (req, res) => {
  const f = await readFields(req.body, { partial: false });
  const slug = await uniqueSlug(f.name);
  let product;
  try { product = await Product.create({ ...f, slug, status: f.status || 'active', stockQuantity: 0 }); } catch (err) { guardDuplicate(err); }
  await log(req, 'PRODUCT_CREATE', { type: 'Product', id: product._id }, { sku: product.sku, name: product.name, price: product.price });
  res.status(201).json(await product.populate('categoryId', 'name'));
});

// UC-18.5/32.5 Sửa sản phẩm (đổi giá chỉ admin)
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  const f = await readFields(req.body, { partial: true, existingImages: (await Product.findById(req.params.id).select('images').lean())?.images || [] });
  if (!Object.keys(f).length) throw new ApiError(400, "No changes were provided");

  if (f.price !== undefined && f.price !== product.price) {
    if (req.user.role !== 'admin') throw new ApiError(403, "Only admins may change product prices");
    product.priceHistory.push({ oldPrice: product.price, newPrice: f.price, changedBy: req.user.id });
  }
  if (f.status !== undefined && f.status !== product.status && req.user.role !== 'admin') throw new ApiError(403, "Only admins may activate or deactivate products");
  const before = { name: product.name, sku: product.sku, price: product.price, status: product.status };
  Object.entries(f).forEach(([k, v]) => { product.set(k, v); });
  if (f.barcode === undefined && 'barcode' in req.body) product.set('barcode', undefined);
  try { await product.save(); } catch (err) { guardDuplicate(err); }
  await log(req, 'PRODUCT_UPDATE', { type: 'Product', id: product._id }, { before, after: f });
  res.json(await product.populate('categoryId', 'name'));
});

// UC-32.6 Admin đổi giá bán và ghi lịch sử giá
exports.updateProductPrice = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  const price = parsePrice(req.body.price);
  if (price === product.price) throw new ApiError(400, "The new price is the same as the current price");
  const oldPrice = product.price;
  product.priceHistory.push({ oldPrice, newPrice: price, changedBy: req.user.id });
  product.price = price;
  await product.save();
  await log(req, 'PRODUCT_PRICE_UPDATE', { type: 'Product', id: product._id }, { oldPrice, newPrice: price, note: String(req.body.note || '').slice(0, 200) });
  res.json(await product.populate('categoryId', 'name'));
});

// Tạo handler bật / tắt bán sản phẩm
const setStatus = (next, action) => asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  if (product.status === next) throw new ApiError(409, next === 'active' ? "Product is now available for sale" : "Product is no longer available for sale");
  product.status = next;
  await product.save();
  await log(req, action, { type: 'Product', id: product._id }, { reason: String(req.body?.reason || '').slice(0, 200) });
  res.json(await product.populate('categoryId', 'name'));
});

exports.activateProduct = setStatus('active', 'PRODUCT_ACTIVATE');
exports.deactivateProduct = setStatus('inactive', 'PRODUCT_DEACTIVATE');

// UC-18.6/32.7 Xóa mềm sản phẩm (đơn cũ vẫn tham chiếu được)
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  product.status = 'deleted';
  await product.save();
  await log(req, 'PRODUCT_DELETE', { type: 'Product', id: product._id }, { sku: product.sku, name: product.name });
  res.json({ message: "Product deleted" });
});
