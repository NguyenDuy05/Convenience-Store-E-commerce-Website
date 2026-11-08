const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Promotion, Category, Product, ActivityLog } = require('../models');
const controller = require('./promotion.controller');
const service = require('../services/promotion.service');

const id = '507f1f77bcf86cd799439011';
const target = '507f1f77bcf86cd799439012';
const admin = '507f1f77bcf86cd799439013';
const startDate = new Date(Date.now() - 86400000);
const endDate = new Date(Date.now() + 86400000 * 7);
const body = () => ({ name: 'Weekend sale', type: 'percent', value: 20, scope: 'all', startDate: startDate.toISOString(), endDate: endDate.toISOString() });
const doc = (extra = {}) => ({ ...body(), startDate, endDate, categoryIds: [], productIds: [], status: 'inactive', _id: id, __v: 0, ...extra });
const req = (payload, query = {}) => ({ body: payload, query, params: { id }, user: { id: admin, role: 'admin' } });
const response = () => ({ code: 200, data: null, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });

// Database boundaries are mocked; pricing, routing, authorization and validation run as production code.
test('promotion management', async (t) => {
  const originals = [];
  const stub = (model, method, implementation) => {
    if (!originals.some(([m, key]) => m === model && key === method)) originals.push([model, method, model[method]]);
    model[method] = implementation;
  };
  t.after(() => { for (const [model, method, original] of originals) model[method] = original; });
  stub(require('../models').User, 'findById', () => ({ select: () => ({ lean: async () => ({ status: 'active' }) }) }));   // auth middleware kiểm tra tài khoản còn hoạt động
  stub(ActivityLog, 'create', async () => ({}));

  await t.test('invalid discount, dates, scope and text fail before writing', async () => {
    stub(Promotion, 'create', () => assert.fail('Invalid input reached database'));
    for (const payload of [undefined, {}, ...[
      { name: ' ' }, { name: [] }, { name: 'x'.repeat(121) }, { description: {} }, { description: 'x'.repeat(2001) },
      { type: 'unknown' }, { value: 0 }, { value: -1 }, { value: 101 }, { value: '20' }, { value: null }, { value: true },
      { value: Infinity }, { type: 'fixed', value: 1.5 }, { maxDiscount: -1 }, { maxDiscount: 1.5 },
      { scope: 'invalid' }, { scope: 'category', categoryIds: [] }, { scope: 'product', productIds: [{}] },
      { productIds: Array(101).fill(target) }, { startDate: 'invalid' }, { startDate: null }, { endDate: startDate.toISOString() },
      { startDate: '2000-01-01', endDate: '2000-01-02' },
    ].map((override) => ({ ...body(), ...override }))]) {
      await assert.rejects(controller.createPromotion(req(payload), response()), { status: 400 });
    }
  });

  await t.test('create trims fields, starts inactive, ignores injected status and creator', async () => {
    stub(Promotion, 'create', async (data) => {
      assert.equal(data.name, 'Weekend sale'); assert.equal(data.status, 'inactive'); assert.equal(data.createdBy, admin);
      assert.equal(data.description, 'Special offer'); assert.equal(data.maxDiscount, 10000);
      assert.deepEqual(data.categoryIds, []); return { _id: id, ...data };
    });
    const res = response();
    await controller.createPromotion(req({ ...body(), name: ' Weekend sale ', description: ' Special offer ', maxDiscount: 10000, status: 'active', createdBy: target }), res);
    assert.equal(res.code, 201);
  });

  await t.test('scoped promotions require active references and deduplicate IDs', async () => {
    stub(Category, 'countDocuments', async (filter) => { assert.deepEqual(filter, { _id: { $in: [target] }, status: 'active' }); return 0; });
    await assert.rejects(controller.createPromotion(req({ ...body(), scope: 'category', categoryIds: [target] }), response()), { status: 400 });
    stub(Category, 'countDocuments', async () => 1);
    stub(Promotion, 'create', async (data) => { assert.deepEqual(data.categoryIds, [target]); assert.deepEqual(data.productIds, []); return data; });
    await controller.createPromotion(req({ ...body(), scope: 'category', categoryIds: [target, target], productIds: [id] }), response());
    stub(Product, 'countDocuments', async () => 0);
    await assert.rejects(controller.createPromotion(req({ ...body(), scope: 'product', productIds: [target] }), response()), { status: 400 });
  });

  await t.test('partial update preserves dates, clears irrelevant scope and cap, protects status', async () => {
    stub(Promotion, 'findOne', () => ({ lean: async () => doc({ scope: 'category', categoryIds: [new mongoose.Types.ObjectId(target)], maxDiscount: 10000 }) }));
    stub(Promotion, 'findOneAndUpdate', async (filter, update, options) => {
      assert.deepEqual(filter, { _id: id, __v: 0, status: 'inactive' });
      assert.deepEqual(update.$set.categoryIds, []); assert.equal(update.$set.maxDiscount, null);
      assert.equal(update.$set.type, 'fixed'); assert.equal(update.$set.value, 5000);
      assert.equal(update.$set.status, undefined); assert.equal(update.$inc.__v, 1); assert.equal(options.runValidators, true);
      return doc({ ...update.$set });
    });
    await controller.updatePromotion(req({ type: 'fixed', value: 5000, scope: 'all', status: 'active' }), response());
    await assert.rejects(controller.updatePromotion(req({ status: 'active' }), response()), { status: 400 });
  });

  await t.test('invalid IDs, deleted and missing records cannot be modified', async () => {
    const bad = req(body()); bad.params.id = 'invalid';
    await assert.rejects(controller.updatePromotion(bad, response()), { status: 404 });
    stub(Promotion, 'findOne', (filter) => { assert.equal(filter.status.$ne, 'deleted'); return { lean: async () => null }; });
    for (const fn of [controller.updatePromotion, controller.activatePromotion, controller.deletePromotion]) await assert.rejects(fn(req(body()), response()), { status: 404 });
  });

  await t.test('activation rejects expired offers, permits future offers, and rechecks references', async () => {
    stub(Promotion, 'findOne', () => ({ lean: async () => doc({ endDate: new Date(Date.now() - 1000) }) }));
    await assert.rejects(controller.activatePromotion(req(), response()), { status: 409 });
    stub(Promotion, 'findOne', () => ({ lean: async () => doc({ scope: 'product', productIds: [target] }) }));
    await assert.rejects(controller.activatePromotion(req(), response()), { status: 400 });
    const future = doc({ startDate: new Date(Date.now() + 86400000) });
    stub(Promotion, 'findOne', () => ({ lean: async () => future }));
    stub(Promotion, 'findOneAndUpdate', async (filter, update) => { assert.equal(update.$set.status, 'active'); return { ...future, status: 'active' }; });
    const res = response(); await controller.activatePromotion(req(), res);
    assert.equal(res.data.status, 'active'); assert.equal(service.isRunning(res.data), false);
  });

  await t.test('suspension and soft deletion make offers unavailable while retaining history', async () => {
    stub(Promotion, 'findOne', () => ({ lean: async () => doc({ status: 'active' }) }));
    stub(Promotion, 'findOneAndUpdate', async (filter, update) => ({ ...doc(), ...update.$set }));
    for (const [fn, expected] of [[controller.suspendPromotion, 'suspended'], [controller.deletePromotion, 'deleted']]) {
      const res = response(); await fn(req(), res);
      assert.equal(res.data.status, expected); assert.equal(res.data.name, 'Weekend sale'); assert.equal(service.isRunning(res.data), false);
    }
    stub(Promotion, 'findOne', () => ({ lean: async () => doc() }));
    await assert.rejects(controller.suspendPromotion(req(), response()), { status: 409 });
  });

  await t.test('concurrent changes return a conflict instead of overwriting', async () => {
    stub(Promotion, 'findOneAndUpdate', async () => null);
    await assert.rejects(controller.deletePromotion(req(), response()), { status: 409 });
  });

  await t.test('management list escapes search, filters status, caps pagination and returns populated records', async () => {
    let filter;
    const chain = { populate() { return this; }, sort() { return this; }, skip(n) { assert.equal(n, 100); return this; }, limit(n) { assert.equal(n, 100); return this; }, lean: async () => [] };
    stub(Promotion, 'find', (value) => { filter = value; return chain; });
    stub(Promotion, 'countDocuments', async () => 0);
    const res = response(); await controller.listAllPromotions(req(undefined, { q: '.*', page: '2', limit: '1000' }), res);
    assert.deepEqual(filter.status, { $ne: 'deleted' }); assert.equal(filter.$or[0].name.test('anything'), false); assert.equal(filter.$or[0].name.test('.*'), true);
    assert.equal(res.data.page, 2); assert.equal(res.data.limit, 100);
    for (const query of [{ status: 'bad' }, { scope: 'bad' }, { q: {} }, { q: 'x'.repeat(101) }]) await assert.rejects(controller.listAllPromotions(req(undefined, query), response()), { status: 400 });
  });

  await t.test('public availability query excludes inactive, suspended, deleted and out-of-date offers', () => {
    stub(Promotion, 'find', (filter) => {
      assert.equal(filter.status, 'active'); assert.ok(filter.startDate.$lte instanceof Date); assert.ok(filter.endDate.$gte instanceof Date);
      return [];
    });
    service.findRunning();
    const offer = doc({ status: 'active', maxDiscount: 1000 });
    const result = service.evaluate(offer, [{ productId: target, categoryId: id, unitPrice: 10000, quantity: 2 }]);
    assert.equal(result.discount, 1000); assert.equal(result.lines[0].lineTotal, 19000);
    const fixed = service.evaluate({ ...offer, type: 'fixed', value: 50000 }, [{ productId: target, unitPrice: 10000, quantity: 1 }]);
    assert.equal(fixed.discount, 10000);
  });

  await t.test('HTTP routes require an admin for all management operations', async () => {
    const previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = 'promotion-test-secret';
    const app = express(); app.use(express.json()); app.use('/promotions', require('../routes/promotion.routes'));
    app.use((err, request, res, next) => res.status(err.status || 500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}/promotions`;
      const routes = [['GET', '/manage'], ['POST', ''], ['PUT', `/${id}`], ['PATCH', `/${id}/activate`], ['DELETE', `/${id}`]];
      for (const [method, path] of routes) {
        assert.equal((await fetch(base + path, { method })).status, 401);
        for (const role of ['customer', 'staff']) {
          const token = jwt.sign({ id: admin, role }, process.env.JWT_SECRET);
          assert.equal((await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}` } })).status, 403);
        }
      }
      const token = jwt.sign({ id: admin, role: 'admin' }, process.env.JWT_SECRET);
      assert.equal((await fetch(base + '/manage?status=bad', { headers: { Authorization: `Bearer ${token}` } })).status, 400);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    }
  });
});
