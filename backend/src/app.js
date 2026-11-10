const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();
app.use(cors({ origin: (origin, done) => {
  const website = process.env.FRONTEND_URL;
  // Expo's local browser preview; native clients do not require CORS.
  // Production continues to allow only the configured website origin.
  const localPreview = process.env.NODE_ENV !== 'production'
    && /^http:\/\/(localhost|127\.0\.0\.1):(8081|8082)$/.test(origin || '');
  done(null, !website || !origin || origin === website || localPreview);
} }));
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
