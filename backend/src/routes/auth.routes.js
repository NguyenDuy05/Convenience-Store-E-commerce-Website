const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/google', c.googleLogin);
router.post('/logout', authenticate, c.logout);
router.post('/forgot-password', c.forgotPassword);
router.post('/reset-password', c.resetPassword);
router.get('/me', authenticate, c.getMe);

module.exports = router;
