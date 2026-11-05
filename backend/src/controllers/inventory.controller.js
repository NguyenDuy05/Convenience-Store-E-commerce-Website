
const mongoose = require('mongoose');
const { Product, StockBatch, Stocktake, InventoryLog, Counter } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notImplemented } = require('../utils/notImplemented');

const objectId = (value) => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(400, 'Invalid ID');
  }
  return new mongoose.Types.ObjectId(value);
};

const quantity = (value, allowZero = false) => {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new ApiError(
      400,
      allowZero
        ? 'Quantity must be a non-negative integer'
        : 'Quantity must be a positive integer'
    );
  }
  return value;
};

const reason = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 500) {
    throw new ApiError(400, 'Reason is required (maximum 500 characters)');
  }
  return value.trim();
};

const paging = (query) => ({
  page: Math.min(Math.max(Number.parseInt(query.page, 10) || 1, 1), 100000),
  limit: Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100),
});

const productFilter = (query) => {
  const filter = { status: { $ne: 'deleted' } };

  if (typeof query.q === 'string' && query.q.trim()) {
    const term = query.q.trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { sku: { $regex: term, $options: 'i' } },
    ];
  }

  return filter;
};

async function sendProducts(filter, query, res) {
  const { page, limit } = paging(query);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select('name sku unit status stockQuantity lowStockThreshold')
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
}

async function withInventoryTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } catch (error) {
    if (/Transaction numbers are only allowed|replica set|mongos/i.test(error.message || '')) {
      throw new ApiError(
        503,
        'Inventory updates require MongoDB replica-set transactions'
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

async function findProduct(productId, session) {
  const product = await Product.findOne({
    _id: objectId(String(productId)),
    status: { $ne: 'deleted' },
  }).session(session);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return product;
}

async function checkBatchBalance(product, session) {
  const [row] = await StockBatch.aggregate([
    { $match: { productId: product._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]).session(session);

  if ((row?.total || 0) !== product.stockQuantity) {
    throw new ApiError(
      409,
      'Batch quantities do not match product stock; inventory reconciliation is required'
    );
  }
}

async function changeStock({
  product,
  delta,
  type,
  note,
  actor,
  session,
  batchId,
  stocktakeId,
}) {
  if (delta === 0) return product.stockQuantity;

  await checkBatchBalance(product, session);

  if (delta > 0) {
    if (batchId != null) {
      throw new ApiError(
        400,
        'Batch selection is not supported for positive adjustments'
      );
    }

    const [batch] = await StockBatch.create([{
      productId: product._id,
      receivedQuantity: delta,
      quantity: delta,
      receivedBy: actor,
    }], { session });

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $inc: { stockQuantity: delta } },
      { new: true, session }
    );

    await InventoryLog.create([{
      productId: product._id,
      batchId: batch._id,
      type,
      quantityChange: delta,
      quantityAfter: updated.stockQuantity,
      reason: note,
      performedBy: actor,
      stocktakeId,
    }], { session });

    return updated.stockQuantity;
  }

  let remaining = -delta;

  if (remaining > product.stockQuantity) {
    throw new ApiError(409, 'Insufficient stock');
  }

  const filter = {
    productId: product._id,
    quantity: { $gt: 0 },
  };

  if (batchId != null) {
    filter._id = objectId(String(batchId));
  }

  const batches = await StockBatch.find(filter)
    .session(session)
    .lean();

  batches.sort((a, b) =>
    (a.expiryDate?.getTime() ?? Infinity) -
    (b.expiryDate?.getTime() ?? Infinity)
  );

  const movements = [];

  for (const batch of batches) {
    if (remaining === 0) break;

    const amount = Math.min(batch.quantity, remaining);

    const updated = await StockBatch.updateOne(
      {
        _id: batch._id,
        productId: product._id,
        quantity: { $gte: amount },
      },
      { $inc: { quantity: -amount } },
      { session }
    );

    if (!updated.modifiedCount) {
      throw new ApiError(409, 'Stock changed during update; retry');
    }

    movements.push({
      batchId: batch._id,
      amount,
    });

    remaining -= amount;
  }

  if (remaining !== 0) {
    throw new ApiError(409, 'Insufficient stock in selected batches');
  }

  const updated = await Product.findOneAndUpdate(
    {
      _id: product._id,
      stockQuantity: { $gte: -delta },
    },
    { $inc: { stockQuantity: delta } },
    { new: true, session }
  );

  if (!updated) {
    throw new ApiError(409, 'Stock changed during update; retry');
  }

  let runningQuantity = product.stockQuantity;

  for (const movement of movements) {
    runningQuantity -= movement.amount;

    await InventoryLog.create([{
      productId: product._id,
      batchId: movement.batchId,
      type,
      quantityChange: -movement.amount,
      quantityAfter: runningQuantity,
      reason: note,
      performedBy: actor,
      stocktakeId,
    }], { session });
  }

  return updated.stockQuantity;
}

// UC-18.1 View Inventory / Check Stock
// GET /api/inventory
// Hiển thị tồn kho hiện tại và hỗ trợ tìm kiếm theo tên hoặc SKU.
exports.listInventory = asyncHandler(async (req, res) => {
  await sendProducts(productFilter(req.query), req.query, res);
});

// UC-18.2 Receive Stock
// POST /api/inventory/receive
// Ghi nhận lô hàng nhập mới, tăng tồn kho và lưu lịch sử.
exports.receiveStock = asyncHandler(async (req, res) => {
  const {
    productId,
    batchCode,
    expiryDate,
    costPrice,
  } = req.body || {};

  const received = quantity(req.body?.quantity);

  if (
    batchCode != null &&
    (typeof batchCode !== 'string' || batchCode.length > 100)
  ) {
    throw new ApiError(400, 'Invalid batch code');
  }

  if (
    costPrice != null &&
    (
      typeof costPrice !== 'number' ||
      !Number.isFinite(costPrice) ||
      costPrice < 0
    )
  ) {
    throw new ApiError(400, 'Invalid unit cost');
  }

  let expiry;

  if (expiryDate != null && expiryDate !== '') {
    if (
      typeof expiryDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ) {
      throw new ApiError(400, 'Expiry date must be YYYY-MM-DD');
    }

    const [year, month, day] = expiryDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== expiryDate
    ) {
      throw new ApiError(400, 'Invalid expiry date');
    }

    expiry = new Date(`${expiryDate}T23:59:59.999+07:00`);
  }

  const result = await withInventoryTransaction(async (session) => {
    const product = await findProduct(productId, session);

    await checkBatchBalance(product, session);

    const [batch] = await StockBatch.create([{
      productId: product._id,
      batchCode: batchCode?.trim() || undefined,
      receivedQuantity: received,
      quantity: received,
      expiryDate: expiry,
      costPrice,
      receivedBy: req.user.id,
    }], { session });

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $inc: { stockQuantity: received } },
      { new: true, session }
    );

    await InventoryLog.create([{
      productId: product._id,
      batchId: batch._id,
      type: 'receive',
      quantityChange: received,
      quantityAfter: updated.stockQuantity,
      reason: 'Stock received',
      performedBy: req.user.id,
    }], { session });

    return {
      batchId: batch._id,
      stockQuantity: updated.stockQuantity,
    };
  });

  res.status(201).json(result);
});

