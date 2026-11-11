# Bản đồ code theo thành viên (ôn interview project)

> **Số dòng (L…) trong file này có thể đã lệch sau các lần sửa code.** Tra cứu chính xác từng hàm ở [code-map.md](code-map.md) (sinh tự động từ code).

Mỗi thành viên có một mục riêng: chức năng được giao theo Backlog → file nào cần đọc → các ý nên nắm khi bị hỏi.

**Cách đọc một chức năng từ đầu đến cuối** (áp dụng cho mọi người):

```
Trang React (frontend/src/pages/...)
  → hàm gọi API (frontend/src/api/*.api.js, axios gắn token ở api/axios.js)
    → route (backend/src/routes/*.routes.js: authenticate + authorize(role))
      → controller (backend/src/controllers/*.controller.js)
        → service, nếu nghiệp vụ phức tạp (backend/src/services/*.js)
          → model Mongoose (backend/src/models/*.js)
```

## Phần chung ai cũng nên biết

| Chủ đề | File |
|---|---|
| Khởi động server, job tự hủy đơn quá hạn | [server.js](../backend/src/server.js), [app.js](../backend/src/app.js) |
| Gắn toàn bộ route dưới `/api` | [routes/index.js](../backend/src/routes/index.js) |
| Xác thực JWT, phân quyền theo role | [auth.middleware.js](../backend/src/middlewares/auth.middleware.js): `authenticate` (L12), `optionalAuth` (L32), `authorize` (L41) |
| Xử lý lỗi tập trung | [error.middleware.js](../backend/src/middlewares/error.middleware.js), [utils/ApiError.js](../backend/src/utils/ApiError.js), [utils/asyncHandler.js](../backend/src/utils/asyncHandler.js) |
| Transaction MongoDB (đặt đơn, trừ kho, trừ điểm cùng lúc) | [utils/atomic.js](../backend/src/utils/atomic.js) |
| Định tuyến web, chặn trang theo role | [AppRouter.jsx](../frontend/src/routes/AppRouter.jsx), [ProtectedRoute.jsx](../frontend/src/routes/ProtectedRoute.jsx) |
| Lưu user và token phía web | [AuthContext.jsx](../frontend/src/context/AuthContext.jsx), [api/axios.js](../frontend/src/api/axios.js) |

Ba role trong hệ thống: `customer` (đặt online, nhận tại cửa hàng, **không giao hàng**), `staff` (bán tại quầy, kho, khiếu nại) và `admin` (quản trị).

---

## 1. Phạm Minh An (CE190606): tài khoản, sản phẩm, danh mục

### Chức năng được giao
- **Customer / Guest:** Register, Login, Forgot Password, Logout, View/Search Products, View Product Details, View Promotions
- **Staff:** View, Search, Details, Add, Update và Delete Product
- **Admin:** quản lý sản phẩm (thêm Update Price, Activate, Deactivate) và quản lý danh mục (View, Add, Update, Delete)

