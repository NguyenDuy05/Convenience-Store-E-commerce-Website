const { Product, Category, StockBatch } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { log } = require('../services/activityLog.service');
const { sellableMap } = require('../services/stock.service');

const canManage = (req) => !!req.user && ['staff', 'admin'].includes(req.user.role);
const MEAL_TYPES = Product.schema.path('mealType').enumValues;
const SETTABLE_STATUS = ['active', 'inactive'];       // 'deleted' chỉ đặt qua Delete Product
const MAX_IMAGES = 8;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Bánh mì thịt" -> "banh-mi-thit"
const slugify = (text) => String(text)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'san-pham';

async function uniqueSlug(name, excludeId) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i += 1) slug = `${base}-${i}`;
  return slug;
}

const LOW_STOCK = { $expr: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] } };

// ---------- kiểm tra dữ liệu đầu vào ----------
const parsePrice = (v) => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isInteger(n) || n < 0 || n > 100000000) {
    throw new ApiError(400, "Price must be a whole VND amount from 0 to 100,000,000");
  }
  return n;
};

const cleanImages = require('../services/productImages.service').clean;

// Trả về các field hợp lệ từ body. partial=true (Update): chỉ kiểm tra field có gửi lên.
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
    out.barcode = bc || undefined;           // chuỗi rỗng -> bỏ (index unique sparse không nhận chuỗi rỗng trùng nhau)
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

const duplicateMessage = (err) => {
  const f = Object.keys(err.keyValue || {})[0];
  return f === 'sku' ? "SKU already exists" : f === 'barcode' ? "Barcode already exists" : "This record already exists";
};
const guardDuplicate = (err) => { if (err && err.code === 11000) throw new ApiError(409, duplicateMessage(err), { fields: Object.keys(err.keyValue || {}) }); throw err; };

// Khách/Guest chỉ thấy số lượng CÒN BÁN ĐƯỢC (lô chưa hết hạn), khớp với kiểm tra ở giỏ hàng/đặt hàng.
// Staff/Admin vẫn thấy stockQuantity thực tế trong kho (kể cả hàng quá hạn chờ xử lý).
const withSellableStock = async (products) => {
  const rows = products.map((p) => (p.toObject ? p.toObject() : p));
  const sellable = await sellableMap(rows.map((p) => p._id));
  return rows.map((p) => ({ ...p, stockQuantity: sellable.get(String(p._id)) ?? 0 }));
};

const loadProduct = async (id) => {
  const p = await Product.findOne({ _id: id, status: { $ne: 'deleted' } }).catch(() => null);   // id sai định dạng -> 404
  if (!p) throw new ApiError(404, "Product not found");
  return p;
};

// UC-02.1/02.3, 18.1/18.2, 32.1/32.2 View / Search Products
// Khách: chỉ thấy sản phẩm active, tìm bằng text index trên tên.
// Staff/Admin: thấy mọi sản phẩm chưa xóa; ?q= tìm theo tên / SKU / mã vạch; ?status=active|inactive;
// ?stock=low|out; ?withCounts=1 trả thêm counts cho các tab. ?sort=newest|price_asc|price_desc|name|stock
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
    if (q) filter.$text = { $search: q };          // dùng text index trên Product.name
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

// UC-02.2, 18.3, 32.3 View Product Details
// Staff/Admin thêm ?include=batches để lấy các lô tồn kho (hạn dùng) và lịch sử đổi giá có tên người đổi.
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

// UC-18.4, 32.4 Add Product. Tồn kho luôn bắt đầu từ 0: hàng vào kho qua Inventory (nhập lô), không nhập tay ở đây.
exports.createProduct = asyncHandler(async (req, res) => {
  const f = await readFields(req.body, { partial: false });
  const slug = await uniqueSlug(f.name);
  let product;
  try { product = await Product.create({ ...f, slug, status: f.status || 'active', stockQuantity: 0 }); } catch (err) { guardDuplicate(err); }
  await log(req, 'PRODUCT_CREATE', { type: 'Product', id: product._id }, { sku: product.sku, name: product.name, price: product.price });
  res.status(201).json(await product.populate('categoryId', 'name'));
});

// UC-18.5, 32.5 Update Product. Không đổi stockQuantity / slug. Đổi giá chỉ admin (có ghi lịch sử giá).
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
  if (f.barcode === undefined && 'barcode' in req.body) product.set('barcode', undefined);   // xóa mã vạch
  try { await product.save(); } catch (err) { guardDuplicate(err); }
  await log(req, 'PRODUCT_UPDATE', { type: 'Product', id: product._id }, { before, after: f });
  res.json(await product.populate('categoryId', 'name'));
});

// UC-32.6 Update Product Price. Body: { price, note? }. Ghi lịch sử giá; đơn cũ không đổi vì đã lưu giá chốt.
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

const setStatus = (next, action) => asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  if (product.status === next) throw new ApiError(409, next === 'active' ? "Product is now available for sale" : "Product is no longer available for sale");
  product.status = next;
  await product.save();
  await log(req, action, { type: 'Product', id: product._id }, { reason: String(req.body?.reason || '').slice(0, 200) });
  res.json(await product.populate('categoryId', 'name'));
});

// UC-32.8 Activate Product / UC-32.9 Deactivate Product (ẩn khỏi cửa hàng; giỏ hàng cũ hiện cảnh báo "ngừng bán")
exports.activateProduct = setStatus('active', 'PRODUCT_ACTIVATE');
exports.deactivateProduct = setStatus('inactive', 'PRODUCT_DEACTIVATE');

// UC-18.6, 32.7 Delete Product: xóa mềm để đơn cũ vẫn tham chiếu được
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.id);
  product.status = 'deleted';
  await product.save();
  await log(req, 'PRODUCT_DELETE', { type: 'Product', id: product._id }, { sku: product.sku, name: product.name });
  res.json({ message: "Product deleted" });
});