// UC-18.3 Adjust Inventory
// POST /api/inventory/adjust
// Điều chỉnh số lượng và bắt buộc ghi lý do.
exports.adjustInventory = asyncHandler(async (req, res) => {
  const {
    productId,
    quantityChange,
    batchId,
  } = req.body || {};

  if (
    !Number.isSafeInteger(quantityChange) ||
    quantityChange === 0
  ) {
    throw new ApiError(400, 'Adjustment must be a non-zero integer');
  }

  const note = reason(req.body.reason);

  const stockQuantity = await withInventoryTransaction(
    async (session) => {
      const product = await findProduct(productId, session);

      return changeStock({
        product,
        delta: quantityChange,
        type: 'adjust',
        note,
        actor: req.user.id,
        session,
        batchId,
      });
    }
  );

  res.json({
    message: 'Inventory adjusted successfully',
    stockQuantity,
  });
});

// UC-18.4 Stocktake
// GET /api/inventory/stocktakes
// Xem danh sách các phiên kiểm kê.
exports.listStocktakes = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);

  const [items, total] = await Promise.all([
    Stocktake.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Stocktake.countDocuments(),
  ]);

  res.json({ items, total, page, limit });
});

// UC-18.4 Create Stocktake
// POST /api/inventory/stocktakes
// Lưu số đếm thực tế và chênh lệch so với tồn kho hệ thống.
exports.createStocktake = asyncHandler(async (req, res) => {
  const entries = req.body?.items;

  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.length > 100
  ) {
    throw new ApiError(
      400,
      'Provide between 1 and 100 counted products'
    );
  }

  const ids = entries.map((entry) =>
    String(objectId(entry?.productId))
  );

  if (new Set(ids).size !== ids.length) {
    throw new ApiError(400, 'Duplicate products in stocktake');
  }

  entries.forEach((entry) => {
    quantity(entry?.countedQty, true);
  });

  const created = await withInventoryTransaction(
    async (session) => {
      const products = await Product.find({
        _id: { $in: ids },
        status: { $ne: 'deleted' },
      }).session(session);

      if (products.length !== entries.length) {
        throw new ApiError(404, 'Some products were not found');
      }

      const byId = new Map(
        products.map((product) => [
          String(product._id),
          product,
        ])
      );

      const counter = await Counter.findOneAndUpdate(
        { _id: 'stocktake' },
        { $inc: { seq: 1 } },
        {
          upsert: true,
          new: true,
          session,
        }
      );

      const [stocktake] = await Stocktake.create([{
        code: `ST-${String(counter.seq).padStart(6, '0')}`,
        performedBy: req.user.id,
        note: typeof req.body.note === 'string'
          ? req.body.note.trim().slice(0, 500)
          : '',
        items: entries.map((entry, index) => {
          const systemQty = byId.get(ids[index]).stockQuantity;

          return {
            productId: ids[index],
            systemQty,
            countedQty: entry.countedQty,
            difference: entry.countedQty - systemQty,
            note: typeof entry.note === 'string'
              ? entry.note.trim().slice(0, 500)
              : '',
          };
        }),
      }], { session });

      return stocktake;
    }
  );

  res.status(201).json(created);
});