### Backend
| Chức năng | Route | Controller |
|---|---|---|
| Register | `POST /api/auth/register` | [auth.controller.js](../backend/src/controllers/auth.controller.js#L29) `register` |
| Login / Google | `POST /api/auth/login`, `/google` | [auth.controller.js](../backend/src/controllers/auth.controller.js#L49) `login` (L49), `googleLogin` (L80) |
| Logout / Me | `POST /logout`, `GET /me` | `logout` (L124), `getMe` (L126) |
| Forgot / Reset password | `POST /forgot-password`, `/reset-password` | `forgotPassword` (L133), `resetPassword` (L163); gửi mail ở [mail.service.js](../backend/src/services/mail.service.js) |
| View / Search Products | `GET /api/products` | [product.controller.js](../backend/src/controllers/product.controller.js#L114) `listProducts` |
| Product Details | `GET /api/products/:id` | `getProduct` (L160) |
| Add / Update / Delete | `POST`, `PUT`, `DELETE /api/products` | `createProduct` (L174), `updateProduct` (L184), `deleteProduct` (L229); kiểm tra dữ liệu ở `readFields` (L50) |
| Update Price (admin) | `PATCH /:id/price` | `updateProductPrice` (L203) |
| Activate / Deactivate | `PATCH /:id/activate`, `/deactivate` | `setStatus` (L215) |
| Danh mục | `/api/categories` | [category.controller.js](../backend/src/controllers/category.controller.js): `listCategories` (L42), `createCategory` (L52), `updateCategory` (L63), `deleteCategory` (L76) |
| View Promotions (đọc công khai) | `GET /api/promotions` | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L19) `listPromotions` |

Model: [User.js](../backend/src/models/User.js), [Product.js](../backend/src/models/Product.js), [Category.js](../backend/src/models/Category.js)

### Frontend
- **Auth:** [LoginPage](../frontend/src/pages/guest/LoginPage.jsx), [RegisterPage](../frontend/src/pages/guest/RegisterPage.jsx), [ForgotPasswordPage](../frontend/src/pages/guest/ForgotPasswordPage.jsx), [ResetPasswordPage](../frontend/src/pages/guest/ResetPasswordPage.jsx), [components/auth/](../frontend/src/components/auth/), [auth.api.js](../frontend/src/api/auth.api.js). Logout nằm trong `AuthContext.logout`.
- **Khách:** [HomePage](../frontend/src/pages/guest/HomePage.jsx), [ProductListPage](../frontend/src/pages/guest/ProductListPage.jsx), [ProductDetailPage](../frontend/src/pages/guest/ProductDetailPage.jsx), [PromotionsPage](../frontend/src/pages/guest/PromotionsPage.jsx), [components/product/](../frontend/src/components/product/), [utils/productSearch.js](../frontend/src/utils/productSearch.js)
- **Staff / Admin:** [StaffProductsPage](../frontend/src/pages/staff/StaffProductsPage.jsx), [AdminProductsPage](../frontend/src/pages/admin/AdminProductsPage.jsx), [AdminProductFormPage](../frontend/src/pages/admin/AdminProductFormPage.jsx) (dùng chung cho staff), [AdminProductDetailPage](../frontend/src/pages/admin/AdminProductDetailPage.jsx), [AdminCategoriesPage](../frontend/src/pages/admin/AdminCategoriesPage.jsx), [product.api.js](../frontend/src/api/product.api.js), [category.api.js](../frontend/src/api/category.api.js)

### Ý nên nắm
- Mật khẩu được hash (bcrypt). Login trả JWT. Tài khoản bị khóa hoặc đã xóa thì không đăng nhập được, và token cũ cũng bị chặn ở `authenticate`.
- Forgot password: token reset được lưu dưới dạng sha256 (`sha256`, L17) và có hạn dùng.
- Search và filter sản phẩm chạy ở server: regex theo tên/SKU, lọc theo danh mục, phân trang.
- Slug là duy nhất (`uniqueSlug`). Ảnh sản phẩm chấp nhận URL hoặc `/uploads/...` (`cleanImages`).
- Staff được thêm và sửa sản phẩm. Đổi giá và bật/tắt sản phẩm chỉ dành cho admin (xem `authorize` trong route).

---

## 2. Nguyễn Khánh Duy (CE190496): hồ sơ, địa chỉ, khách hàng, nhân viên, cửa hàng

### Chức năng được giao
- **Customer:** View/Update Profile, Change Password, View/Add/Update/Delete Address
- **Staff và Admin:** hồ sơ cá nhân (View/Update Profile, Change Password)
- **Admin, khách hàng:** View, Search, Details, Update; Unlock/Delete Customer
- **Admin, nhân viên:** View, Add, Update; Lock/Unlock Staff
- **Admin, cửa hàng:** View, Add, Update Store

### Backend
| Chức năng | Route | Controller |
|---|---|---|
| Profile (cả 3 role dùng chung) | `GET`/`PUT /api/profile`, `PUT /profile/password` | [profile.controller.js](../backend/src/controllers/profile.controller.js): `getProfile` (L47), `updateProfile` (L52), `changePassword` (L79) |
| Địa chỉ | `/api/addresses` | [address.controller.js](../backend/src/controllers/address.controller.js): `listAddresses` (L45), `addAddress` (L51), `updateAddress` (L66), `deleteAddress` (L80) |
| Khách hàng | `/api/customers` | [customer.controller.js](../backend/src/controllers/customer.controller.js): `listCustomers` (L26), `getCustomer` (L77), `updateCustomer` (L130), `unlockCustomer` (L146), `deleteCustomer` (L159) |
| Nhân viên | `/api/staff` | [staff.controller.js](../backend/src/controllers/staff.controller.js): `listStaff` (L52), `addStaff` (L71), `updateStaff` (L95), `lockStaff` (L107), `unlockStaff` (L118), `getStaffActivity` (L130) |
| Cửa hàng | `/api/stores` | [store.controller.js](../backend/src/controllers/store.controller.js): `listStores` (L47), `addStore` (L53), `updateStore` (L62), `closeStore` / `openStore` (L71 / L83), `updateStoreHours` (L94) |

Model: [User.js](../backend/src/models/User.js) (địa chỉ là mảng con), [Store.js](../backend/src/models/Store.js), [ActivityLog.js](../backend/src/models/ActivityLog.js)

### Frontend
- **Customer:** [ProfilePage](../frontend/src/pages/customer/ProfilePage.jsx), [AddressPage](../frontend/src/pages/customer/AddressPage.jsx), [components/profile/ProfileView.jsx](../frontend/src/components/profile/ProfileView.jsx) (dùng chung 3 role), [AccountSidebar](../frontend/src/components/order/AccountSidebar.jsx)
- **Staff / Admin:** [StaffProfilePage](../frontend/src/pages/staff/StaffProfilePage.jsx), [AdminProfilePage](../frontend/src/pages/admin/AdminProfilePage.jsx), [AdminCustomersPage](../frontend/src/pages/admin/AdminCustomersPage.jsx), [AdminStaffPage](../frontend/src/pages/admin/AdminStaffPage.jsx), [AdminStoresPage](../frontend/src/pages/admin/AdminStoresPage.jsx)
- **API:** [profile.api.js](../frontend/src/api/profile.api.js), [address.api.js](../frontend/src/api/address.api.js), [customer.api.js](../frontend/src/api/customer.api.js), [staff.api.js](../frontend/src/api/staff.api.js), [store.api.js](../frontend/src/api/store.api.js)

### Ý nên nắm
- Change password bắt nhập mật khẩu cũ. Avatar được gửi dạng base64, nên `express.json` có limit 12mb.
- Địa chỉ: luôn có đúng một địa chỉ mặc định, sắp xếp bằng `sortAddresses`. Xóa địa chỉ mặc định thì một địa chỉ khác sẽ được đặt làm mặc định.
- Xóa khách hàng là xóa mềm (`status = 'deleted'`) và bị chặn nếu khách còn đơn đang xử lý. Khóa nhân viên chặn đăng nhập ngay, vì `authenticate` đọc lại trạng thái user ở mỗi request.
- Mã nhân viên được tự sinh (`nextEmployeeCode`). Lịch sử hoạt động của nhân viên lấy từ ActivityLog.
- Cửa hàng có giờ mở cửa theo từng ngày (`parseHours`) và trạng thái mở/đóng.

---

## 3. Phùng Lâm Điền (CE171407): giỏ hàng, kho, mã giảm giá

### Chức năng được giao
- **Customer:** View Cart, Add Product to Cart, Update và Remove Cart Item
- **Staff:** View Inventory, Check Stock, Receive Stock, Adjust Inventory, Stocktake, View Low Stock, View Expired, Manage Damaged Products
- **Admin, kho:** View, Adjust, Stocktake, Low Stock, Out of Stock, Inventory History
- **Admin, mã giảm giá:** View, Create, Update, Suspend, Delete Discount Code

### Backend
| Chức năng | Route | Controller / Service |
|---|---|---|
| Giỏ hàng | `/api/cart` | [cart.controller.js](../backend/src/controllers/cart.controller.js): `getCart` (L27), `addCartItem` (L32), `updateCartItem` (L47), `removeCartItem` (L59), `getCartSuggestions` (L68); dựng giỏ ở [cart.service.js](../backend/src/services/cart.service.js) |
| Xem kho / Check stock | `GET /api/inventory`, `/product/:id` | [inventory.controller.js](../backend/src/controllers/inventory.controller.js): `listInventory` (L53), `getProductStock` (L77) |
| Nhập hàng | `POST /receive` | `receiveStock` (L88) → `stock.service.receiveBatch` |
| Điều chỉnh | `POST /adjust` | `adjustInventory` (L112) |
| Kiểm kê | `/stocktakes` | `listStocktakes` (L133), `createStocktake` (L156), `completeStocktake` (L176) |
| Sắp hết / Hết hàng / Hết hạn | `/low-stock`, `/out-of-stock`, `/expired` | `listLowStock` (L194), `listOutOfStock` (L206), `listExpired` (L217) |
| Hàng hỏng | `/damaged` | `listDamaged` (L232), `recordDamaged` (L248) |
| Lịch sử kho | `/history` | `getInventoryHistory` (L261) |
| Logic kho (quan trọng) | | [stock.service.js](../backend/src/services/stock.service.js): `fefo` (L12), `sellableBatches` (L25), `deductStock` (L86), `releaseStock` (L101), `receiveBatch` (L128), `setStockTo` (L177) |
| Mã giảm giá | `/api/discount-codes` | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js): `validateDiscountCode` (L54), `listDiscountCodes` (L70), `createDiscountCode` (L86), `updateDiscountCode` (L95), `activateDiscountCode` / `suspendDiscountCode` (L108 / L119), `deleteDiscountCode` (L129), `listAvailableCodes` (L138) |

Model: [Cart.js](../backend/src/models/Cart.js), [StockBatch.js](../backend/src/models/StockBatch.js), [InventoryLog.js](../backend/src/models/InventoryLog.js), [Stocktake.js](../backend/src/models/Stocktake.js), [DiscountCode.js](../backend/src/models/DiscountCode.js)

### Frontend
- **Giỏ hàng:** [CartPage](../frontend/src/pages/customer/CartPage.jsx), [components/cart/](../frontend/src/components/cart/) (`AddToCart`, `QuantityStepper`), [cart.api.js](../frontend/src/api/cart.api.js)
- **Kho:** [StaffInventoryPage](../frontend/src/pages/staff/StaffInventoryPage.jsx), [AdminInventoryPage](../frontend/src/pages/admin/AdminInventoryPage.jsx); cả hai dùng chung [InventoryManager.jsx](../frontend/src/components/inventory/InventoryManager.jsx). API: [inventory.api.js](../frontend/src/api/inventory.api.js)
- **Mã giảm giá:** [AdminDiscountCodesPage](../frontend/src/pages/admin/AdminDiscountCodesPage.jsx), [discountCode.api.js](../frontend/src/api/discountCode.api.js)

### Ý nên nắm
- Kho quản lý theo **lô** (StockBatch), mỗi lô có hạn dùng. Khi bán, hệ thống trừ lô sắp hết hạn trước (FEFO). Hàng đã hết hạn không được tính là còn bán được.
- Mọi thay đổi kho đều ghi vào InventoryLog, nên trang lịch sử chỉ cần đọc lại log.
- Kiểm kê có hai bước: tạo phiếu, rồi hoàn tất. Lúc hoàn tất, hệ thống đưa tồn kho về số đếm thực tế (`setStockTo`) và ghi phần chênh lệch.
- Giỏ hàng chặn thêm sản phẩm đã ngừng bán hoặc vượt tồn kho (`assertSellable`).
- Mã giảm giá có các ràng buộc: thời hạn, số lượt tổng, số lượt mỗi khách, đơn tối thiểu, giảm theo % có mức trần. Phần kiểm tra áp mã nằm ở [pricing.service.js](../backend/src/services/pricing.service.js) `validateDiscountCode` (L22).

---

## 4. Hồ Văn Khải (CE190238): đặt hàng, thanh toán, đơn, giao dịch, bán tại quầy

### Chức năng được giao
- **Customer:** Create Order, Make Payment, View Orders, View Order Details, Track Order Status, View Order History
- **Staff:**
  - View Customers, View Customer Details, Handle Customer Complaint
  - View Promotions, Apply Promotion
  - Create Store Order, Print Receipt
  - View, Search và Filter Transactions, View Transaction Details
  - Manage Work Shift
- **Admin:**
  - Đơn hàng: View, Search, Details, Cancel Order
  - Giao dịch: View Transactions, Details; View Refund History
  - Thanh toán: View Payment Transactions, View Failed, View Pending, Handle Payment Error

### Backend
| Chức năng | Route | Controller / Service |
|---|---|---|
| Xem trước và tạo đơn | `POST /api/orders/preview`, `POST /api/orders` | [order.controller.js](../backend/src/controllers/order.controller.js) `previewCheckout` (L246), `createOrder` (L254) → [checkout.service.js](../backend/src/services/checkout.service.js) `buildSummary` (L75), `createOrder` (L113) |
| Tính giá | | [pricing.service.js](../backend/src/services/pricing.service.js) `computePricing` (L33), [promotion.service.js](../backend/src/services/promotion.service.js) `evaluate` (L27) |
| Thanh toán online | `POST /api/payments/online`, callback VNPay/MoMo/mock | [payment.controller.js](../backend/src/controllers/payment.controller.js) `createOnlinePayment` (L22), `vnpayIpn` (L46), `momoIpn` (L57), `mockPay` (L75) → [payment.service.js](../backend/src/services/payment.service.js) `startOnlinePayment` (L59), `applyGatewayResult` (L116), `expireStaleOrders` (L15); ký và xác thực ở [vnpay.service.js](../backend/src/services/vnpay.service.js), [momo.service.js](../backend/src/services/momo.service.js), [mock.service.js](../backend/src/services/mock.service.js) |
| Đơn của khách | `GET /api/orders/my`, `/my/:id`, `/my/:id/tracking`, `/my/history` | `listMyOrders` (L63), `getMyOrder` (L100), `trackMyOrder` (L146), `listMyOrderHistory` (L191) |
| Đơn tại quầy | `POST /api/orders/store/quote`, `/store` | `quoteStoreOrder` (L262), `createStoreOrder` (L269) → [storeOrder.service.js](../backend/src/services/storeOrder.service.js) |
| Thu tiền tại quầy / Hóa đơn | `/api/payments/cash`, `/card`, `/receipt/:id` | `processCashPayment` (L154), `processCardPayment` (L166), `getReceipt` (L187) |
| Áp khuyến mãi (staff) | `POST /api/promotions/apply` | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L33) `applyPromotion` |
| Khách hàng (staff xem) | `GET /api/customers` | [customer.controller.js](../backend/src/controllers/customer.controller.js) `listCustomers` (L26), `getCustomer` (L77) |
| Khiếu nại | `PATCH /api/support/:id/handle` | [support.controller.js](../backend/src/controllers/support.controller.js) `listSupportRequests` (L49), `getSupportRequest` (L98), `handleComplaint` (L110) |
| Giao dịch | `/api/transactions` | [transaction.controller.js](../backend/src/controllers/transaction.controller.js) `listTransactions` (L63, có search, filter, che dữ liệu), `getTransaction` (L104) |
| Ca làm | `/api/work-shifts` | [workShift.controller.js](../backend/src/controllers/workShift.controller.js) `listMyShifts` (L66), `clockIn` (L111), `clockOut` (L133) |
| Đơn (admin) | `/api/orders` | [adminOrder.controller.js](../backend/src/controllers/adminOrder.controller.js) `listOrders` (L47), `getOrder` (L127), `updateOrderStatus` (L204), `cancelOrder` (L298), `listRefunds` (L333) |
| Thanh toán (admin) | `/api/payments/admin...` | `listPayments` / `listFailedPayments` / `listPendingPayments` (L262–264), `handlePaymentError` (L267) |

