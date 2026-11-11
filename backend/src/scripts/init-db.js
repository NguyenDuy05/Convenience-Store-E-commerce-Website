require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const M = require('../models');

// Tạo đủ collection và index trong database
async function init() {
  await connectDB();
  for (const [name, model] of Object.entries(M)) {
    try { await model.createCollection(); } catch (e) { }
    await model.syncIndexes();
    console.log('OK', name, '->', model.collection.name);
  }
  console.log('Xong: đã có đủ', Object.keys(M).length, 'collection và index');
}

init()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
