const router = require('express').Router();
const c = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, c.getProfile);
router.put('/', authenticate, c.updateProfile);
router.put('/password', authenticate, c.changePassword);

module.exports = router;