Model: [Order.js](../backend/src/models/Order.js), [Transaction.js](../backend/src/models/Transaction.js), [Counter.js](../backend/src/models/Counter.js) (sinh mã đơn bằng [orderCode.service.js](../backend/src/services/orderCode.service.js)), [SupportRequest.js](../backend/src/models/SupportRequest.js), [WorkShift.js](../backend/src/models/WorkShift.js)

### Frontend
- **Customer:** [CheckoutPage](../frontend/src/pages/customer/CheckoutPage.jsx), [PayOrderPage](../frontend/src/pages/customer/PayOrderPage.jsx), [PaymentResultPage](../frontend/src/pages/customer/PaymentResultPage.jsx), [OrdersPage](../frontend/src/pages/customer/OrdersPage.jsx), [OrderDetailPage](../frontend/src/pages/customer/OrderDetailPage.jsx), [OrderTrackingPage](../frontend/src/pages/customer/OrderTrackingPage.jsx), [OrderHistoryPage](../frontend/src/pages/customer/OrderHistoryPage.jsx), [components/checkout/](../frontend/src/components/checkout/), [components/order/](../frontend/src/components/order/), [utils/orderTimeline.js](../frontend/src/utils/orderTimeline.js), [utils/idempotency.js](../frontend/src/utils/idempotency.js)
- **Staff:** [StoreOrderPage](../frontend/src/pages/staff/StoreOrderPage.jsx), [StaffPaymentPage](../frontend/src/pages/staff/StaffPaymentPage.jsx) và [Receipt.jsx](../frontend/src/components/staff/Receipt.jsx), [StaffTransactionsPage](../frontend/src/pages/staff/StaffTransactionsPage.jsx), [StaffCustomersPage](../frontend/src/pages/staff/StaffCustomersPage.jsx) và [StaffCustomerDetailPage](../frontend/src/pages/staff/StaffCustomerDetailPage.jsx), [StaffComplaintsPage](../frontend/src/pages/staff/StaffComplaintsPage.jsx) và [StaffComplaintDetailPage](../frontend/src/pages/staff/StaffComplaintDetailPage.jsx), [StaffPromotionsPage](../frontend/src/pages/staff/StaffPromotionsPage.jsx), [WorkShiftPage](../frontend/src/pages/staff/WorkShiftPage.jsx)
- **Admin:** [AdminOrdersPage](../frontend/src/pages/admin/AdminOrdersPage.jsx), [AdminOrderDetailPage](../frontend/src/pages/admin/AdminOrderDetailPage.jsx) (dùng `AdminCancelOrder`, `OrderIssues`), [AdminTransactionsPage](../frontend/src/pages/admin/AdminTransactionsPage.jsx), [AdminPaymentsPage](../frontend/src/pages/admin/AdminPaymentsPage.jsx), [AdminRefundsPage](../frontend/src/pages/admin/AdminRefundsPage.jsx); trang giao dịch dùng chung [TransactionManager.jsx](../frontend/src/components/transaction/TransactionManager.jsx)
- **API:** [order.api.js](../frontend/src/api/order.api.js), [payment.api.js](../frontend/src/api/payment.api.js), [transaction.api.js](../frontend/src/api/transaction.api.js), [support.api.js](../frontend/src/api/support.api.js), [workShift.api.js](../frontend/src/api/workShift.api.js)

