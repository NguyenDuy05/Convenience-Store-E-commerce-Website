import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleAt = async (name) => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(`../src/utils/${name}.js`, import.meta.url), 'utf8')).toString('base64')}`);
const { productPhotos } = await moduleAt('catalogImages');
const { catalogLayout } = await moduleAt('catalogLayout');
const { imageUrl } = await moduleAt('domain');
test('phone and BlueStacks portrait viewports retain two readable product columns', () => {
  for (const width of [320, 360, 390, 430, 700, 720, 768]) {
    const grid = catalogLayout(width, 1280);
    assert.equal(grid.columns, 2);
    assert(grid.cardWidth >= 138);
    assert.equal(grid.cardWidth * 2 + grid.gap + grid.padding * 2, width);
  }
  assert.equal(catalogLayout(1024, 1366).columns, 3);
  assert.equal(catalogLayout(390, 844, 1.8).columns, 1);
});
test('assigned catalog images win; empty records use exact existing SKU/id associations only', () => {
  const assigned = ['/api/products/images/file/admin-photo.png'];
  assert.deepEqual(productPhotos({ sku: 'SP001', images: assigned }), assigned);
  assert.match(productPhotos({ sku: 'SP001', images: [] })[0], /SP001-snack-khoai-tay.png$/);
  assert.match(productPhotos({ productId: 'a5000000000000000000000f', image: null })[0], /SP015-sua-chua-uong.png$/);
  assert.deepEqual(productPhotos({ sku: 'UNRECOGNIZED', images: [] }), []);
  assert.deepEqual(productPhotos({ sku: 'UNRECOGNIZED', _id: 'a50000000000000000000001', images: [] }), []);
});
test('image links use the emulator-reachable API and do not double-encode library names', () => {
  const api = 'http://192.168.88.137:5000/api';
  assert.equal(imageUrl('http://localhost:5173/images/products/a%20b.png', api), 'http://192.168.88.137:5000/api/products/images/file/a%20b.png');
  assert.equal(imageUrl('/images/products/a%20b.png', api), 'http://192.168.88.137:5000/api/products/images/file/a%20b.png');
  assert.equal(imageUrl('https://cdn.example.com/a.png', api), 'https://cdn.example.com/a.png');
  assert.equal(imageUrl('/api/products/images/file/a%20b.png', api), 'http://192.168.88.137:5000/api/products/images/file/a%20b.png');
});