// UC-18.4 Complete Stocktake
// PATCH /api/inventory/stocktakes/:id/complete
// Chỉ hoàn tất khi không có chênh lệch và tồn kho chưa thay đổi.
exports.completeStocktake = asyncHandler(async (req, res) => {
  await withInventoryTransaction(async (session) => {
    const stocktake = await Stocktake.findById(
      objectId(req.params.id)
    ).session(session);

    if (!stocktake) {
      throw new ApiError(404, 'Stocktake not found');
    }

    if (stocktake.status !== 'in_progress') {
      throw new ApiError(409, 'Stocktake already completed');
    }

    if (
      stocktake.items.some((item) => item.difference !== 0)
    ) {
      throw new ApiError(
        409,
        'Stocktake variance requires an approved reconciliation workflow'
      );
    }

    for (const entry of stocktake.items) {
      const product = await findProduct(
        entry.productId,
        session
      );

      if (product.stockQuantity !== entry.systemQty) {
        throw new ApiError(
          409,
          'Stock has changed since counting; create a new stocktake'
        );
      }

      await checkBatchBalance(product, session);
    }

    stocktake.status = 'completed';
    stocktake.completedAt = new Date();

    await stocktake.save({ session });

    for (const entry of stocktake.items) {
      await InventoryLog.create([{
        productId: entry.productId,
        type: 'stocktake',
        quantityChange: 0,
        quantityAfter: entry.systemQty,
        reason: `Stocktake ${stocktake.code}: no variance`,
        performedBy: req.user.id,
        stocktakeId: stocktake._id,
      }], { session });
    }
  });

  res.json({
    message: 'Stocktake completed',
  });
});

// UC-18.5 View Low Stock Products
// GET /api/inventory/low-stock
// Xem sản phẩm có tồn kho bằng hoặc thấp hơn ngưỡng cảnh báo.
exports.listLowStock = asyncHandler(async (req, res) => {
  await sendProducts(
    {
      ...productFilter(req.query),
      $expr: {
        $lte: [
          '$stockQuantity',
          '$lowStockThreshold',
        ],
      },
    },
    req.query,
    res
  );
});

// UC-18.6 View Expired Products
// GET /api/inventory/expired
// Xem lô còn hàng nhưng đã hết hạn, đồng thời báo số lô thiếu hạn dùng.
exports.listExpired = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);

  const filter = {
    quantity: { $gt: 0 },
    expiryDate: { $lt: new Date() },
  };

  const [
    items,
    total,
    unknownExpiryCount,
  ] = await Promise.all([
    StockBatch.find(filter)
      .populate('productId', 'name sku unit')
      .sort({ expiryDate: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StockBatch.countDocuments(filter),
    StockBatch.countDocuments({
      quantity: { $gt: 0 },
      expiryDate: null,
    }),
  ]);

  res.json({
    items,
    total,
    page,
    limit,
    unknownExpiryCount,
  });
});

// UC-18.7 View Damaged Products
// GET /api/inventory/damaged
// Xem lịch sử ghi nhận sản phẩm hư hỏng.
exports.listDamaged = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);

  const filter = {
    type: 'damaged',
  };

  const [items, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('productId', 'name sku unit')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryLog.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    limit,
  });
});

// UC-18.7 Record Damaged Products
// POST /api/inventory/damaged
// Trừ hàng hư hỏng và ghi lịch sử thay đổi.
exports.recordDamaged = asyncHandler(async (req, res) => {
  const {
    productId,
    batchId,
  } = req.body || {};

  const damagedQuantity = quantity(req.body?.quantity);
  const note = reason(req.body.reason);

  const stockQuantity = await withInventoryTransaction(
    async (session) => {
      const product = await findProduct(productId, session);

      return changeStock({
        product,
        delta: -damagedQuantity,
        type: 'damaged',
        note,
        actor: req.user.id,
        session,
        batchId,
      });
    }
  );

  res.status(201).json({
    message: 'Damaged stock recorded',
    stockQuantity,
  });
});

// Các chức năng Inventory History và Out of Stock của Admin
exports.listOutOfStock = notImplemented(
  'UC-33.5 View Out of Stock Products'
);

exports.getInventoryHistory = notImplemented(
  'UC-33.6 View Inventory History'
);