### Ý nên nắm (phần này bị hỏi nhiều nhất)
- **Tạo đơn chạy trong một transaction** (`runAtomic`): kiểm tra giỏ → tính giá (khuyến mãi, mã giảm giá, điểm) → trừ kho theo FEFO → trừ lượt mã và trừ điểm → tạo Order → xóa giỏ. Bước nào lỗi thì toàn bộ rollback.
- `expectedTotal` từ client được so với tổng server tính lại (checkout.service L139). Nếu lệch (giá vừa đổi), server trả lỗi để khách xác nhận lại.
- Có `idempotencyKey` để bấm đặt hai lần, hoặc gửi hai request song song, cũng không tạo hai đơn (L112–123, L204). Đơn tại quầy cũng làm như vậy.
- **Thanh toán online:**
  - Đơn ở trạng thái chờ thanh toán có hạn (TTL). Job chạy mỗi phút (`startExpiryJob`) hủy đơn quá hạn, trả lại kho và hoàn điểm.
  - Kết quả thanh toán được xác nhận qua IPN có chữ ký HMAC, không tin redirect của trình duyệt.
  - Nếu cổng báo "đã trả tiền" sau khi đơn đã hết hạn, hệ thống ghi vào issue để admin xử lý (Handle Payment Error).
- **Luồng trạng thái đơn** (xem [Order.js](../backend/src/models/Order.js)):
  - Đi tiếp: `pending_payment` (chờ thanh toán online) → `confirmed` → `preparing` → `ready_for_pickup` (chờ khách đến lấy) → `completed`.
  - Nhánh rẽ: `failed` khi thanh toán lỗi hoặc hết hạn, `cancelled` khi admin hủy.
  - `NEXT_STATUS` và `allowedTransition` (adminOrder L23, L119) chỉ cho đi tới đúng bước kế tiếp. Đơn trả tiền mặt phải xác nhận đã thu tiền mới được chuyển sang completed.
