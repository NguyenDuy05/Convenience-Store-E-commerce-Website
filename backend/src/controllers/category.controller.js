const mongoose = require('mongoose');
const { Category, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/activity.service');

const slugify = (text) => String(text)
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

async function uniqueSlug(name, excludeId) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await Category.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i += 1) slug = `${base}-${i}`;
  return slug;
}

function parseBody(body = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  if (!name) throw new ApiError(400, 'Category name is required');
  if (name.length > 80) throw new ApiError(400, 'Category name must be 80 characters or fewer');
  const description = str(body.description);
  if (description.length > 500) throw new ApiError(400, 'Description must be 500 characters or fewer');
  const imageUrl = str(body.imageUrl);
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) throw new ApiError(400, 'Image must be an http(s) URL');
  const sortOrder = body.sortOrder === undefined || body.sortOrder === '' ? 0 : Number(body.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) throw new ApiError(400, 'Sort order must be an integer between 0 and 9999');
  const status = body.status === undefined ? 'active' : body.status;
  if (!['active', 'inactive'].includes(status)) throw new ApiError(400, 'Invalid status');
  return { name, description: description || undefined, imageUrl: imageUrl || undefined, sortOrder, status };
}

async function loadCategory(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Category not found');
  const c = await Category.findById(id);
  if (!c) throw new ApiError(404, 'Category not found');
  return c;
}

// UC-33.1 View Categories. Public: chỉ danh mục đang hoạt động. Admin thêm ?all=1 để xem cả danh mục ẩn, kèm số sản phẩm.
exports.listCategories = asyncHandler(async (req, res) => {
  const all = req.query.all === '1' && req.user?.role === 'admin';
  const categories = await Category.find(all ? {} : { status: 'active' }).sort({ sortOrder: 1, name: 1 }).lean();
  if (!all) return res.json(categories);
  const counts = await Product.aggregate([{ $match: { status: { $ne: 'deleted' } } }, { $group: { _id: '$categoryId', n: { $sum: 1 } } }]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(categories.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 })));
});

// UC-33.2 Add Category
exports.createCategory = asyncHandler(async (req, res) => {
  const data = parseBody(req.body);
  if (await Category.exists({ name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) {
    throw new ApiError(409, 'A category with this name already exists');
  }
  const c = await Category.create({ ...data, slug: await uniqueSlug(data.name) });
  await logActivity(req, { action: 'CATEGORY_ADD', targetType: 'Category', targetId: c._id, detail: { name: c.name } });
  res.status(201).json(c);
});

// UC-33.3 Update Category
exports.updateCategory = asyncHandler(async (req, res) => {
  const c = await loadCategory(req.params.id);
  const data = parseBody({ status: c.status, ...req.body });
  const clash = await Category.exists({ _id: { $ne: c._id }, name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (clash) throw new ApiError(409, 'A category with this name already exists');
  if (data.name !== c.name) c.slug = await uniqueSlug(data.name, c._id);
  Object.assign(c, data);
  await c.save();
  await logActivity(req, { action: 'CATEGORY_UPDATE', targetType: 'Category', targetId: c._id });
  res.json(c);
});

// UC-33.4 Delete Category: chỉ xóa khi không còn sản phẩm nào thuộc danh mục
exports.deleteCategory = asyncHandler(async (req, res) => {
  const c = await loadCategory(req.params.id);
  const n = await Product.countDocuments({ categoryId: c._id, status: { $ne: 'deleted' } });
  if (n > 0) throw new ApiError(409, `This category still has ${n} product(s). Move or delete them first.`);
  await c.deleteOne();
  await logActivity(req, { action: 'CATEGORY_DELETE', targetType: 'Category', targetId: c._id, detail: { name: c.name } });
  res.json({ message: 'Category deleted' });
});
