/* Read the live public catalog; all writes go to a disposable homepage_qa_* database.
   Run from the repository root: node docs/homepage-check.cjs
   PLAYWRIGHT_MODULE may point to an existing local Playwright installation. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const backend = createRequire(path.join(root, 'backend/package.json'));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'convenience-store-ui-qa/node_modules/playwright'));
backend('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const mongoose = backend('mongoose');
const output = path.join(root, 'docs/homepage-review');
const results = [], errors = [], orderRequests = [];
const dbName = 'homepage_qa_' + randomUUID().replaceAll('-', '');
let browser, server, testPage;
const wait = (page, ms = 800) => page.waitForTimeout(ms);
const check = async (name, task) => {
  try { await task(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.message }); throw error; }
};

(async () => {
  await fs.mkdir(output, { recursive: true });
  const live = async (url) => { const response = await fetch('http://localhost:5000/api/' + url); assert(response.ok); return response.json(); };
  const [catalog, categories, stores, offers] = await Promise.all([live('products?limit=100'), live('categories'), live('stores'), live('promotions')]);
  assert(catalog.items.length >= 3, 'At least three public products are needed for this check.');
  process.env.SMTP_HOST = '';
  process.env.JWT_SECRET = randomUUID();
  delete process.env.FRONTEND_URL;
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  const models = backend('./src/models');
  await models.Category.insertMany(categories);
  const products = catalog.items.map((product, index) => ({ ...product, categoryId: product.categoryId._id || product.categoryId, stockQuantity: index === 2 ? 0 : 20 }));
  await models.Product.insertMany(products);
  await models.StockBatch.insertMany(products.filter((p) => p.stockQuantity > 0).map((p) => ({ productId: p._id, receivedQuantity: 20, quantity: 20, expiryDate: new Date(Date.now() + 86400000 * 365) })));
  await models.Store.insertMany(stores);
  await models.Promotion.insertMany((offers.items || []).map((offer) => ({ ...offer, status: 'active', categoryIds: (offer.categories || []).map((c) => c._id), productIds: (offer.products || []).map((p) => p._id) })));
  const email = 'homepage-qa@example.invalid', password = 'Homepage-QA-only-2468';
  const user = await models.User.create({ fullName: 'Homepage QA', email, passwordHash: await backend('bcryptjs').hash(password, 10), role: 'customer' });
  const app = backend('./src/app');
  server = await new Promise((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  const api = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  testPage = page;
  page.on('pageerror', (e) => errors.push(e.message));
  let failCatalog = false, emptyCatalog = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (request.method() === 'POST' && /\/api\/(orders|payments)/.test(url.pathname)) orderRequests.push(url.pathname);
    if (url.pathname === '/api/products' && (failCatalog || emptyCatalog)) {
      return route.fulfill({ status: failCatalog ? 503 : 200, json: failCatalog ? { message: 'QA unavailable' } : { items: [], total: 0 } });
    }
    const response = await route.fetch({ url: api + url.pathname + url.search });
    await route.fulfill({ response });
  });
  const home = async () => { await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await page.locator('.aisle-product').first().waitFor(); await page.evaluate(() => document.fonts.ready); await wait(page); };
  const triggers = (all = false) => page.evaluate(async (all) => {
    const url = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/gsap_ScrollTrigger.js'))?.name;
    return url ? (await import(url)).ScrollTrigger.getAll().filter((trigger) => String(trigger.vars.id || '').startsWith('quick-') && (all || trigger.vars.id !== 'quick-reveal')).length : -1;
  }, all);
  await check('Real catalog, local Baloo 2 font and two shelf rows', async () => {
    await home(); assert.equal(await page.locator('.aisle-shelf-row').count(), 2);
    assert(await page.evaluate(() => document.fonts.check('700 20px "Baloo 2"')));
    assert(await page.locator('.aisle-product').count() > 0);
    await page.screenshot({ path: path.join(output, 'desktop-hero.png') });
  });
  await check('Category navigation, rapid switching, search and clear filters', async () => {
    const buttons = page.locator('.aisle-tabs button');
    await buttons.nth(1).click(); await wait(page);
    assert.equal(await page.locator('.aisle-product').count(), products.filter((p) => String(p.categoryId) === String(categories[0]._id)).length);
    await buttons.nth(2).click(); await buttons.nth(3).click(); await buttons.nth(1).click(); await wait(page, 1200);
    assert.equal(await buttons.nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.aisle-camera').evaluate((el) => getComputedStyle(el).opacity), '1');
    await buttons.first().click(); await wait(page);
    await page.locator('.aisle-search input').fill(products[0].name); await page.keyboard.press('Escape'); await wait(page);
    assert.equal(await page.locator('.aisle-product').count(), 1);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click(); await wait(page);
  });
  await check('Price sorting and promotion estimates', async () => {
    await page.getByLabel('Sort products').selectOption('asc'); await wait(page);
    const prices = await page.locator('.aisle-product-prices b').allTextContents();
    const values = prices.map((p) => Number(p.replace(/\D/g, '')));
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
    if (offers.items?.length) assert(await page.locator('.aisle-sale-badge').count() > 0);
    await page.getByLabel('Sort products').selectOption('default');
  });
  await check('Guest product dialog, focus trapping, Escape and login return', async () => {
    await page.getByRole('button', { name: 'View ' + products[0].name, exact: true }).click();
    await page.getByRole('link', { name: 'Log in to shop', exact: false }).waitFor();
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)));
    await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.getByRole('button', { name: 'View ' + products[0].name, exact: true }).click();
    await page.getByRole('link', { name: 'Log in to shop', exact: false }).click();
    await page.locator('input[name=email]').fill(email); await page.locator('input[name=password]').fill(password);
    await page.getByRole('button', { name: 'Log in', exact: false }).click();
    await page.waitForURL('http://localhost:5173/'); await page.locator('.aisle-product').first().waitFor();
  });
  await check('Authenticated add quantity 2, server cart and header count', async () => {
    await page.getByRole('button', { name: 'View ' + products[0].name, exact: true }).click();
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
    await page.getByRole('button', { name: 'Add to cart', exact: false }).click();
    await page.locator('.atc-msg.ok').waitFor();
    assert.equal((await models.Cart.findOne({ userId: user._id }).lean()).items[0].quantity, 2);
    assert.equal(await page.locator('.hp-cart-count').innerText(), '2');
    await page.screenshot({ path: path.join(output, 'real-cart-success.png') });
  });
  await check('Stock race rejects add without false success or badge increment', async () => {
    await models.StockBatch.updateMany({ productId: products[0]._id }, { quantity: 0 });
    await page.getByRole('button', { name: 'Add to cart', exact: false }).click();
    await page.locator('.atc-msg.err').waitFor();
    assert.equal(await page.locator('.atc-msg.ok').count(), 0); assert.equal(await page.locator('.hp-cart-count').innerText(), '2');
    assert.equal((await models.Cart.findOne({ userId: user._id }).lean()).items[0].quantity, 2);
    await models.StockBatch.updateMany({ productId: products[0]._id }, { quantity: 20 });
    await page.keyboard.press('Escape');
  });
  await check('Out of stock product has no add button', async () => {
    await page.locator('.aisle-search input').fill(products[2].name); await page.keyboard.press('Escape'); await wait(page);
    await page.getByRole('button', { name: 'View ' + products[2].name, exact: true }).click();
    await page.locator('.atc-note.out').waitFor(); assert.equal(await page.locator('dialog .atc-btn').count(), 0);
    await page.keyboard.press('Escape');
  });
  await check('Existing cart quantity/removal updates the shared indicator', async () => {
    await page.locator('.hp-cart-indicator').click(); await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.hp-cart-count')?.textContent === '3');
    await page.getByRole('button', { name: 'Remove ' + products[0].name + ' from cart', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.hp-cart-count'));
    assert.equal((await models.Cart.findOne({ userId: user._id }).lean()).items.length, 0);
  });
  await home();
  await check('Expanding shelves keeps all products accessible', async () => {
    const before = await page.locator('.aisle-product').count();
    const more = page.getByRole('button', { name: 'Load more from this aisle', exact: false });
    if (await more.count()) { await more.click(); await wait(page); assert(await page.locator('.aisle-product').count() > before); }
  });
  await check('Every desktop story scene, including direct jumps and reverse scroll', async () => {
    for (const index of [0, 1, 2, 3, 4, 2, 0, 4]) {
      await page.locator('.quick-process-step').nth(index).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.42));
      await wait(page, 1000);
      const visible = await page.locator('.quick-process-panel').evaluateAll((nodes) => nodes.map((node, i) => Number(getComputedStyle(node).opacity) > 0.9 && getComputedStyle(node).visibility !== 'hidden' ? i : -1).filter((i) => i >= 0));
      assert.deepEqual(visible, [index]);
      if (index === 3) await page.screenshot({ path: path.join(output, 'payment-story.png') });
    }
    assert.deepEqual(orderRequests, []);
    assert.equal(await models.Order.countDocuments(), 0); assert.equal(await models.Transaction.countDocuments(), 0);
  });
  await check('ScrollTrigger and Lenis cleanup after repeated SPA navigation', async () => {
    const baseline = await triggers(); assert(baseline > 0);
    for (let i = 0; i < 3; i++) {
      await page.locator('.quick-shelf-links a').first().click(); await page.waitForURL('**/products'); await wait(page, 200);
      assert.equal(await triggers(true), 0); assert(!(await page.locator('html').getAttribute('class') || '').includes('lenis'));
      await page.getByRole('link', { name: 'QUICK home', exact: true }).click(); await page.locator('.aisle-product').first().waitFor(); await wait(page);
      assert.equal(await triggers(), baseline);
    }
  });
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 640]]) await check('Responsive layout ' + width, async () => {
    await page.setViewportSize({ width, height }); await page.evaluate(() => scrollTo(0, 0)); await wait(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width < 900) assert(!(await page.locator('html').getAttribute('class') || '').includes('lenis'));
    await page.locator('.aisle-title-plaque').scrollIntoViewIfNeeded(); await wait(page, 250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width === 390) await page.screenshot({ path: path.join(output, 'mobile-shelves.png') });
  });
  await check('Mobile swipe changes aisle, vertical scrolling remains native', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.aisle-tabs button').first().click(); await wait(page);
    await page.locator('.aisle-title-plaque').scrollIntoViewIfNeeded();
    const box = await page.locator('.aisle-title-plaque').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.8, y = box.y + 30;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 15, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(page, 1100);
    assert.equal(await page.locator('.aisle-tabs button').nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('dialog').count(), 0); await cdp.detach();
    const before = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 220); await wait(page, 300); assert(await page.evaluate(() => scrollY) > before);
  });
  await check('Reduced motion exposes every scene and preserves shopping', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await wait(page);
    assert.equal(await triggers(), 0); assert(!(await page.locator('html').getAttribute('class') || '').includes('lenis'));
    assert.equal(await page.locator('.quick-process-mobile:visible').count(), 5);
    await page.locator('.aisle-tabs button').first().click(); await wait(page, 100);
    await page.locator('.aisle-product').first().click(); await page.getByRole('button', { name: 'Add to cart', exact: false }).waitFor(); await page.keyboard.press('Escape');
  });
  await check('Catalog failure, retry and empty state', async () => {
    failCatalog = true; await page.reload({ waitUntil: 'networkidle' }); await page.locator('.aisle-empty-state[role=alert]').waitFor();
    failCatalog = false; await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.locator('.aisle-product').first().waitFor();
    emptyCatalog = true; await page.reload({ waitUntil: 'networkidle' }); await page.getByText('This aisle is waiting for new stock.').waitFor();
    assert.equal(await page.locator('.aisle-product').count(), 0); emptyCatalog = false;
  });
  await check('No runtime exceptions or scroll-triggered orders/payments', async () => { assert.deepEqual(errors, []); assert.deepEqual(orderRequests, []); });
})().catch(async (error) => { console.error(error); if (testPage) { await testPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); console.error((await testPage.locator('body').innerText()).slice(0, 1800)); } process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, dbName); assert(/^homepage_qa_[a-f0-9]{32}$/.test(dbName));
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), isolatedDatabaseRemoved: true, results, runtimeErrors: errors, orderRequests }, null, 2));
  if (results.length && results.every((result) => result.passed)) await fs.rm(path.join(output, 'failure.png'), { force: true });
  console.log(results.filter((result) => result.passed).length + '/' + results.length + ' checks passed. Disposable database removed.');
});