- **Hủy đơn (admin):** trả kho, hoàn tiền nếu đã thanh toán (đơn hiện trong Refund History) và hoàn điểm đã dùng.
- **Đơn tại quầy:** staff báo giá (quote), tạo đơn, rồi thu tiền mặt (tính tiền thối) hoặc thẻ, sau đó in hóa đơn.
- Khi staff xem giao dịch, email và số điện thoại bị che bớt (`maskEmail`, `maskPhone` trong `serialize`). Admin xem được đầy đủ.

---

## 5. Lâm Thị Bảo Trân (CE191562): đánh giá, thành viên, khuyến mãi, hỗ trợ

### Chức năng được giao
- **Customer:** Add, Update và Delete Review; View Membership Points, View Point History; Submit/View Support Request
- **Admin, khuyến mãi:** View, Create, Update, Activate, Delete Promotion
- **Admin, thành viên:** View, Search Members, Member Details, Manage Membership Tiers, Adjust Points, View Point History, View Redemption History
- **Admin, đánh giá:** View Product Reviews, View Store Reviews, Hide Review, Handle Violating Review

### Backend
| Chức năng | Route | Controller / Service |
|---|---|---|
| Đánh giá (khách) | `/api/reviews` | [review.controller.js](../backend/src/controllers/review.controller.js): `listEligibleReviews` (L57), `listMyReviews` (L72), `addReview` (L79), `updateReview` (L108), `deleteReview` (L123); điểm trung bình cập nhật ở `refreshProductRating` (L22) |
| Xem đánh giá | `/product/:id`, `/store` | `listProductReviews` (L31), `listStoreReviews` (L42) |
| Kiểm duyệt (admin) | `/admin/all`, `/:id/hide`, `/:id/violation` | `listReviewsAdmin` (L133), `hideReview` (L143), `handleViolatingReview` (L165) |
| Thành viên (khách) | `GET /api/membership/me`, `/me/history` | [membership.controller.js](../backend/src/controllers/membership.controller.js): `getMyMembership` (L16), `getMyPointHistory` (L28) |
| Thành viên (admin) | `/members`, `/members/:id`, `/members/:id/points` | `listMembers` (L77), `getMember` (L87), `adjustPoints` (L134) |
| Hạng thành viên | `/tiers` | `listTiers` (L93), `createTier` (L114), `updateTier` (L120), `deleteTier` (L128) |
| Lịch sử điểm / đổi điểm | `/history`, `/redemptions` | `listPointHistory` (L171), `listRedemptions` (L172) |
| Logic điểm | | [points.service.js](../backend/src/services/points.service.js): `pointsFor` (L7), `awardPointsForOrder` (L9), `planRedeem` (L49), `redeemForOrder` (L60), `refundRedeemedForOrder` (L78) |
| Khuyến mãi (admin) | `/api/promotions/manage`… | [promotion.controller.js](../backend/src/controllers/promotion.controller.js): `listAllPromotions` (L142), `createPromotion` (L161), `updatePromotion` (L169), `activatePromotion` / `suspendPromotion` (L182 / L190), `deletePromotion` (L196); kiểm tra dữ liệu ở `readPromotion` (L82) |
| Hỗ trợ (khách) | `POST /api/support`, `GET /support/my` | [support.controller.js](../backend/src/controllers/support.controller.js): `submitSupportRequest` (L162), `listMySupportRequests` (L182) |

