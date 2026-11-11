const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const images = require('../services/productImages.service');

// Gắn ảnh trong thư viện ảnh cho các sản phẩm chưa có ảnh (theo mã SKU)
async function main() {
  const apply = process.argv.includes('--apply');
  const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/products.json'), 'utf8'));
  const library = images.list();
  const matches = catalog.flatMap(product => {
    const candidates = library.filter(image => image.name.startsWith(product.sku + '-'));
    if (candidates.length !== 1) return [];
    return [{ sku: product.sku, id: product._id.$oid, url: candidates[0].url }];
  });
  await mongoose.connect(process.env.MONGODB_URI);
  let changed = 0;
  for (const item of matches) {
    const filter = { _id: item.id, sku: item.sku, status: { $ne: 'deleted' }, $or: [{ images: { $size: 0 } }, { images: { $exists: false } }, { images: null }] };
    if (apply) {
      const result = await Product.updateOne(filter, { $set: { images: [item.url] } }, { runValidators: true });
      if (result.modifiedCount) { changed++; console.log(`Attached ${item.sku}: ${item.url}`); }
    } else if (await Product.exists(filter)) {
      changed++; console.log(`Would attach ${item.sku}: ${item.url}`);
    }
  }
  console.log(`${apply ? 'Updated' : 'Would update'} ${changed} products. Existing assigned photos preserved.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
