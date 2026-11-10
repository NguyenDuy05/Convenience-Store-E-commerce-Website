require('dotenv').config();
const mongoose = require('mongoose');
const { Store } = require('../models');
const details = require('../config/store');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const primary = await Store.findOne().sort({ createdAt: 1 });
  if (primary) { Object.assign(primary, details); await primary.save(); }
  else await Store.create(details);
  console.log('Primary store configured: QUICK Store, 07:00–24:00 daily.');
})().catch((error) => { console.error(error.name, error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