Model: [Review.js](../backend/src/models/Review.js), [MembershipTier.js](../backend/src/models/MembershipTier.js), [PointHistory.js](../backend/src/models/PointHistory.js), [Promotion.js](../backend/src/models/Promotion.js), [SupportRequest.js](../backend/src/models/SupportRequest.js)


### Frontend
- **Customer:** [MyReviewsPage](../frontend/src/pages/customer/MyReviewsPage.jsx), [ProductReviews.jsx](../frontend/src/components/product/ProductReviews.jsx), [StoreReviewForm.jsx](../frontend/src/components/product/StoreReviewForm.jsx), [MembershipPage](../frontend/src/pages/customer/MembershipPage.jsx), [components/home/MemberPass.jsx](../frontend/src/components/home/MemberPass.jsx), [SupportPage](../frontend/src/pages/customer/SupportPage.jsx)
- **Admin:** [AdminPromotionsPage](../frontend/src/pages/admin/AdminPromotionsPage.jsx), [AdminMembershipPage](../frontend/src/pages/admin/AdminMembershipPage.jsx), [AdminReviewsPage](../frontend/src/pages/admin/AdminReviewsPage.jsx)
- **API:** [review.api.js](../frontend/src/api/review.api.js), [membership.api.js](../frontend/src/api/membership.api.js), [promotion.api.js](../frontend/src/api/promotion.api.js), [support.api.js](../frontend/src/api/support.api.js)

