const router = require('express').Router();
const c = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// UC-06.1/17.1/28.1 View Profile
router.get('/', authenticate, c.getProfile);
// UC-06.2/17.2/28.2 Update Profile
router.put('/', authenticate, c.updateProfile);
// UC-06.3/17.3/28.3 Change Password
router.put('/password', authenticate, c.changePassword);

module.exports = router;
