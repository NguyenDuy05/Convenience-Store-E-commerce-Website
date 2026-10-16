// Bộ đếm tạo orderCode / stocktake code không trùng.
// Dùng: Counter.findOneAndUpdate({ _id: 'order-20261008' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