### Ý nên nắm
- **Đánh giá:** khách chỉ được đánh giá món nằm trong đơn đã **completed** (`listEligibleReviews`), mỗi món trong một đơn chỉ đánh giá một lần. Khi thêm, sửa, xóa hoặc ẩn đánh giá, điểm trung bình của sản phẩm được tính lại.
- **Ẩn và xử lý vi phạm:** Hide/Show bật tắt việc hiển thị đánh giá. Handle Violating Review có hai lựa chọn: `dismiss` (bỏ qua cờ vi phạm) và `hide` (xác nhận vi phạm, bắt buộc chọn lý do). Mọi thao tác đều được ghi vào ActivityLog.
- **Điểm thành viên:**
  - Điểm được cộng khi đơn **completed**, tức là khi khách đã nhận hàng (`awardPointsForOrder`). Mỗi đơn chỉ được cộng một lần.
  - Đổi điểm: 1 điểm = 100₫, tối thiểu 100 điểm, không vượt quá 50% giá trị đơn. Điểm bị trừ trong cùng transaction với việc tạo đơn. Nếu đơn bị hủy hoặc hết hạn thì điểm được hoàn đúng một lần, nhờ cờ `pointsRefunded`.
- Hạng thành viên được xét theo `minPoints`, và hai hạng không được trùng mốc (`assertUniqueMinPoints`). Khi admin điều chỉnh điểm, lý do được ghi vào PointHistory.
- **Khuyến mãi:**
  - Có loại giảm % hoặc giảm số tiền, phạm vi áp dụng theo sản phẩm hoặc danh mục, và thời gian chạy.
  - Hàm `isRunning` trong [promotion.service.js](../backend/src/services/promotion.service.js) quyết định chương trình nào đang chạy.
  - `evaluate` tính số tiền được giảm. Giảm theo % thì bị chặn bởi `maxDiscount`, và không bao giờ giảm quá tổng tiền các món được áp dụng.

