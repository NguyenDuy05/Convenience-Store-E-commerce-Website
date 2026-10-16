const router = require('express').Router();
const c = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-19.1, 34.1 View Inventory
router.get('/', authenticate, authorize('staff', 'admin'), c.listInventory);
// UC-19.2 Receive Stock
router.post('/receive', authenticate, authorize('staff'), c.receiveStock);
// UC-19.3, 34.2 Adjust Inventory
router.post('/adjust', authenticate, authorize('staff', 'admin'), c.adjustInventory);
// UC-19.4, 34.3 Stocktake (danh sách phiên kiểm kê)
router.get('/stocktakes', authenticate, authorize('staff', 'admin'), c.listStocktakes);
// UC-19.4, 34.3 Stocktake (tạo phiên kiểm kê)
router.post('/stocktakes', authenticate, authorize('staff', 'admin'), c.createStocktake);
// UC-19.4, 34.3 Stocktake (hoàn tất, cập nhật tồn kho)
router.patch('/stocktakes/:id/complete', authenticate, authorize('staff', 'admin'), c.completeStocktake);
// UC-19.5, 34.4 View Low Stock Products
router.get('/low-stock', authenticate, authorize('staff', 'admin'), c.listLowStock);
// UC-19.6 View Expired Products
router.get('/expired', authenticate, authorize('staff', 'admin'), c.listExpired);
// UC-34.5 View Out of Stock Products
router.get('/out-of-stock', authenticate, authorize('admin'), c.listOutOfStock);
// UC-19.7 Manage Damaged Products (xem)
router.get('/damaged', authenticate, authorize('staff', 'admin'), c.listDamaged);
// UC-19.7 Manage Damaged Products (ghi nhận)
router.post('/damaged', authenticate, authorize('staff', 'admin'), c.recordDamaged);
// UC-34.6 View Inventory History
router.get('/history', authenticate, authorize('admin'), c.getInventoryHistory);

module.exports = router;