---

## Phần ngoài Backlog (biết để trả lời nếu bị hỏi)
- **Dashboard:** [dashboard.controller.js](../backend/src/controllers/dashboard.controller.js) và [dashboard.service.js](../backend/src/services/dashboard.service.js) (`buildReport`), [AdminDashboardPage](../frontend/src/pages/admin/AdminDashboardPage.jsx), [StaffDashboardPage](../frontend/src/pages/staff/StaffDashboardPage.jsx)
- **Admin cập nhật trạng thái đơn và xử lý sự cố đơn:** `updateOrderStatus`, `handleOrderIssue`, `resolveOrderIssue` trong `adminOrder.controller.js`. Gần nhất với phần của Khải.
- **Tra mã thành viên tại quầy:** `lookupMemberCode` và [MemberCodeLookup.jsx](../frontend/src/components/membership/MemberCodeLookup.jsx). Gần nhất với phần của Trân và Khải.
- **App mobile customer (Expo, môn MMA301)** nằm trong [mobile/src/screens/](../mobile/src/screens/). File màn hình theo người phụ trách:
  - An: `auth.js`, `catalog.js` (trang chủ, sản phẩm), `deals.js` (ưu đãi)
  - Duy: phần hồ sơ và địa chỉ trong `account.js`
  - Điền: giỏ hàng trong `shop.js`
  - Khải: phần checkout và thanh toán trong `shop.js`, cùng `orders.js`
  - Trân: phần thành viên trong `account.js`, cùng `feedback.js` (đánh giá, hỗ trợ)

  App gọi cùng backend nói trên qua [mobile/src/api/index.js](../mobile/src/api/index.js).
