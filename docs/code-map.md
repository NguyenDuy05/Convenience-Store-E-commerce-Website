# Code map — file nào, hàm nào xử lý cái gì

> File này **sinh tự động từ code** (dòng chú thích trên mỗi hàm). Bấm vào tên hàm để nhảy tới đúng dòng.
> Đường đi của một request: **Trang React** → **frontend/src/api/*.api.js** (axios) → **backend/src/routes** (authenticate + authorize theo vai trò) → **controller** → **service** (nghiệp vụ phức tạp) → **model** (MongoDB).

## 1. Bảng API (backend)

### `/api/auth` · [auth.routes.js](../backend/src/routes/auth.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | [auth.controller.js](../backend/src/controllers/auth.controller.js#L34) `register` | UC-01 Đăng ký tài khoản khách hàng |
| POST | `/api/auth/login` | public | [auth.controller.js](../backend/src/controllers/auth.controller.js#L54) `login` | UC-03/14/26 Đăng nhập (khách, staff, admin); sai 5 lần thì khóa tạm 15 phút |
| POST | `/api/auth/google` | public | [auth.controller.js](../backend/src/controllers/auth.controller.js#L85) `googleLogin` | Đăng nhập / đăng ký bằng Google: xác thực ID token, chưa có tài khoản thì tạo mới |
| POST | `/api/auth/logout` | logged in | [auth.controller.js](../backend/src/controllers/auth.controller.js#L128) `logout` | UC-04/15/27 Đăng xuất (client tự xóa token) |
| POST | `/api/auth/forgot-password` | public | [auth.controller.js](../backend/src/controllers/auth.controller.js#L138) `forgotPassword` | UC-05/16 Quên mật khẩu: gửi link đặt lại mật khẩu qua email (hiệu lực 30 phút) |
| POST | `/api/auth/reset-password` | public | [auth.controller.js](../backend/src/controllers/auth.controller.js#L166) `resetPassword` | UC-05/16 Đặt mật khẩu mới bằng token trong link email |
| GET | `/api/auth/me` | logged in | [auth.controller.js](../backend/src/controllers/auth.controller.js#L131) `getMe` | Lấy thông tin người đang đăng nhập |

### `/api/profile` · [profile.routes.js](../backend/src/routes/profile.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/profile` | logged in | [profile.controller.js](../backend/src/controllers/profile.controller.js#L49) `getProfile` | UC-06.1/17.1/28.1 Xem hồ sơ cá nhân |
| PUT | `/api/profile` | logged in | [profile.controller.js](../backend/src/controllers/profile.controller.js#L54) `updateProfile` | UC-06.2/17.2/28.2 Sửa hồ sơ (họ tên, SĐT, ngày sinh, ảnh đại diện) |
| PUT | `/api/profile/password` | logged in | [profile.controller.js](../backend/src/controllers/profile.controller.js#L81) `changePassword` | UC-06.3/17.3/28.3 Đổi mật khẩu (phải nhập đúng mật khẩu cũ) |

### `/api/addresses` · [address.routes.js](../backend/src/routes/address.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/addresses` | customer | [address.controller.js](../backend/src/controllers/address.controller.js#L48) `listAddresses` | UC-07.1 Xem danh sách địa chỉ của khách |
| POST | `/api/addresses` | customer | [address.controller.js](../backend/src/controllers/address.controller.js#L54) `addAddress` | UC-07.2 Thêm địa chỉ (địa chỉ đầu tiên tự thành mặc định) |
| PUT | `/api/addresses/:id` | customer | [address.controller.js](../backend/src/controllers/address.controller.js#L68) `updateAddress` | UC-07.3 Sửa địa chỉ |
| DELETE | `/api/addresses/:id` | customer | [address.controller.js](../backend/src/controllers/address.controller.js#L81) `deleteAddress` | UC-07.4 Xóa địa chỉ (xóa địa chỉ mặc định thì chọn địa chỉ khác làm mặc định) |

### `/api/products` · [product.routes.js](../backend/src/routes/product.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/products/image-library` | staff, admin | undefined |  |
| GET | `/api/products` | guest/any | [product.controller.js](../backend/src/controllers/product.controller.js#L114) `listProducts` | UC-02.1/18.1/32.1 Xem / tìm sản phẩm (khách: chỉ sản phẩm đang bán; staff/admin: lọc thêm trạng thái, tồn kho) |
| GET | `/api/products/:id` | guest/any | [product.controller.js](../backend/src/controllers/product.controller.js#L159) `getProduct` | UC-02.2/18.3/32.3 Chi tiết sản phẩm (staff/admin có thể kèm các lô và lịch sử giá) |
| POST | `/api/products` | staff, admin | [product.controller.js](../backend/src/controllers/product.controller.js#L174) `createProduct` | UC-18.4/32.4 Thêm sản phẩm (tồn kho bắt đầu từ 0, nhập hàng qua Inventory) |
| PUT | `/api/products/:id` | staff, admin | [product.controller.js](../backend/src/controllers/product.controller.js#L184) `updateProduct` | UC-18.5/32.5 Sửa sản phẩm (đổi giá chỉ admin) |
| PATCH | `/api/products/:id/price` | admin | [product.controller.js](../backend/src/controllers/product.controller.js#L203) `updateProductPrice` | UC-32.6 Admin đổi giá bán và ghi lịch sử giá |
| PATCH | `/api/products/:id/activate` | admin | [product.controller.js](../backend/src/controllers/product.controller.js#L1) `activateProduct` |  |
| PATCH | `/api/products/:id/deactivate` | admin | [product.controller.js](../backend/src/controllers/product.controller.js#L1) `deactivateProduct` |  |
| DELETE | `/api/products/:id` | staff, admin | [product.controller.js](../backend/src/controllers/product.controller.js#L229) `deleteProduct` | UC-18.6/32.7 Xóa mềm sản phẩm (đơn cũ vẫn tham chiếu được) |

### `/api/categories` · [category.routes.js](../backend/src/routes/category.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/categories` | guest/any | [category.controller.js](../backend/src/controllers/category.controller.js#L46) `listCategories` | UC-33.1 Xem danh mục (khách chỉ thấy danh mục đang bật; admin xem tất cả kèm số sản phẩm) |
| POST | `/api/categories` | admin | [category.controller.js](../backend/src/controllers/category.controller.js#L56) `createCategory` | UC-33.2 Thêm danh mục |
| PUT | `/api/categories/:id` | admin | [category.controller.js](../backend/src/controllers/category.controller.js#L67) `updateCategory` | UC-33.3 Sửa danh mục |
| DELETE | `/api/categories/:id` | admin | [category.controller.js](../backend/src/controllers/category.controller.js#L80) `deleteCategory` | UC-33.4 Xóa danh mục (chỉ khi không còn sản phẩm) |

### `/api/inventory` · [inventory.routes.js](../backend/src/routes/inventory.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/inventory` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L61) `listInventory` | UC-19.1/34.1 Xem tồn kho (lọc còn hàng / sắp hết / hết hàng) |
| POST | `/api/inventory/receive` | staff | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L96) `receiveStock` | UC-19.2 Nhập hàng: tạo lô mới có hạn dùng |
| POST | `/api/inventory/adjust` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L120) `adjustInventory` | UC-19.3/34.2 Điều chỉnh tồn kho về số lượng mới (bắt buộc ghi lý do) |
| GET | `/api/inventory/stocktakes` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L141) `listStocktakes` | UC-19.4/34.3 Danh sách phiên kiểm kê |
| POST | `/api/inventory/stocktakes` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L164) `createStocktake` | UC-19.4/34.3 Tạo phiên kiểm kê với số lượng đếm thực tế |
| PATCH | `/api/inventory/stocktakes/:id/complete` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L184) `completeStocktake` | UC-19.4/34.3 Hoàn tất kiểm kê: đưa tồn kho về đúng số đã đếm |
| GET | `/api/inventory/product/:productId` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L85) `getProductStock` | Check Stock: các lô còn hàng của một sản phẩm |
| GET | `/api/inventory/low-stock` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L202) `listLowStock` | UC-19.5/34.4 Sản phẩm sắp hết hàng |
| GET | `/api/inventory/expired` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L225) `listExpired` | UC-19.6 Các lô đã hết hạn mà vẫn còn hàng |
| GET | `/api/inventory/out-of-stock` | admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L214) `listOutOfStock` | UC-34.5 Sản phẩm hết hàng |
| GET | `/api/inventory/damaged` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L240) `listDamaged` | UC-19.7 Xem các lần ghi nhận hàng hỏng / hết hạn bị loại |
| POST | `/api/inventory/damaged` | staff, admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L256) `recordDamaged` | UC-19.7 Ghi nhận hàng hỏng / hết hạn và trừ khỏi kho |
| GET | `/api/inventory/history` | admin | [inventory.controller.js](../backend/src/controllers/inventory.controller.js#L269) `getInventoryHistory` | UC-34.6 Lịch sử biến động kho (nhập, bán, điều chỉnh, kiểm kê, hỏng) |

### `/api/wallet` · [wallet.routes.js](../backend/src/routes/wallet.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/wallet` | customer | undefined |  |

### `/api/cart` · [cart.routes.js](../backend/src/routes/cart.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/cart` | customer | [cart.controller.js](../backend/src/controllers/cart.controller.js#L25) `getCart` | UC-07.1 Xem giỏ hàng (kèm cảnh báo sản phẩm ngừng bán / thiếu hàng) |
| POST | `/api/cart/items` | customer | [cart.controller.js](../backend/src/controllers/cart.controller.js#L30) `addCartItem` | UC-07.2 Thêm sản phẩm vào giỏ (đã có thì cộng dồn số lượng) |
| PUT | `/api/cart/items/:productId` | customer | [cart.controller.js](../backend/src/controllers/cart.controller.js#L46) `updateCartItem` | UC-07.3 Đổi số lượng một sản phẩm trong giỏ |
| DELETE | `/api/cart/items/:productId` | customer | [cart.controller.js](../backend/src/controllers/cart.controller.js#L59) `removeCartItem` | UC-07.4 Xóa sản phẩm khỏi giỏ |
| GET | `/api/cart/suggestions` | customer | [cart.controller.js](../backend/src/controllers/cart.controller.js#L1) `getCartSuggestions` |  |

### `/api/orders` · [order.routes.js](../backend/src/routes/order.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| POST | `/api/orders/preview` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L235) `previewCheckout` | UC-08.1 Xem trước đơn: giá, khuyến mãi, mã giảm giá, ví, tồn kho tại thời điểm hiện tại |
| POST | `/api/orders` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L240) `createOrder` | UC-08.1 Tạo đơn từ giỏ hàng (chống đặt trùng bằng Idempotency-Key) |
| GET | `/api/orders/my` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L60) `listMyOrders` | UC-09.1 Khách xem danh sách đơn của mình (lọc theo trạng thái) |
| GET | `/api/orders/my/history` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L183) `listMyOrderHistory` | UC-09.4 Lịch sử đơn đã kết thúc của khách (lọc theo kết quả, khoảng ngày) |
| GET | `/api/orders/my/:id/tracking` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L141) `trackMyOrder` | UC-09.3 Theo dõi trạng thái đơn và các mốc thời gian |
| POST | `/api/orders/my/:id/cancel` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `cancelOrder` |  |
| GET | `/api/orders/my/:id` | customer | [order.controller.js](../backend/src/controllers/order.controller.js#L93) `getMyOrder` | UC-09.2 Khách xem chi tiết đơn (đơn của người khác trả 404) |
| POST | `/api/orders/store/quote` | staff | [order.controller.js](../backend/src/controllers/order.controller.js#L247) `quoteStoreOrder` | UC-22 Báo giá hóa đơn tại quầy (giá và khuyến mãi tính lại từ database) |
| POST | `/api/orders/store` | staff | [order.controller.js](../backend/src/controllers/order.controller.js#L254) `createStoreOrder` | UC-22 Tạo đơn tại quầy chờ thu tiền |
| POST | `/api/orders/store/checkout` | staff | [order.controller.js](../backend/src/controllers/order.controller.js#L260) `checkoutStoreSale` | POS: chốt bán tại quầy (thu tiền, trừ kho); có gắn thành viên thì cộng điểm |
| GET | `/api/orders/staff` | staff | [staffOrder.controller.js](../backend/src/controllers/staffOrder.controller.js#L13) `list` | Staff xem hàng đợi / lịch sử đơn (đơn online và đơn tại quầy) |
| GET | `/api/orders/staff/:id` | staff | [staffOrder.controller.js](../backend/src/controllers/staffOrder.controller.js#L30) `get` | Staff xem chi tiết đơn để chuẩn bị và giao hàng |
| PATCH | `/api/orders/staff/:id/status` | staff | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `updateOrderStatus` |  |
| POST | `/api/orders/staff/:id/cancel` | staff | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `cancelOrder` |  |
| GET | `/api/orders/refunds` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `listRefunds` |  |
| GET | `/api/orders` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `listOrders` |  |
| GET | `/api/orders/:id` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `getOrder` |  |
| PATCH | `/api/orders/:id/status` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `updateOrderStatus` |  |
| POST | `/api/orders/:id/cancel` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `cancelOrder` |  |
| POST | `/api/orders/:id/issues` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `handleOrderIssue` |  |
| PATCH | `/api/orders/:id/issues/:issueId` | admin | [order.controller.js](../backend/src/controllers/order.controller.js#L1) `resolveOrderIssue` |  |

### `/api/payments` · [payment.routes.js](../backend/src/routes/payment.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| POST | `/api/payments/online` | customer | [payment.controller.js](../backend/src/controllers/payment.controller.js#L23) `createOnlinePayment` | UC-08.2 Tạo link thanh toán VNPay cho đơn đang chờ thanh toán |
| GET | `/api/payments/vnpay/return` | public | [payment.controller.js](../backend/src/controllers/payment.controller.js#L40) `vnpayReturn` | VNPay chuyển trình duyệt về: kiểm tra chữ ký, ghi nhận kết quả, chuyển tới trang kết quả |
| GET | `/api/payments/vnpay/mobile-return` | public | [payment.controller.js](../backend/src/controllers/payment.controller.js#L48) `vnpayMobileReturn` | VNPay chuyển về cho app mobile: ghi nhận kết quả rồi mở app bằng deep link cố định |
| GET | `/api/payments/vnpay/ipn` | public | [payment.controller.js](../backend/src/controllers/payment.controller.js#L56) `vnpayIpn` | VNPay gọi server báo kết quả (IPN), trả mã phản hồi theo quy định VNPay |
| GET | `/api/payments/mock/pay` | public | [payment.controller.js](../backend/src/controllers/payment.controller.js#L70) `mockPay` | Trang thanh toán giả lập (chỉ bật khi PAYMENT_MOCK=true) |
| GET | `/api/payments/mock/complete` | public | [payment.controller.js](../backend/src/controllers/payment.controller.js#L88) `mockComplete` | Nhận kết quả từ trang giả lập (có chữ ký) và xử lý như cổng thật |
| GET | `/api/payments/orders` | staff | [payment.controller.js](../backend/src/controllers/payment.controller.js#L142) `listStoreOrdersToPay` | Staff xem các đơn tại quầy đang chờ thu tiền |
| GET | `/api/payments/receipt/:orderId` | staff, admin | [payment.controller.js](../backend/src/controllers/payment.controller.js#L184) `getReceipt` | Dữ liệu hóa đơn để in của đơn đã thanh toán |
| POST | `/api/payments/cash` | staff | [payment.controller.js](../backend/src/controllers/payment.controller.js#L152) `processCashPayment` | UC-23.1 Thu tiền mặt (tính tiền thối) |
| POST | `/api/payments/card` | staff | [payment.controller.js](../backend/src/controllers/payment.controller.js#L163) `processCardPayment` | UC-23.2 Thu tiền bằng thẻ / ví điện tử (ghi mã giao dịch) |
| GET | `/api/payments/admin` | admin | [payment.controller.js](../backend/src/controllers/payment.controller.js#L264) `listPayments` | UC-41.1 Admin xem tất cả giao dịch thanh toán |
| GET | `/api/payments/admin/failed` | admin | [payment.controller.js](../backend/src/controllers/payment.controller.js#L266) `listFailedPayments` | UC-41.2 Admin xem giao dịch thất bại |
| GET | `/api/payments/admin/pending` | admin | [payment.controller.js](../backend/src/controllers/payment.controller.js#L268) `listPendingPayments` | UC-41.3 Admin xem giao dịch đang chờ |
| PATCH | `/api/payments/admin/:id/resolve` | admin | [payment.controller.js](../backend/src/controllers/payment.controller.js#L271) `handlePaymentError` | UC-41.4 Admin xử lý giao dịch lỗi: xác nhận đã trả / đánh dấu thất bại / bỏ qua |

### `/api/transactions` · [transaction.routes.js](../backend/src/routes/transaction.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/transactions` | staff, admin | [transaction.controller.js](../backend/src/controllers/transaction.controller.js#L74) `listTransactions` | UC-35.1 Xem / tìm giao dịch (admin thấy tổng tiền; staff chỉ thấy tiền thu hôm nay) |
| GET | `/api/transactions/:id` | staff, admin | [transaction.controller.js](../backend/src/controllers/transaction.controller.js#L119) `getTransaction` | UC-35.2 Xem chi tiết một giao dịch |

### `/api/promotions` · [promotion.routes.js](../backend/src/routes/promotion.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/promotions` | public | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L21) `listPromotions` | UC-02.4/20.1 Xem các khuyến mãi đang chạy |
| POST | `/api/promotions/apply` | staff | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L34) `applyPromotion` | UC-20.2 Staff tính thử khuyến mãi cho hóa đơn (chỉ xem trước, không lưu) |
| GET | `/api/promotions/manage` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L148) `listAllPromotions` | UC-37.1 Admin xem tất cả khuyến mãi |
| POST | `/api/promotions` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L168) `createPromotion` | UC-37.2 Tạo khuyến mãi |
| PUT | `/api/promotions/:id` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L177) `updatePromotion` | UC-37.3 Sửa khuyến mãi |
| PATCH | `/api/promotions/:id/activate` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L190) `activatePromotion` | UC-37.4 Kích hoạt khuyến mãi |
| PATCH | `/api/promotions/:id/suspend` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L201) `suspendPromotion` | UC-37.5 Tạm ngưng khuyến mãi |
| DELETE | `/api/promotions/:id` | admin | [promotion.controller.js](../backend/src/controllers/promotion.controller.js#L208) `deletePromotion` | UC-37.6 Xóa mềm khuyến mãi |

### `/api/discount-codes` · [discountCode.routes.js](../backend/src/routes/discountCode.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| POST | `/api/discount-codes/validate` | customer | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L58) `validateDiscountCode` | Khách kiểm tra mã giảm giá khi thanh toán (hợp lệ không, giảm bao nhiêu) |
| GET | `/api/discount-codes` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L74) `listDiscountCodes` | UC-38.1 Admin xem / tìm mã giảm giá |
| POST | `/api/discount-codes` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L90) `createDiscountCode` | UC-38.2 Tạo mã giảm giá (mặc định chưa kích hoạt) |
| PUT | `/api/discount-codes/:id` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L99) `updateDiscountCode` | UC-38.3 Sửa mã giảm giá (không đổi được mã code) |
| PATCH | `/api/discount-codes/:id/activate` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L112) `activateDiscountCode` | UC-38.4 Kích hoạt mã giảm giá |
| PATCH | `/api/discount-codes/:id/suspend` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L124) `suspendDiscountCode` | UC-38.5 Tạm ngưng mã giảm giá |
| DELETE | `/api/discount-codes/:id` | admin | [discountCode.controller.js](../backend/src/controllers/discountCode.controller.js#L135) `deleteDiscountCode` | UC-38.6 Xóa mềm mã giảm giá (đơn cũ vẫn giữ tham chiếu) |

### `/api/membership` · [membership.routes.js](../backend/src/routes/membership.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/membership/me` | customer | [membership.controller.js](../backend/src/controllers/membership.controller.js#L17) `getMyMembership` | UC-12.1 Khách xem điểm và hạng thành viên của mình |
| GET | `/api/membership/me/history` | customer | [membership.controller.js](../backend/src/controllers/membership.controller.js#L29) `getMyPointHistory` | UC-12.2 Khách xem lịch sử điểm (mới nhất trước) |
| GET | `/api/membership/lookup` | staff, admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L51) `lookupMemberCode` | Staff tra mã thành viên QUICK-… ra id khách |
| GET | `/api/membership/members` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L82) `listMembers` | UC-39.1/39.2 Admin xem / tìm thành viên |
| GET | `/api/membership/members/:id` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L93) `getMember` | UC-39.3 Admin xem chi tiết thành viên |
| POST | `/api/membership/members/:id/points` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L146) `adjustPoints` | UC-39.5 Admin cộng / trừ điểm (bắt buộc lý do, không để âm) |
| GET | `/api/membership/tiers` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L100) `listTiers` | UC-39.4 Danh sách hạng thành viên |
| POST | `/api/membership/tiers` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L123) `createTier` | UC-39.4 Thêm hạng thành viên |
| PUT | `/api/membership/tiers/:id` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L130) `updateTier` | UC-39.4 Sửa hạng thành viên |
| DELETE | `/api/membership/tiers/:id` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L139) `deleteTier` | UC-39.4 Xóa hạng thành viên |
| GET | `/api/membership/history` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L185) `listPointHistory` | UC-39.6 Admin xem lịch sử điểm |
| GET | `/api/membership/redemptions` | admin | [membership.controller.js](../backend/src/controllers/membership.controller.js#L187) `listRedemptions` | UC-39.7 Admin xem lịch sử đổi điểm |

### `/api/reviews` · [review.routes.js](../backend/src/routes/review.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/reviews/product/:productId` | public | [review.controller.js](../backend/src/controllers/review.controller.js#L36) `listProductReviews` | UC-40.1 Xem đánh giá công khai của một sản phẩm |
| GET | `/api/reviews/store` | public | [review.controller.js](../backend/src/controllers/review.controller.js#L48) `listStoreReviews` | UC-40.2 Xem đánh giá công khai của cửa hàng |
| GET | `/api/reviews/mine/eligible` | customer | [review.controller.js](../backend/src/controllers/review.controller.js#L63) `listEligibleReviews` | Các món trong đơn đã nhận mà khách còn đánh giá được |
| GET | `/api/reviews/mine` | customer | [review.controller.js](../backend/src/controllers/review.controller.js#L79) `listMyReviews` | Khách xem các đánh giá của mình |
| POST | `/api/reviews` | customer | [review.controller.js](../backend/src/controllers/review.controller.js#L87) `addReview` | UC-11.1 Thêm đánh giá (chỉ món thuộc đơn đã nhận, mỗi món một lần) |
| PUT | `/api/reviews/:id` | customer | [review.controller.js](../backend/src/controllers/review.controller.js#L117) `updateReview` | UC-11.2 Sửa đánh giá của mình |
| DELETE | `/api/reviews/:id` | customer | [review.controller.js](../backend/src/controllers/review.controller.js#L133) `deleteReview` | UC-11.3 Xóa đánh giá của mình |
| GET | `/api/reviews/admin/all` | admin | [review.controller.js](../backend/src/controllers/review.controller.js#L144) `listReviewsAdmin` | Admin xem tất cả đánh giá (gồm đã ẩn / đã xóa) |
| PATCH | `/api/reviews/:id/hide` | admin | [review.controller.js](../backend/src/controllers/review.controller.js#L155) `hideReview` | UC-40.3 Ẩn / hiện đánh giá (có lý do, ghi nhật ký) |
| PATCH | `/api/reviews/:id/violation` | admin | [review.controller.js](../backend/src/controllers/review.controller.js#L177) `handleViolatingReview` | UC-40.4 Xử lý đánh giá vi phạm: bỏ qua hoặc ẩn (bắt buộc lý do) |

### `/api/support` · [support.routes.js](../backend/src/routes/support.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| POST | `/api/support` | customer | [support.controller.js](../backend/src/controllers/support.controller.js#L156) `submitSupportRequest` | Khách gửi yêu cầu hỗ trợ / khiếu nại |
| GET | `/api/support/my` | customer | [support.controller.js](../backend/src/controllers/support.controller.js#L177) `listMySupportRequests` | Khách xem các yêu cầu hỗ trợ của mình |
| GET | `/api/support` | staff, admin | [support.controller.js](../backend/src/controllers/support.controller.js#L50) `listSupportRequests` | UC-19.3 Staff xem danh sách yêu cầu hỗ trợ / khiếu nại |
| GET | `/api/support/:id` | customer, staff, admin | [support.controller.js](../backend/src/controllers/support.controller.js#L98) `getSupportRequest` | UC-19.3 Xem chi tiết một yêu cầu / khiếu nại |
| PATCH | `/api/support/:id/handle` | staff, admin | [support.controller.js](../backend/src/controllers/support.controller.js#L106) `handleComplaint` | UC-19.3 Staff phản hồi và / hoặc chuyển trạng thái khiếu nại |

### `/api/customers` · [customer.routes.js](../backend/src/routes/customer.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/customers` | staff, admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L25) `listCustomers` | UC-19.1 Xem / tìm danh sách khách hàng (staff thấy liên hệ đã che) |
| POST | `/api/customers/members` | staff, admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L196) `registerMember` | Đăng ký thành viên tại quầy: họ tên + email (bắt buộc), SĐT tùy chọn; gửi email mời đặt mật khẩu |
| GET | `/api/customers/members/lookup` | staff, admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L234) `findMember` | Tìm thành viên ở quầy theo SĐT, email hoặc mã thành viên |
| GET | `/api/customers/:id` | staff, admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L74) `getCustomer` | UC-19.2 Xem chi tiết khách: thông tin, hạng, tóm tắt đơn hàng và khiếu nại |
| PUT | `/api/customers/:id` | admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L129) `updateCustomer` | UC-29.4 Admin sửa họ tên, số điện thoại của khách |
| PATCH | `/api/customers/:id/unlock` | admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L145) `unlockCustomer` | UC-29.5 Admin mở khóa tài khoản khách |
| DELETE | `/api/customers/:id` | admin | [customer.controller.js](../backend/src/controllers/customer.controller.js#L158) `deleteCustomer` | UC-29.6 Admin xóa mềm tài khoản khách (không xóa khi còn đơn đang xử lý) |

### `/api/staff` · [staff.routes.js](../backend/src/routes/staff.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/staff` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L58) `listStaff` | UC-30.1 Admin xem / tìm nhân viên |
| POST | `/api/staff` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L77) `addStaff` | UC-30.2 Thêm nhân viên |
| PUT | `/api/staff/:id` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L101) `updateStaff` | UC-30.3 Sửa thông tin nhân viên (không đổi email, mật khẩu) |
| PATCH | `/api/staff/:id/lock` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L113) `lockStaff` | UC-30.4 Khóa tài khoản nhân viên |
| PATCH | `/api/staff/:id/unlock` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L124) `unlockStaff` | UC-30.5 Mở khóa tài khoản nhân viên |
| GET | `/api/staff/:id/activity` | admin | [staff.controller.js](../backend/src/controllers/staff.controller.js#L136) `getStaffActivity` | UC-30.6 Xem nhật ký thao tác của nhân viên |

### `/api/stores` · [store.routes.js](../backend/src/routes/store.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/stores` | public | [store.controller.js](../backend/src/controllers/store.controller.js#L53) `listStores` | UC-31.1 Xem danh sách cửa hàng |
| POST | `/api/stores` | admin | [store.controller.js](../backend/src/controllers/store.controller.js#L59) `addStore` | UC-31.2 Thêm cửa hàng |
| PUT | `/api/stores/:id` | admin | [store.controller.js](../backend/src/controllers/store.controller.js#L68) `updateStore` | UC-31.3 Sửa thông tin cửa hàng |
| PATCH | `/api/stores/:id/close` | admin | [store.controller.js](../backend/src/controllers/store.controller.js#L77) `closeStore` | UC-31.4 Đóng cửa hàng |
| PATCH | `/api/stores/:id/open` | admin | [store.controller.js](../backend/src/controllers/store.controller.js#L89) `openStore` | UC-31.5 Mở lại cửa hàng |
| PUT | `/api/stores/:id/hours` | admin | [store.controller.js](../backend/src/controllers/store.controller.js#L100) `updateStoreHours` | UC-31.6 Cập nhật giờ mở cửa |

### `/api/work-shifts` · [workShift.routes.js](../backend/src/routes/workShift.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/work-shifts/my` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L68) `listMyShifts` | UC-24 Nhân viên xem ca hiện tại, ca sắp tới, lịch sử ca và thu nhập tháng này |
| POST | `/api/work-shifts/clock-in` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L118) `clockIn` | UC-24 Vào ca (mở trước 30 phút, không vào khi đang ở ca khác) |
| POST | `/api/work-shifts/clock-out` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L140) `clockOut` | UC-24 Ra ca (ra sớm vẫn ghi nhận và đánh dấu về sớm) |
| GET | `/api/work-shifts/open` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L359) `listOpenSlots` | Nhân viên xem ca trống 14 ngày tới (đánh dấu ca đã đầy / trùng giờ / của mình) |
| POST | `/api/work-shifts/slots/:id/claim` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L380) `claimSlot` | Nhân viên nhận ca (chống vượt số chỗ khi nhiều người bấm cùng lúc) |
| POST | `/api/work-shifts/:id/release` | staff | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L404) `releaseShift` | Nhân viên hủy nhận ca (chỉ khi còn ít nhất 12 giờ trước giờ bắt đầu) |
| GET | `/api/work-shifts/slots` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L290) `listSlots` | Admin xem các ca trống trong khoảng ngày và ai đã nhận |
| POST | `/api/work-shifts/slots` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L300) `createSlots` | Admin mở ca trống cho nhiều ngày (giờ, số người cần, ghi chú) |
| PUT | `/api/work-shifts/slots/:id` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L321) `updateSlot` | Admin sửa ca trống (đổi giờ chỉ khi chưa ai nhận; số người cần không thấp hơn số đã nhận) |
| DELETE | `/api/work-shifts/slots/:id` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L347) `deleteSlot` | Admin xóa ca trống chưa ai nhận |
| GET | `/api/work-shifts` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L199) `listShifts` | Admin xem chấm công các ca + tổng hợp giờ làm và lương theo nhân viên |
| DELETE | `/api/work-shifts/:id` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L419) `deleteShift` | Admin gỡ nhân viên khỏi ca chưa bắt đầu (trả lại chỗ cho ca trống) |
| PATCH | `/api/work-shifts/:id/close` | admin | [workShift.controller.js](../backend/src/controllers/workShift.controller.js#L432) `closeShift` | Admin chốt ca khi nhân viên quên ra ca |

### `/api/dashboard` · [dashboard.routes.js](../backend/src/routes/dashboard.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/dashboard/admin` | admin | [dashboard.controller.js](../backend/src/controllers/dashboard.controller.js#L5) `adminDashboard` | Dashboard admin: doanh thu, đơn, sản phẩm bán chạy, tồn kho theo khoảng ngày |
| GET | `/api/dashboard/staff` | staff, admin | [dashboard.controller.js](../backend/src/controllers/dashboard.controller.js#L24) `staffDashboard` | Dashboard staff: hàng đợi đơn, số đơn, tồn kho; chỉ xem doanh thu của hôm nay |

### `/api/notifications` · [notification.routes.js](../backend/src/routes/notification.routes.js)

| Method | Đường dẫn | Ai được gọi | Hàm xử lý | Làm gì |
|---|---|---|---|---|
| GET | `/api/notifications` | public | [notification.controller.js](../backend/src/controllers/notification.controller.js#L31) `listMine` | Danh sách thông báo của người đang đăng nhập + số chưa đọc |
| PATCH | `/api/notifications/read-all` | public | [notification.controller.js](../backend/src/controllers/notification.controller.js#L59) `readAll` | Đánh dấu tất cả thông báo là đã đọc |
| GET | `/api/notifications/admin` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L85) `adminList` | Admin xem danh sách thông báo đã soạn |
| GET | `/api/notifications/settings` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L138) `getSettings` | Xem cấu hình thông báo tự động |
| PUT | `/api/notifications/settings` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L140) `saveSettings` | Lưu cấu hình thông báo tự động |
| POST | `/api/notifications/admin` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L107) `create` | Admin tạo thông báo (bản nháp) |
| PUT | `/api/notifications/admin/:id` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L112) `update` | Admin sửa thông báo |
| PATCH | `/api/notifications/admin/:id/publish` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L119) `publish` | Admin đăng thông báo cho người nhận |
| PATCH | `/api/notifications/admin/:id/archive` | admin | [notification.controller.js](../backend/src/controllers/notification.controller.js#L131) `archive` | Admin gỡ / lưu trữ thông báo |
| PATCH | `/api/notifications/:id/read` | public | [notification.controller.js](../backend/src/controllers/notification.controller.js#L48) `readOne` | Đánh dấu một thông báo là đã đọc |


## 2. Backend — service (nghiệp vụ dùng chung)

Logic nghiệp vụ được nhiều controller gọi: giá, kho, thanh toán, ví, điểm…

**[services/activity.service.js](../backend/src/services/activity.service.js)**
- [`logActivity`](../backend/src/services/activity.service.js#L4) — Ghi nhật ký thao tác của nhân viên / admin (không làm hỏng request nếu ghi lỗi)

**[services/activityLog.service.js](../backend/src/services/activityLog.service.js)**
- [`log`](../backend/src/services/activityLog.service.js#L4) — Ghi nhật ký thao tác (bản cũ, dùng cho sản phẩm)

**[services/cart.service.js](../backend/src/services/cart.service.js)**
- [`buildCartView`](../backend/src/services/cart.service.js#L7) — Dựng giỏ hàng trả về: dòng hàng, tổng tiền, cảnh báo ngừng bán / thiếu hàng
- [`mutateCart`](../backend/src/services/cart.service.js#L44) — Sửa giỏ hàng an toàn khi nhiều tab cùng sửa (so phiên bản trước khi lưu)
- [`removePurchasedItems`](../backend/src/services/cart.service.js#L58) — Bỏ các món đã đặt khỏi giỏ sau khi tạo đơn
- [`restorePurchasedItems`](../backend/src/services/cart.service.js#L70) — Trả lại các món vào giỏ khi tạo đơn thất bại

**[services/checkout.service.js](../backend/src/services/checkout.service.js)**
- [`ttlMs`](../backend/src/services/checkout.service.js#L13) — Thời gian giữ hàng chờ thanh toán (mặc định 15 phút)
- [`loadCartLines`](../backend/src/services/checkout.service.js#L16) — Đọc giỏ thành các dòng hợp lệ + vấn đề (ngừng bán, thiếu hàng)
- [`loadDiscount`](../backend/src/services/checkout.service.js#L43) — Tìm mã giảm giá đang bật và số lần khách đã dùng
- [`toSummary`](../backend/src/services/checkout.service.js#L53) — Dựng tóm tắt giá trả về cho trang thanh toán
- [`buildSummary`](../backend/src/services/checkout.service.js#L69) — Tính tóm tắt giá của giỏ (khi tạo đơn thì mã sai báo lỗi; khi xem trước thì chỉ cảnh báo)
- [`previewCheckout`](../backend/src/services/checkout.service.js#L90) — Xem trước đơn: giá, khuyến mãi, mã giảm giá, ví, giờ nhận hàng
- [`orderView`](../backend/src/services/checkout.service.js#L101) — Dữ liệu đơn trả về sau khi tạo
- [`createOrder`](../backend/src/services/checkout.service.js#L109) — Tạo đơn: kiểm tra giá, trừ kho, giữ mã giảm giá, trừ ví (chống đặt trùng bằng idempotencyKey)

**[services/dashboard.service.js](../backend/src/services/dashboard.service.js)**
- [`startOfDayVN`](../backend/src/services/dashboard.service.js#L12) — 00:00 theo giờ Việt Nam của ngày chứa thời điểm cho trước
- [`vnParts`](../backend/src/services/dashboard.service.js#L14) — Dời thời điểm sang giờ Việt Nam để đọc ngày / giờ
- [`dayKey`](../backend/src/services/dashboard.service.js#L16) — Chuỗi ngày "YYYY-MM-DD" theo giờ Việt Nam
- [`hourOf`](../backend/src/services/dashboard.service.js#L18) — Giờ trong ngày (0–23) theo giờ Việt Nam
- [`parseDayVN`](../backend/src/services/dashboard.service.js#L20) — Đổi "YYYY-MM-DD" thành 00:00 ngày đó theo giờ Việt Nam
- [`resolveRange`](../backend/src/services/dashboard.service.js#L27) — Tính khoảng thời gian báo cáo (hôm nay / 7 / 30 / 90 ngày / tùy chọn) và kỳ trước để so sánh
- [`pctChange`](../backend/src/services/dashboard.service.js#L46) — Phần trăm thay đổi so với kỳ trước (null nếu kỳ trước bằng 0)
- [`sum`](../backend/src/services/dashboard.service.js#L48) — Tổng theo một hàm lấy giá trị
- [`buildReport`](../backend/src/services/dashboard.service.js#L51) — Tính toàn bộ số liệu dashboard từ dữ liệu đã tải (doanh thu, đơn, biểu đồ, top sản phẩm…)
- [`loadDashboard`](../backend/src/services/dashboard.service.js#L120) — Tải dữ liệu từ database rồi dựng báo cáo dashboard

**[services/discountReservation.service.js](../backend/src/services/discountReservation.service.js)**
- [`reserve`](../backend/src/services/discountReservation.service.js#L6) — Giữ một lượt dùng mã giảm giá cho đơn (chặn vượt tổng lượt và lượt mỗi khách)
- [`release`](../backend/src/services/discountReservation.service.js#L25) — Trả lại lượt dùng mã giảm giá khi đơn bị hủy / hết hạn

**[services/inAppNotification.service.js](../backend/src/services/inAppNotification.service.js)**
- [`getSettings`](../backend/src/services/inAppNotification.service.js#L6) — Đọc cấu hình thông báo tự động
- [`insertOnce`](../backend/src/services/inAppNotification.service.js#L9) — Tạo thông báo trong web một lần duy nhất cho mỗi sự kiện
- [`orderEvent`](../backend/src/services/inAppNotification.service.js#L19) — Tạo thông báo cho khách / staff khi đơn đổi trạng thái hoặc thanh toán
- [`withdrawOffer`](../backend/src/services/inAppNotification.service.js#L47) — Gỡ thông báo khuyến mãi khi khuyến mãi bị tắt / xóa
- [`announceOffer`](../backend/src/services/inAppNotification.service.js#L54) — Thông báo cho khách khi có khuyến mãi mới

**[services/mail.service.js](../backend/src/services/mail.service.js)**
- [`getTransporter`](../backend/src/services/mail.service.js#L4) — Tạo kết nối SMTP từ cấu hình .env (không có thì chỉ in email ra console)
- [`sendMail`](../backend/src/services/mail.service.js#L23) — Gửi email (chưa cấu hình SMTP thì in nội dung ra console)
- [`verifyMail`](../backend/src/services/mail.service.js#L33) — Kiểm tra kết nối và đăng nhập SMTP (không gửi email)

**[services/memberInvite.service.js](../backend/src/services/memberInvite.service.js)**
- [`sha256`](../backend/src/services/memberInvite.service.js#L6) — Băm SHA-256 (dùng để lưu token đặt mật khẩu)
- [`esc`](../backend/src/services/memberInvite.service.js#L8) — Escape HTML khi chèn vào email
- [`sendSetPasswordInvite`](../backend/src/services/memberInvite.service.js#L11) — Gửi email chào mừng thành viên đăng ký tại quầy kèm link tự đặt mật khẩu

**[services/mock.service.js](../backend/src/services/mock.service.js)**
- [`enabled`](../backend/src/services/mock.service.js#L4) — Cổng thanh toán giả lập có đang bật không (PAYMENT_MOCK=true, không phải production)
- [`backendUrl`](../backend/src/services/mock.service.js#L7) — Địa chỉ backend dùng trong link thanh toán giả lập
- [`sign`](../backend/src/services/mock.service.js#L10) — Ký kết quả giả lập để không ai tự gõ URL "thanh toán thành công"
- [`verify`](../backend/src/services/mock.service.js#L13) — Kiểm tra chữ ký kết quả giả lập
- [`createPaymentUrl`](../backend/src/services/mock.service.js#L19) — Tạo link tới trang thanh toán giả lập
- [`completeUrl`](../backend/src/services/mock.service.js#L21) — Tạo link hoàn tất có chữ ký cho trang giả lập

**[services/notification.service.js](../backend/src/services/notification.service.js)**
- [`escape`](../backend/src/services/notification.service.js#L20) — Escape HTML khi chèn vào email
- [`money`](../backend/src/services/notification.service.js#L22) — Định dạng tiền VND cho email
- [`notifyOrder`](../backend/src/services/notification.service.js#L25) — Gửi email + thông báo trong web khi đơn đổi trạng thái (lỗi gửi không làm hỏng nghiệp vụ)

**[services/orderCode.service.js](../backend/src/services/orderCode.service.js)**
- [`generateOrderCode`](../backend/src/services/orderCode.service.js#L4) — Sinh mã đơn CM-YYYYMMDD-0001 (đếm lại mỗi ngày)

**[services/payment.service.js](../backend/src/services/payment.service.js)**
- [`ttlMs`](../backend/src/services/payment.service.js#L10) — Thời gian giữ hàng chờ thanh toán (mặc định 15 phút)
- [`expiresAtOf`](../backend/src/services/payment.service.js#L12) — Hạn thanh toán của một đơn
- [`expireStaleOrders`](../backend/src/services/payment.service.js#L16) — Đơn quá hạn thanh toán: chuyển failed, trả kho, đóng giao dịch đang chờ, hoàn ví
- [`startExpiryJob`](../backend/src/services/payment.service.js#L44) — Chạy nền mỗi phút: hủy đơn quá hạn, đối soát ví, cộng điểm còn sót
- [`raiseSystemIssue`](../backend/src/services/payment.service.js#L59) — Tự mở sự cố trên đơn khi thanh toán bất thường để admin xử lý
- [`txnRefFor`](../backend/src/services/payment.service.js#L68) — Sinh mã tham chiếu giao dịch gửi sang cổng (mã đơn + số lần thử)
- [`startOnlinePayment`](../backend/src/services/payment.service.js#L71) — Bắt đầu thanh toán online: tạo giao dịch chờ và link VNPay (dùng lại link cũ nếu còn hạn)
- [`confirmReceivedPayment`](../backend/src/services/payment.service.js#L127) — Xác nhận đơn đã nhận tiền: chuyển confirmed, gửi thông báo (gọi lại nhiều lần vẫn an toàn)
- [`applyGatewayResult`](../backend/src/services/payment.service.js#L154) — Áp kết quả từ cổng thanh toán: thành công / thất bại / chờ; tiền về muộn thì mở sự cố

**[services/pickupSchedule.service.js](../backend/src/services/pickupSchedule.service.js)**
- [`minutes`](../backend/src/services/pickupSchedule.service.js#L3) — Đổi "HH:mm" thành số phút trong ngày
- [`formatOpening`](../backend/src/services/pickupSchedule.service.js#L8) — Mô tả giờ mở cửa sắp tới
- [`pickupSchedule`](../backend/src/services/pickupSchedule.service.js#L11) — Cửa hàng có đang mở không và khi nào bắt đầu chuẩn bị đơn

**[services/points.service.js](../backend/src/services/points.service.js)**
- [`pointsFor`](../backend/src/services/points.service.js#L4) — Số điểm của một số tiền (10.000 ₫ = 1 điểm, làm tròn xuống)
- [`awardPointsForOrder`](../backend/src/services/points.service.js#L6) — Cộng điểm cho đơn đã hoàn tất và đã thanh toán (mỗi đơn một lần) và cập nhật hạng

**[services/pricing.service.js](../backend/src/services/pricing.service.js)**
- [`DiscountCodeError`](../backend/src/services/pricing.service.js#L1) — —
- [`inRange`](../backend/src/services/pricing.service.js#L4) — Thời điểm hiện tại có nằm trong khoảng ngày bắt đầu / kết thúc không
- [`promoApplies`](../backend/src/services/pricing.service.js#L7) — Khuyến mãi có áp dụng cho dòng hàng này không (theo phạm vi)
- [`rawDiscount`](../backend/src/services/pricing.service.js#L14) — Số tiền giảm của mã giảm giá trước khi giới hạn
- [`validateDiscountCode`](../backend/src/services/pricing.service.js#L21) — Kiểm tra mã giảm giá dùng được không (thời gian, lượt, đơn tối thiểu)
- [`computePricing`](../backend/src/services/pricing.service.js#L32) — Tính giá đơn: tạm tính, khuyến mãi, mã giảm giá, tổng tiền

**[services/productImages.service.js](../backend/src/services/productImages.service.js)**
- [`format`](../backend/src/services/productImages.service.js#L9) — Nhận dạng định dạng ảnh từ nội dung file (png, jpg, webp, gif)
- [`list`](../backend/src/services/productImages.service.js#L17) — Danh sách ảnh trong thư viện ảnh sản phẩm
- [`clean`](../backend/src/services/productImages.service.js#L23) — Kiểm tra ảnh sản phẩm gửi lên chỉ là ảnh trong thư viện

**[services/promotion.service.js](../backend/src/services/promotion.service.js)**
- [`isEligibleLine`](../backend/src/services/promotion.service.js#L4) — Dòng hàng có thuộc phạm vi của khuyến mãi không
- [`isRunning`](../backend/src/services/promotion.service.js#L12) — Khuyến mãi có đang chạy không (đang bật và trong khoảng ngày)
- [`findRunning`](../backend/src/services/promotion.service.js#L16) — Lấy các khuyến mãi đang chạy
- [`evaluate`](../backend/src/services/promotion.service.js#L22) — Tính khuyến mãi cho các dòng hàng: có áp dụng không và giảm bao nhiêu

**[services/stock.service.js](../backend/src/services/stock.service.js)**
- [`opt`](../backend/src/services/stock.service.js#L7) — Tùy chọn truy vấn kèm session (nếu có transaction)
- [`expiryOf`](../backend/src/services/stock.service.js#L10) — Hạn dùng của lô (lô không có hạn xếp cuối)
- [`fefo`](../backend/src/services/stock.service.js#L12) — So sánh lô theo hạn dùng sớm nhất trước (FEFO)
- [`mergeItems`](../backend/src/services/stock.service.js#L15) — Gộp các dòng trùng sản phẩm
- [`sellableBatches`](../backend/src/services/stock.service.js#L26) — Các lô còn hàng và chưa hết hạn của sản phẩm, sắp theo FEFO
- [`assertAvailable`](../backend/src/services/stock.service.js#L33) — Kiểm tra tồn kho còn bán được cho cả đơn, báo tất cả sản phẩm thiếu một lượt
- [`deductOne`](../backend/src/services/stock.service.js#L48) — Trừ kho một sản phẩm theo FEFO và ghi lịch sử kho
- [`deductStock`](../backend/src/services/stock.service.js#L97) — Trừ kho khi tạo đơn (thiếu hàng thì báo 409 kèm danh sách)
- [`releaseStock`](../backend/src/services/stock.service.js#L111) — Trả hàng về đúng các lô khi đơn bị hủy / hết hạn (gọi lại nhiều lần vẫn an toàn)
- [`receiveBatch`](../backend/src/services/stock.service.js#L151) — Nhập hàng: tạo lô mới và ghi lịch sử kho
- [`removeStock`](../backend/src/services/stock.service.js#L166) — Lấy hàng ra khỏi kho (hỏng, hết hạn, kiểm kê thiếu, điều chỉnh giảm)
- [`setStockTo`](../backend/src/services/stock.service.js#L203) — Đưa tồn kho về đúng số lượng mới (tăng thì tạo lô điều chỉnh, giảm thì lấy theo FEFO)
- [`sellableMap`](../backend/src/services/stock.service.js#L217) — Số lượng còn bán được của từng sản phẩm (không tính lô đã hết hạn)

**[services/storeOrder.service.js](../backend/src/services/storeOrder.service.js)**
- [`normalizeItems`](../backend/src/services/storeOrder.service.js#L15) — Kiểm tra và gộp các dòng hàng của hóa đơn tại quầy
- [`checkoutSale`](../backend/src/services/storeOrder.service.js#L29) — POS: chốt bán tại quầy trong một lần (đơn, giao dịch, trừ kho), có gắn thành viên nếu chọn
- [`buildQuote`](../backend/src/services/storeOrder.service.js#L99) — Tính hóa đơn tại quầy: giá từ database, tồn kho, khuyến mãi
- [`createStoreOrder`](../backend/src/services/storeOrder.service.js#L144) — Tạo đơn tại quầy chờ thu tiền (trừ kho ngay)

**[services/suggestion.service.js](../backend/src/services/suggestion.service.js)**
- [`basketMain`](../backend/src/services/suggestion.service.js#L2) — Gợi ý giỏ món chính theo ngân sách (chưa triển khai)
- [`basketSnack`](../backend/src/services/suggestion.service.js#L6) — Gợi ý giỏ ăn vặt theo ngân sách (chưa triển khai)
- [`basketHotCombo`](../backend/src/services/suggestion.service.js#L10) — Gợi ý combo hay được mua chung (chưa triển khai)
- [`basketMix`](../backend/src/services/suggestion.service.js#L14) — Gợi ý giỏ kết hợp món chính + ăn vặt (chưa triển khai)

**[services/vnpay.service.js](../backend/src/services/vnpay.service.js)**
- [`cfg`](../backend/src/services/vnpay.service.js#L4) — Đọc cấu hình VNPay từ .env
- [`isConfigured`](../backend/src/services/vnpay.service.js#L12) — Đã có mã TMN và secret của VNPay chưa
- [`vnTime`](../backend/src/services/vnpay.service.js#L15) — Thời gian theo giờ Việt Nam dạng yyyyMMddHHmmss
- [`canonical`](../backend/src/services/vnpay.service.js#L18) — Sắp xếp và mã hóa tham số đúng cách VNPay ký
- [`sign`](../backend/src/services/vnpay.service.js#L22) — Ký HMAC-SHA512 dữ liệu gửi VNPay
- [`plain`](../backend/src/services/vnpay.service.js#L25) — Bỏ dấu tiếng Việt cho nội dung đơn gửi VNPay
- [`createPaymentUrl`](../backend/src/services/vnpay.service.js#L28) — Tạo URL chuyển khách sang trang thanh toán VNPay
- [`verifyCallback`](../backend/src/services/vnpay.service.js#L60) — Kiểm tra chữ ký dữ liệu VNPay trả về và đổi mã phản hồi thành thành công / thất bại / chờ
- [`_sign`](../backend/src/services/vnpay.service.js#L95) — Hàm ký VNPay (xuất ra để kiểm thử)

**[services/wallet.service.js](../backend/src/services/wallet.service.js)**
- [`ensure`](../backend/src/services/wallet.service.js#L6) — Tạo ví cho khách nếu chưa có
- [`balance`](../backend/src/services/wallet.service.js#L12) — Số dư ví của khách
- [`move`](../backend/src/services/wallet.service.js#L17) — Cộng / trừ ví một lần duy nhất theo khóa (không cho âm, không ghi trùng)
- [`settleClosedOrder`](../backend/src/services/wallet.service.js#L41) — Đơn bị hủy / hết hạn: hoàn tiền ví và tiền đã trả vào ví, đổi giao dịch sang Refunded
- [`reconcile`](../backend/src/services/wallet.service.js#L71) — Đối soát các đơn đã đóng: trả kho, trả mã giảm giá, hoàn ví (chạy khi khởi động)


## 3. Backend — controller (xử lý từng API)

Mỗi hàm `exports.xxx` là một API trong bảng ở mục 1; các hàm còn lại là hàm phụ.

**[controllers/address.controller.js](../backend/src/controllers/address.controller.js)**
- [`sortAddresses`](../backend/src/controllers/address.controller.js#L10) — Sắp xếp địa chỉ: địa chỉ mặc định lên đầu
- [`loadCustomer`](../backend/src/controllers/address.controller.js#L14) — Lấy tài khoản khách đang đăng nhập (404 nếu không còn hoạt động)
- [`parseBody`](../backend/src/controllers/address.controller.js#L21) — Kiểm tra và chuẩn hóa dữ liệu địa chỉ gửi lên (tên người nhận, SĐT, địa chỉ, mặc định)
- [`findAddress`](../backend/src/controllers/address.controller.js#L40) — Tìm địa chỉ theo id trong danh sách của khách (404 nếu không có)
- [`listAddresses`](../backend/src/controllers/address.controller.js#L48) — UC-07.1 Xem danh sách địa chỉ của khách
- [`addAddress`](../backend/src/controllers/address.controller.js#L54) — UC-07.2 Thêm địa chỉ (địa chỉ đầu tiên tự thành mặc định)
- [`updateAddress`](../backend/src/controllers/address.controller.js#L68) — UC-07.3 Sửa địa chỉ
- [`deleteAddress`](../backend/src/controllers/address.controller.js#L81) — UC-07.4 Xóa địa chỉ (xóa địa chỉ mặc định thì chọn địa chỉ khác làm mặc định)

**[controllers/adminOrder.controller.js](../backend/src/controllers/adminOrder.controller.js)**
- [`escapeRegex`](../backend/src/controllers/adminOrder.controller.js#L27) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`isId`](../backend/src/controllers/adminOrder.controller.js#L29) — Kiểm tra chuỗi có phải ObjectId hợp lệ
- [`parseDate`](../backend/src/controllers/adminOrder.controller.js#L32) — Đọc ngày từ query; sai định dạng thì báo lỗi 400
- [`pick`](../backend/src/controllers/adminOrder.controller.js#L40) — Lấy giá trị query nếu nằm trong danh sách cho phép
- [`openIssues`](../backend/src/controllers/adminOrder.controller.js#L47) — Đếm số sự cố chưa xử lý của đơn
- [`listOrders`](../backend/src/controllers/adminOrder.controller.js#L50) — UC-34.1/34.2 Admin xem và tìm kiếm đơn (lọc theo trạng thái, nguồn, thanh toán, ngày, có sự cố)
- [`allowedTransition`](../backend/src/controllers/adminOrder.controller.js#L121) — Bước chuyển trạng thái tiếp theo của đơn (và có cần xác nhận đã thu tiền mặt không)
- [`getOrder`](../backend/src/controllers/adminOrder.controller.js#L128) — UC-34.3 Admin xem chi tiết đơn: khách, sản phẩm, giao dịch, lịch sử trạng thái, sự cố
- [`text`](../backend/src/controllers/adminOrder.controller.js#L197) — Kiểm tra chuỗi bắt buộc có độ dài trong giới hạn
- [`updateOrderStatus`](../backend/src/controllers/adminOrder.controller.js#L205) — Chuyển đơn sang bước kế tiếp (confirmed → preparing → ready_for_pickup → completed); đơn tiền mặt phải xác nhận đã thu; hoàn tất thì cộng điểm
- [`handleOrderIssue`](../backend/src/controllers/adminOrder.controller.js#L264) — UC-34.4 Ghi nhận sự cố của đơn
- [`resolveOrderIssue`](../backend/src/controllers/adminOrder.controller.js#L280) — UC-34.4 Đóng sự cố, ghi hướng xử lý
- [`cancelOrder`](../backend/src/controllers/adminOrder.controller.js#L300) — Hủy đơn (khách/staff/admin): kiểm tra quyền và trạng thái, trả kho, trả mã giảm giá, hoàn tiền vào ví
- [`listRefunds`](../backend/src/controllers/adminOrder.controller.js#L329) — Admin xem lịch sử hoàn tiền (lọc theo mã đơn, khoảng ngày)

**[controllers/auth.controller.js](../backend/src/controllers/auth.controller.js)**
- [`signToken`](../backend/src/controllers/auth.controller.js#L14) — Tạo JWT (hạn 1 ngày) chứa id và vai trò người dùng
- [`publicUser`](../backend/src/controllers/auth.controller.js#L18) — Thông tin người dùng trả về cho client (không có mật khẩu)
- [`escapeHtml`](../backend/src/controllers/auth.controller.js#L20) — Escape HTML khi chèn tên người dùng vào email
- [`sha256`](../backend/src/controllers/auth.controller.js#L22) — Băm SHA-256 (dùng để lưu token đặt lại mật khẩu)
- [`createCustomer`](../backend/src/controllers/auth.controller.js#L25) — Tạo tài khoản khách hàng hạng thấp nhất (dùng chung cho đăng ký thường và Google)
- [`register`](../backend/src/controllers/auth.controller.js#L34) — UC-01 Đăng ký tài khoản khách hàng
- [`login`](../backend/src/controllers/auth.controller.js#L54) — UC-03/14/26 Đăng nhập (khách, staff, admin); sai 5 lần thì khóa tạm 15 phút
- [`googleLogin`](../backend/src/controllers/auth.controller.js#L85) — Đăng nhập / đăng ký bằng Google: xác thực ID token, chưa có tài khoản thì tạo mới
- [`logout`](../backend/src/controllers/auth.controller.js#L128) — UC-04/15/27 Đăng xuất (client tự xóa token)
- [`getMe`](../backend/src/controllers/auth.controller.js#L131) — Lấy thông tin người đang đăng nhập
- [`forgotPassword`](../backend/src/controllers/auth.controller.js#L138) — UC-05/16 Quên mật khẩu: gửi link đặt lại mật khẩu qua email (hiệu lực 30 phút)
- [`resetPassword`](../backend/src/controllers/auth.controller.js#L166) — UC-05/16 Đặt mật khẩu mới bằng token trong link email

**[controllers/cart.controller.js](../backend/src/controllers/cart.controller.js)**
- [`parseQty`](../backend/src/controllers/cart.controller.js#L9) — Kiểm tra số lượng là số nguyên trong giới hạn cho phép
- [`assertSellable`](../backend/src/controllers/cart.controller.js#L16) — Chặn nếu sản phẩm ngừng bán hoặc số lượng vượt tồn kho còn bán được
- [`getCart`](../backend/src/controllers/cart.controller.js#L25) — UC-07.1 Xem giỏ hàng (kèm cảnh báo sản phẩm ngừng bán / thiếu hàng)
- [`addCartItem`](../backend/src/controllers/cart.controller.js#L30) — UC-07.2 Thêm sản phẩm vào giỏ (đã có thì cộng dồn số lượng)
- [`updateCartItem`](../backend/src/controllers/cart.controller.js#L46) — UC-07.3 Đổi số lượng một sản phẩm trong giỏ
- [`removeCartItem`](../backend/src/controllers/cart.controller.js#L59) — UC-07.4 Xóa sản phẩm khỏi giỏ

**[controllers/category.controller.js](../backend/src/controllers/category.controller.js)**
- [`slugify`](../backend/src/controllers/category.controller.js#L8) — Tạo slug từ tên danh mục (bỏ dấu, nối bằng gạch ngang)
- [`uniqueSlug`](../backend/src/controllers/category.controller.js#L13) — Tạo slug không trùng (thêm hậu tố số nếu đã có)
- [`parseBody`](../backend/src/controllers/category.controller.js#L21) — Kiểm tra dữ liệu danh mục gửi lên
- [`loadCategory`](../backend/src/controllers/category.controller.js#L38) — Lấy danh mục theo id (404 nếu không có)
- [`listCategories`](../backend/src/controllers/category.controller.js#L46) — UC-33.1 Xem danh mục (khách chỉ thấy danh mục đang bật; admin xem tất cả kèm số sản phẩm)
- [`createCategory`](../backend/src/controllers/category.controller.js#L56) — UC-33.2 Thêm danh mục
- [`updateCategory`](../backend/src/controllers/category.controller.js#L67) — UC-33.3 Sửa danh mục
- [`deleteCategory`](../backend/src/controllers/category.controller.js#L80) — UC-33.4 Xóa danh mục (chỉ khi không còn sản phẩm)

**[controllers/customer.controller.js](../backend/src/controllers/customer.controller.js)**
- [`escapeRegex`](../backend/src/controllers/customer.controller.js#L10) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`contact`](../backend/src/controllers/customer.controller.js#L13) — Thông tin liên hệ theo vai trò: admin thấy đầy đủ, staff thấy đã che bớt
- [`tierNames`](../backend/src/controllers/customer.controller.js#L18) — Lấy tên hạng thành viên của danh sách khách
- [`listCustomers`](../backend/src/controllers/customer.controller.js#L25) — UC-19.1 Xem / tìm danh sách khách hàng (staff thấy liên hệ đã che)
- [`getCustomer`](../backend/src/controllers/customer.controller.js#L74) — UC-19.2 Xem chi tiết khách: thông tin, hạng, tóm tắt đơn hàng và khiếu nại
- [`loadCustomerOr404`](../backend/src/controllers/customer.controller.js#L114) — Lấy khách hàng chưa bị xóa theo id (404 nếu không có)
- [`adminView`](../backend/src/controllers/customer.controller.js#L123) — Dữ liệu khách trả về cho admin sau khi sửa / mở khóa
- [`updateCustomer`](../backend/src/controllers/customer.controller.js#L129) — UC-29.4 Admin sửa họ tên, số điện thoại của khách
- [`unlockCustomer`](../backend/src/controllers/customer.controller.js#L145) — UC-29.5 Admin mở khóa tài khoản khách
- [`deleteCustomer`](../backend/src/controllers/customer.controller.js#L158) — UC-29.6 Admin xóa mềm tài khoản khách (không xóa khi còn đơn đang xử lý)
- [`normPhone`](../backend/src/controllers/customer.controller.js#L175) — Chuẩn hóa số điện thoại: bỏ khoảng trắng/dấu, +84 → 0
- [`phoneVariants`](../backend/src/controllers/customer.controller.js#L181) — Các cách viết của cùng một số điện thoại (0…, +84…, 84…) để tìm kiếm
- [`memberCard`](../backend/src/controllers/customer.controller.js#L184) — Thông tin thành viên tối thiểu staff cần ở quầy (mã, hạng, điểm, liên hệ đã che)
- [`registerMember`](../backend/src/controllers/customer.controller.js#L196) — Đăng ký thành viên tại quầy: họ tên + email (bắt buộc), SĐT tùy chọn; gửi email mời đặt mật khẩu
- [`findMember`](../backend/src/controllers/customer.controller.js#L234) — Tìm thành viên ở quầy theo SĐT, email hoặc mã thành viên

**[controllers/dashboard.controller.js](../backend/src/controllers/dashboard.controller.js)**
- [`adminDashboard`](../backend/src/controllers/dashboard.controller.js#L5) — Dashboard admin: doanh thu, đơn, sản phẩm bán chạy, tồn kho theo khoảng ngày
- [`hideRevenue`](../backend/src/controllers/dashboard.controller.js#L10) — Bỏ các số tiền tổng hợp nhiều ngày khỏi dữ liệu dashboard trả cho staff
- [`staffDashboard`](../backend/src/controllers/dashboard.controller.js#L24) — Dashboard staff: hàng đợi đơn, số đơn, tồn kho; chỉ xem doanh thu của hôm nay

**[controllers/discountCode.controller.js](../backend/src/controllers/discountCode.controller.js)**
- [`escapeRegex`](../backend/src/controllers/discountCode.controller.js#L10) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`loadCode`](../backend/src/controllers/discountCode.controller.js#L14) — Lấy mã giảm giá chưa bị xóa theo id (404 nếu không có)
- [`parseBody`](../backend/src/controllers/discountCode.controller.js#L22) — Kiểm tra dữ liệu mã giảm giá (loại, giá trị, giới hạn lượt, thời gian)
- [`validateDiscountCode`](../backend/src/controllers/discountCode.controller.js#L58) — Khách kiểm tra mã giảm giá khi thanh toán (hợp lệ không, giảm bao nhiêu)
- [`listDiscountCodes`](../backend/src/controllers/discountCode.controller.js#L74) — UC-38.1 Admin xem / tìm mã giảm giá
- [`createDiscountCode`](../backend/src/controllers/discountCode.controller.js#L90) — UC-38.2 Tạo mã giảm giá (mặc định chưa kích hoạt)
- [`updateDiscountCode`](../backend/src/controllers/discountCode.controller.js#L99) — UC-38.3 Sửa mã giảm giá (không đổi được mã code)
- [`activateDiscountCode`](../backend/src/controllers/discountCode.controller.js#L112) — UC-38.4 Kích hoạt mã giảm giá
- [`suspendDiscountCode`](../backend/src/controllers/discountCode.controller.js#L124) — UC-38.5 Tạm ngưng mã giảm giá
- [`deleteDiscountCode`](../backend/src/controllers/discountCode.controller.js#L135) — UC-38.6 Xóa mềm mã giảm giá (đơn cũ vẫn giữ tham chiếu)

**[controllers/inventory.controller.js](../backend/src/controllers/inventory.controller.js)**
- [`escapeRegex`](../backend/src/controllers/inventory.controller.js#L9) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`paging`](../backend/src/controllers/inventory.controller.js#L14) — Đọc page/limit từ query
- [`validId`](../backend/src/controllers/inventory.controller.js#L19) — Kiểm tra ObjectId hợp lệ
- [`posInt`](../backend/src/controllers/inventory.controller.js#L21) — Kiểm tra số nguyên dương
- [`text`](../backend/src/controllers/inventory.controller.js#L27) — Kiểm tra chuỗi (bắt buộc / tùy chọn) có độ dài hợp lệ
- [`requireProduct`](../backend/src/controllers/inventory.controller.js#L34) — Lấy sản phẩm chưa bị xóa theo id (404 nếu không có)
- [`productRow`](../backend/src/controllers/inventory.controller.js#L42) — Một dòng tồn kho trả về: sản phẩm, số lượng, ngưỡng cảnh báo
- [`nearestExpiries`](../backend/src/controllers/inventory.controller.js#L51) — Hạn dùng gần nhất của các lô còn hàng theo từng sản phẩm
- [`listInventory`](../backend/src/controllers/inventory.controller.js#L61) — UC-19.1/34.1 Xem tồn kho (lọc còn hàng / sắp hết / hết hàng)
- [`getProductStock`](../backend/src/controllers/inventory.controller.js#L85) — Check Stock: các lô còn hàng của một sản phẩm
- [`receiveStock`](../backend/src/controllers/inventory.controller.js#L96) — UC-19.2 Nhập hàng: tạo lô mới có hạn dùng
- [`adjustInventory`](../backend/src/controllers/inventory.controller.js#L120) — UC-19.3/34.2 Điều chỉnh tồn kho về số lượng mới (bắt buộc ghi lý do)
- [`stocktakeCode`](../backend/src/controllers/inventory.controller.js#L133) — Sinh mã phiên kiểm kê
- [`listStocktakes`](../backend/src/controllers/inventory.controller.js#L141) — UC-19.4/34.3 Danh sách phiên kiểm kê
- [`createStocktake`](../backend/src/controllers/inventory.controller.js#L164) — UC-19.4/34.3 Tạo phiên kiểm kê với số lượng đếm thực tế
- [`completeStocktake`](../backend/src/controllers/inventory.controller.js#L184) — UC-19.4/34.3 Hoàn tất kiểm kê: đưa tồn kho về đúng số đã đếm
- [`listLowStock`](../backend/src/controllers/inventory.controller.js#L202) — UC-19.5/34.4 Sản phẩm sắp hết hàng
- [`listOutOfStock`](../backend/src/controllers/inventory.controller.js#L214) — UC-34.5 Sản phẩm hết hàng
- [`listExpired`](../backend/src/controllers/inventory.controller.js#L225) — UC-19.6 Các lô đã hết hạn mà vẫn còn hàng
- [`listDamaged`](../backend/src/controllers/inventory.controller.js#L240) — UC-19.7 Xem các lần ghi nhận hàng hỏng / hết hạn bị loại
- [`recordDamaged`](../backend/src/controllers/inventory.controller.js#L256) — UC-19.7 Ghi nhận hàng hỏng / hết hạn và trừ khỏi kho
- [`getInventoryHistory`](../backend/src/controllers/inventory.controller.js#L269) — UC-34.6 Lịch sử biến động kho (nhập, bán, điều chỉnh, kiểm kê, hỏng)

**[controllers/membership.controller.js](../backend/src/controllers/membership.controller.js)**
- [`findCustomer`](../backend/src/controllers/membership.controller.js#L9) — Lấy khách hàng đang hoạt động theo id
- [`getMyMembership`](../backend/src/controllers/membership.controller.js#L17) — UC-12.1 Khách xem điểm và hạng thành viên của mình
- [`getMyPointHistory`](../backend/src/controllers/membership.controller.js#L29) — UC-12.2 Khách xem lịch sử điểm (mới nhất trước)
- [`lookupMemberCode`](../backend/src/controllers/membership.controller.js#L51) — Staff tra mã thành viên QUICK-… ra id khách
- [`validId`](../backend/src/controllers/membership.controller.js#L60) — Kiểm tra ObjectId hợp lệ
- [`pagination`](../backend/src/controllers/membership.controller.js#L65) — Đọc page/limit từ query
- [`memberFilter`](../backend/src/controllers/membership.controller.js#L72) — Điều kiện tìm thành viên theo tên / email / SĐT
- [`listMembers`](../backend/src/controllers/membership.controller.js#L82) — UC-39.1/39.2 Admin xem / tìm thành viên
- [`getMember`](../backend/src/controllers/membership.controller.js#L93) — UC-39.3 Admin xem chi tiết thành viên
- [`listTiers`](../backend/src/controllers/membership.controller.js#L100) — UC-39.4 Danh sách hạng thành viên
- [`tierBody`](../backend/src/controllers/membership.controller.js#L108) — Kiểm tra dữ liệu hạng thành viên
- [`assertUniqueMinPoints`](../backend/src/controllers/membership.controller.js#L117) — Chặn hai hạng có cùng mức điểm tối thiểu
- [`createTier`](../backend/src/controllers/membership.controller.js#L123) — UC-39.4 Thêm hạng thành viên
- [`updateTier`](../backend/src/controllers/membership.controller.js#L130) — UC-39.4 Sửa hạng thành viên
- [`deleteTier`](../backend/src/controllers/membership.controller.js#L139) — UC-39.4 Xóa hạng thành viên
- [`adjustPoints`](../backend/src/controllers/membership.controller.js#L146) — UC-39.5 Admin cộng / trừ điểm (bắt buộc lý do, không để âm)
- [`adminHistory`](../backend/src/controllers/membership.controller.js#L168) — Truy vấn lịch sử điểm dùng chung cho admin
- [`listPointHistory`](../backend/src/controllers/membership.controller.js#L185) — UC-39.6 Admin xem lịch sử điểm
- [`listRedemptions`](../backend/src/controllers/membership.controller.js#L187) — UC-39.7 Admin xem lịch sử đổi điểm

**[controllers/notification.controller.js](../backend/src/controllers/notification.controller.js)**
- [`validId`](../backend/src/controllers/notification.controller.js#L9) — Kiểm tra ObjectId hợp lệ
- [`visible`](../backend/src/controllers/notification.controller.js#L11) — Điều kiện thông báo mà người dùng này được thấy (theo vai trò, đã đăng, chưa hết hạn)
- [`pageOf`](../backend/src/controllers/notification.controller.js#L19) — Đọc page/limit từ query
- [`publicItem`](../backend/src/controllers/notification.controller.js#L25) — Dữ liệu một thông báo trả về cho người dùng (kèm đã đọc chưa)
- [`listMine`](../backend/src/controllers/notification.controller.js#L31) — Danh sách thông báo của người đang đăng nhập + số chưa đọc
- [`readOne`](../backend/src/controllers/notification.controller.js#L48) — Đánh dấu một thông báo là đã đọc
- [`readAll`](../backend/src/controllers/notification.controller.js#L59) — Đánh dấu tất cả thông báo là đã đọc
- [`fields`](../backend/src/controllers/notification.controller.js#L69) — Kiểm tra dữ liệu thông báo admin soạn
- [`adminList`](../backend/src/controllers/notification.controller.js#L85) — Admin xem danh sách thông báo đã soạn
- [`create`](../backend/src/controllers/notification.controller.js#L107) — Admin tạo thông báo (bản nháp)
- [`update`](../backend/src/controllers/notification.controller.js#L112) — Admin sửa thông báo
- [`publish`](../backend/src/controllers/notification.controller.js#L119) — Admin đăng thông báo cho người nhận
- [`archive`](../backend/src/controllers/notification.controller.js#L131) — Admin gỡ / lưu trữ thông báo
- [`getSettings`](../backend/src/controllers/notification.controller.js#L138) — Xem cấu hình thông báo tự động
- [`saveSettings`](../backend/src/controllers/notification.controller.js#L140) — Lưu cấu hình thông báo tự động

**[controllers/order.controller.js](../backend/src/controllers/order.controller.js)**
- [`toListItem`](../backend/src/controllers/order.controller.js#L18) — Tóm tắt một đơn cho danh sách đơn của khách
- [`parsePaging`](../backend/src/controllers/order.controller.js#L36) — Đọc page/limit từ query
- [`toHistory`](../backend/src/controllers/order.controller.js#L42) — Lịch sử trạng thái cho khách (chỉ trạng thái + thời điểm, không lộ ghi chú nội bộ)
- [`expireQuietly`](../backend/src/controllers/order.controller.js#L48) — Tự hủy các đơn quá hạn thanh toán khi khách mở trang (bỏ qua lỗi)
- [`paymentInfo`](../backend/src/controllers/order.controller.js#L51) — Hạn thanh toán và giao dịch gần nhất của đơn (để biết còn thanh toán được không)
- [`listMyOrders`](../backend/src/controllers/order.controller.js#L60) — UC-09.1 Khách xem danh sách đơn của mình (lọc theo trạng thái)
- [`getMyOrder`](../backend/src/controllers/order.controller.js#L93) — UC-09.2 Khách xem chi tiết đơn (đơn của người khác trả 404)
- [`trackMyOrder`](../backend/src/controllers/order.controller.js#L141) — UC-09.3 Theo dõi trạng thái đơn và các mốc thời gian
- [`parseDate`](../backend/src/controllers/order.controller.js#L175) — Đọc ngày from/to từ query; sai định dạng thì báo lỗi 400
- [`listMyOrderHistory`](../backend/src/controllers/order.controller.js#L183) — UC-09.4 Lịch sử đơn đã kết thúc của khách (lọc theo kết quả, khoảng ngày)
- [`previewCheckout`](../backend/src/controllers/order.controller.js#L235) — UC-08.1 Xem trước đơn: giá, khuyến mãi, mã giảm giá, ví, tồn kho tại thời điểm hiện tại
- [`createOrder`](../backend/src/controllers/order.controller.js#L240) — UC-08.1 Tạo đơn từ giỏ hàng (chống đặt trùng bằng Idempotency-Key)
- [`quoteStoreOrder`](../backend/src/controllers/order.controller.js#L247) — UC-22 Báo giá hóa đơn tại quầy (giá và khuyến mãi tính lại từ database)
- [`createStoreOrder`](../backend/src/controllers/order.controller.js#L254) — UC-22 Tạo đơn tại quầy chờ thu tiền
- [`checkoutStoreSale`](../backend/src/controllers/order.controller.js#L260) — POS: chốt bán tại quầy (thu tiền, trừ kho); có gắn thành viên thì cộng điểm

**[controllers/payment.controller.js](../backend/src/controllers/payment.controller.js)**
- [`frontend`](../backend/src/controllers/payment.controller.js#L11) — Địa chỉ web frontend (để chuyển trang sau thanh toán)
- [`resultUrl`](../backend/src/controllers/payment.controller.js#L13) — Link trang kết quả thanh toán của một đơn
- [`clientIp`](../backend/src/controllers/payment.controller.js#L16) — Lấy IP của khách gửi cho VNPay
- [`createOnlinePayment`](../backend/src/controllers/payment.controller.js#L23) — UC-08.2 Tạo link thanh toán VNPay cho đơn đang chờ thanh toán
- [`applyVerified`](../backend/src/controllers/payment.controller.js#L34) — Áp kết quả thanh toán đã xác thực chữ ký, trả về id đơn
- [`vnpayReturn`](../backend/src/controllers/payment.controller.js#L40) — VNPay chuyển trình duyệt về: kiểm tra chữ ký, ghi nhận kết quả, chuyển tới trang kết quả
- [`vnpayMobileReturn`](../backend/src/controllers/payment.controller.js#L48) — VNPay chuyển về cho app mobile: ghi nhận kết quả rồi mở app bằng deep link cố định
- [`vnpayIpn`](../backend/src/controllers/payment.controller.js#L56) — VNPay gọi server báo kết quả (IPN), trả mã phản hồi theo quy định VNPay
- [`esc`](../backend/src/controllers/payment.controller.js#L67) — Escape HTML cho trang thanh toán giả lập
- [`mockPay`](../backend/src/controllers/payment.controller.js#L70) — Trang thanh toán giả lập (chỉ bật khi PAYMENT_MOCK=true)
- [`mockComplete`](../backend/src/controllers/payment.controller.js#L88) — Nhận kết quả từ trang giả lập (có chữ ký) và xử lý như cổng thật
- [`escapeRx`](../backend/src/controllers/payment.controller.js#L104) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`loadPayableStoreOrder`](../backend/src/controllers/payment.controller.js#L107) — Lấy đơn tại quầy đang chờ thu tiền (404/409 nếu không thu được)
- [`settleStoreOrder`](../backend/src/controllers/payment.controller.js#L118) — Ghi nhận đã thu tiền đơn tại quầy: chuyển sang hoàn tất và tạo giao dịch
- [`listStoreOrdersToPay`](../backend/src/controllers/payment.controller.js#L142) — Staff xem các đơn tại quầy đang chờ thu tiền
- [`processCashPayment`](../backend/src/controllers/payment.controller.js#L152) — UC-23.1 Thu tiền mặt (tính tiền thối)
- [`processCardPayment`](../backend/src/controllers/payment.controller.js#L163) — UC-23.2 Thu tiền bằng thẻ / ví điện tử (ghi mã giao dịch)
- [`getReceipt`](../backend/src/controllers/payment.controller.js#L184) — Dữ liệu hóa đơn để in của đơn đã thanh toán
- [`dateOf`](../backend/src/controllers/payment.controller.js#L208) — Đọc ngày từ query; sai định dạng thì báo lỗi 400
- [`paymentView`](../backend/src/controllers/payment.controller.js#L217) — Dữ liệu một giao dịch trả về cho trang Payments của admin
- [`listByStatus`](../backend/src/controllers/payment.controller.js#L231) — Truy vấn giao dịch theo trạng thái + tổng tiền đã thu / đã hoàn / thực nhận
- [`listPayments`](../backend/src/controllers/payment.controller.js#L264) — UC-41.1 Admin xem tất cả giao dịch thanh toán
- [`listFailedPayments`](../backend/src/controllers/payment.controller.js#L266) — UC-41.2 Admin xem giao dịch thất bại
- [`listPendingPayments`](../backend/src/controllers/payment.controller.js#L268) — UC-41.3 Admin xem giao dịch đang chờ
- [`handlePaymentError`](../backend/src/controllers/payment.controller.js#L271) — UC-41.4 Admin xử lý giao dịch lỗi: xác nhận đã trả / đánh dấu thất bại / bỏ qua

**[controllers/product.controller.js](../backend/src/controllers/product.controller.js)**
- [`canManage`](../backend/src/controllers/product.controller.js#L8) — Người gọi có phải staff/admin không
- [`escapeRegex`](../backend/src/controllers/product.controller.js#L14) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`slugify`](../backend/src/controllers/product.controller.js#L17) — Tạo slug từ tên sản phẩm (bỏ dấu, nối bằng gạch ngang)
- [`uniqueSlug`](../backend/src/controllers/product.controller.js#L22) — Tạo slug không trùng (thêm hậu tố số nếu đã có)
- [`parsePrice`](../backend/src/controllers/product.controller.js#L32) — Kiểm tra giá bán là số nguyên hợp lệ
- [`readFields`](../backend/src/controllers/product.controller.js#L43) — Đọc và kiểm tra các trường sản phẩm gửi lên (partial = chỉ kiểm tra trường có gửi)
- [`duplicateMessage`](../backend/src/controllers/product.controller.js#L92) — Thông báo lỗi khi SKU / mã vạch bị trùng
- [`guardDuplicate`](../backend/src/controllers/product.controller.js#L97) — Đổi lỗi trùng khóa của MongoDB thành lỗi 409 dễ hiểu
- [`withSellableStock`](../backend/src/controllers/product.controller.js#L100) — Khách chỉ thấy số lượng còn bán được (không tính lô đã hết hạn)
- [`loadProduct`](../backend/src/controllers/product.controller.js#L107) — Lấy sản phẩm chưa bị xóa theo id (404 nếu không có)
- [`listProducts`](../backend/src/controllers/product.controller.js#L114) — UC-02.1/18.1/32.1 Xem / tìm sản phẩm (khách: chỉ sản phẩm đang bán; staff/admin: lọc thêm trạng thái, tồn kho)
- [`getProduct`](../backend/src/controllers/product.controller.js#L159) — UC-02.2/18.3/32.3 Chi tiết sản phẩm (staff/admin có thể kèm các lô và lịch sử giá)
- [`createProduct`](../backend/src/controllers/product.controller.js#L174) — UC-18.4/32.4 Thêm sản phẩm (tồn kho bắt đầu từ 0, nhập hàng qua Inventory)
- [`updateProduct`](../backend/src/controllers/product.controller.js#L184) — UC-18.5/32.5 Sửa sản phẩm (đổi giá chỉ admin)
- [`updateProductPrice`](../backend/src/controllers/product.controller.js#L203) — UC-32.6 Admin đổi giá bán và ghi lịch sử giá
- [`setStatus`](../backend/src/controllers/product.controller.js#L216) — Tạo handler bật / tắt bán sản phẩm
- [`deleteProduct`](../backend/src/controllers/product.controller.js#L229) — UC-18.6/32.7 Xóa mềm sản phẩm (đơn cũ vẫn tham chiếu được)

**[controllers/profile.controller.js](../backend/src/controllers/profile.controller.js)**
- [`parseDateOfBirth`](../backend/src/controllers/profile.controller.js#L13) — Kiểm tra ngày sinh hợp lệ (không ở tương lai)
- [`loadMe`](../backend/src/controllers/profile.controller.js#L25) — Lấy tài khoản của chính người đang đăng nhập
- [`toProfile`](../backend/src/controllers/profile.controller.js#L34) — Dữ liệu hồ sơ trả về (kèm mã thành viên với khách)
- [`getProfile`](../backend/src/controllers/profile.controller.js#L49) — UC-06.1/17.1/28.1 Xem hồ sơ cá nhân
- [`updateProfile`](../backend/src/controllers/profile.controller.js#L54) — UC-06.2/17.2/28.2 Sửa hồ sơ (họ tên, SĐT, ngày sinh, ảnh đại diện)
- [`changePassword`](../backend/src/controllers/profile.controller.js#L81) — UC-06.3/17.3/28.3 Đổi mật khẩu (phải nhập đúng mật khẩu cũ)

**[controllers/promotion.controller.js](../backend/src/controllers/promotion.controller.js)**
- [`publicPromo`](../backend/src/controllers/promotion.controller.js#L13) — Dữ liệu khuyến mãi công khai cho khách
- [`listPromotions`](../backend/src/controllers/promotion.controller.js#L21) — UC-02.4/20.1 Xem các khuyến mãi đang chạy
- [`applyPromotion`](../backend/src/controllers/promotion.controller.js#L34) — UC-20.2 Staff tính thử khuyến mãi cho hóa đơn (chỉ xem trước, không lưu)
- [`validId`](../backend/src/controllers/promotion.controller.js#L80) — Kiểm tra ObjectId hợp lệ
- [`escapeRegex`](../backend/src/controllers/promotion.controller.js#L82) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`readPromotion`](../backend/src/controllers/promotion.controller.js#L85) — Kiểm tra dữ liệu khuyến mãi (loại, giá trị, phạm vi, thời gian)
- [`loadManaged`](../backend/src/controllers/promotion.controller.js#L128) — Lấy khuyến mãi chưa bị xóa theo id (404 nếu không có)
- [`saveManaged`](../backend/src/controllers/promotion.controller.js#L136) — Lưu khuyến mãi và ghi nhật ký
- [`listAllPromotions`](../backend/src/controllers/promotion.controller.js#L148) — UC-37.1 Admin xem tất cả khuyến mãi
- [`createPromotion`](../backend/src/controllers/promotion.controller.js#L168) — UC-37.2 Tạo khuyến mãi
- [`updatePromotion`](../backend/src/controllers/promotion.controller.js#L177) — UC-37.3 Sửa khuyến mãi
- [`activatePromotion`](../backend/src/controllers/promotion.controller.js#L190) — UC-37.4 Kích hoạt khuyến mãi
- [`suspendPromotion`](../backend/src/controllers/promotion.controller.js#L201) — UC-37.5 Tạm ngưng khuyến mãi
- [`deletePromotion`](../backend/src/controllers/promotion.controller.js#L208) — UC-37.6 Xóa mềm khuyến mãi

**[controllers/review.controller.js](../backend/src/controllers/review.controller.js)**
- [`validId`](../backend/src/controllers/review.controller.js#L7) — Kiểm tra ObjectId hợp lệ
- [`pagination`](../backend/src/controllers/review.controller.js#L10) — Đọc page/limit từ query
- [`moderationReason`](../backend/src/controllers/review.controller.js#L20) — Kiểm tra lý do kiểm duyệt nằm trong danh sách cho phép
- [`refreshProductRating`](../backend/src/controllers/review.controller.js#L26) — Tính lại điểm trung bình và số đánh giá của sản phẩm
- [`listProductReviews`](../backend/src/controllers/review.controller.js#L36) — UC-40.1 Xem đánh giá công khai của một sản phẩm
- [`listStoreReviews`](../backend/src/controllers/review.controller.js#L48) — UC-40.2 Xem đánh giá công khai của cửa hàng
- [`listEligibleReviews`](../backend/src/controllers/review.controller.js#L63) — Các món trong đơn đã nhận mà khách còn đánh giá được
- [`listMyReviews`](../backend/src/controllers/review.controller.js#L79) — Khách xem các đánh giá của mình
- [`addReview`](../backend/src/controllers/review.controller.js#L87) — UC-11.1 Thêm đánh giá (chỉ món thuộc đơn đã nhận, mỗi món một lần)
- [`updateReview`](../backend/src/controllers/review.controller.js#L117) — UC-11.2 Sửa đánh giá của mình
- [`deleteReview`](../backend/src/controllers/review.controller.js#L133) — UC-11.3 Xóa đánh giá của mình
- [`listReviewsAdmin`](../backend/src/controllers/review.controller.js#L144) — Admin xem tất cả đánh giá (gồm đã ẩn / đã xóa)
- [`hideReview`](../backend/src/controllers/review.controller.js#L155) — UC-40.3 Ẩn / hiện đánh giá (có lý do, ghi nhật ký)
- [`handleViolatingReview`](../backend/src/controllers/review.controller.js#L177) — UC-40.4 Xử lý đánh giá vi phạm: bỏ qua hoặc ẩn (bắt buộc lý do)

**[controllers/staff.controller.js](../backend/src/controllers/staff.controller.js)**
- [`escapeRegex`](../backend/src/controllers/staff.controller.js#L11) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`view`](../backend/src/controllers/staff.controller.js#L14) — Dữ liệu nhân viên trả về cho admin
- [`loadStaff`](../backend/src/controllers/staff.controller.js#L21) — Lấy nhân viên chưa bị xóa theo id (404 nếu không có)
- [`parseHiredAt`](../backend/src/controllers/staff.controller.js#L29) — Kiểm tra ngày vào làm (không ở tương lai)
- [`parseCommon`](../backend/src/controllers/staff.controller.js#L38) — Kiểm tra các trường chung khi thêm / sửa nhân viên
- [`nextEmployeeCode`](../backend/src/controllers/staff.controller.js#L51) — Sinh mã nhân viên tiếp theo (ST001, ST002…)
- [`listStaff`](../backend/src/controllers/staff.controller.js#L58) — UC-30.1 Admin xem / tìm nhân viên
- [`addStaff`](../backend/src/controllers/staff.controller.js#L77) — UC-30.2 Thêm nhân viên
- [`updateStaff`](../backend/src/controllers/staff.controller.js#L101) — UC-30.3 Sửa thông tin nhân viên (không đổi email, mật khẩu)
- [`lockStaff`](../backend/src/controllers/staff.controller.js#L113) — UC-30.4 Khóa tài khoản nhân viên
- [`unlockStaff`](../backend/src/controllers/staff.controller.js#L124) — UC-30.5 Mở khóa tài khoản nhân viên
- [`getStaffActivity`](../backend/src/controllers/staff.controller.js#L136) — UC-30.6 Xem nhật ký thao tác của nhân viên

**[controllers/staffOrder.controller.js](../backend/src/controllers/staffOrder.controller.js)**
- [`customerOf`](../backend/src/controllers/staffOrder.controller.js#L11) — Thông tin khách của đơn để staff xem (id, tên, SĐT)
- [`list`](../backend/src/controllers/staffOrder.controller.js#L13) — Staff xem hàng đợi / lịch sử đơn (đơn online và đơn tại quầy)
- [`get`](../backend/src/controllers/staffOrder.controller.js#L30) — Staff xem chi tiết đơn để chuẩn bị và giao hàng

**[controllers/store.controller.js](../backend/src/controllers/store.controller.js)**
- [`defaultHours`](../backend/src/controllers/store.controller.js#L11) — Giờ mở cửa mặc định cho 7 ngày
- [`loadStore`](../backend/src/controllers/store.controller.js#L14) — Lấy cửa hàng theo id (404 nếu không có)
- [`parseBasics`](../backend/src/controllers/store.controller.js#L22) — Kiểm tra tên, địa chỉ, SĐT, website của cửa hàng
- [`parseHours`](../backend/src/controllers/store.controller.js#L38) — Kiểm tra giờ mở cửa của 7 ngày
- [`listStores`](../backend/src/controllers/store.controller.js#L53) — UC-31.1 Xem danh sách cửa hàng
- [`addStore`](../backend/src/controllers/store.controller.js#L59) — UC-31.2 Thêm cửa hàng
- [`updateStore`](../backend/src/controllers/store.controller.js#L68) — UC-31.3 Sửa thông tin cửa hàng
- [`closeStore`](../backend/src/controllers/store.controller.js#L77) — UC-31.4 Đóng cửa hàng
- [`openStore`](../backend/src/controllers/store.controller.js#L89) — UC-31.5 Mở lại cửa hàng
- [`updateStoreHours`](../backend/src/controllers/store.controller.js#L100) — UC-31.6 Cập nhật giờ mở cửa

**[controllers/support.controller.js](../backend/src/controllers/support.controller.js)**
- [`escapeRegex`](../backend/src/controllers/support.controller.js#L13) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`isId`](../backend/src/controllers/support.controller.js#L15) — Kiểm tra ObjectId hợp lệ
- [`userMap`](../backend/src/controllers/support.controller.js#L18) — Lấy tên người dùng theo danh sách id
- [`detailOf`](../backend/src/controllers/support.controller.js#L25) — Chi tiết đầy đủ một yêu cầu hỗ trợ (kèm các trạng thái được chuyển tiếp)
- [`listSupportRequests`](../backend/src/controllers/support.controller.js#L50) — UC-19.3 Staff xem danh sách yêu cầu hỗ trợ / khiếu nại
- [`getSupportRequest`](../backend/src/controllers/support.controller.js#L98) — UC-19.3 Xem chi tiết một yêu cầu / khiếu nại
- [`handleComplaint`](../backend/src/controllers/support.controller.js#L106) — UC-19.3 Staff phản hồi và / hoặc chuyển trạng thái khiếu nại
- [`submitSupportRequest`](../backend/src/controllers/support.controller.js#L156) — Khách gửi yêu cầu hỗ trợ / khiếu nại
- [`listMySupportRequests`](../backend/src/controllers/support.controller.js#L177) — Khách xem các yêu cầu hỗ trợ của mình

**[controllers/transaction.controller.js](../backend/src/controllers/transaction.controller.js)**
- [`escapeRegex`](../backend/src/controllers/transaction.controller.js#L10) — Escape ký tự đặc biệt để tìm kiếm bằng regex
- [`scopeFilter`](../backend/src/controllers/transaction.controller.js#L19) — Phạm vi giao dịch staff được xem (hiện chỉ có 1 cửa hàng nên xem tất cả)
- [`maskEmail`](../backend/src/controllers/transaction.controller.js#L22) — Che email khi staff xem
- [`maskTail`](../backend/src/controllers/transaction.controller.js#L24) — Che mã giao dịch cổng, chỉ giữ vài ký tự cuối
- [`maskPhone`](../backend/src/controllers/transaction.controller.js#L26) — Che số điện thoại khi staff xem
- [`serialize`](../backend/src/controllers/transaction.controller.js#L29) — Dữ liệu giao dịch trả về (staff thấy liên hệ đã che, không lộ dữ liệu cổng)
- [`parseDate`](../backend/src/controllers/transaction.controller.js#L57) — Đọc ngày từ query; sai định dạng thì báo lỗi 400
- [`collectedToday`](../backend/src/controllers/transaction.controller.js#L67) — Tổng tiền đã thu trong hôm nay (từ 00:00 giờ VN), không tính giao dịch đã hoàn
- [`listTransactions`](../backend/src/controllers/transaction.controller.js#L74) — UC-35.1 Xem / tìm giao dịch (admin thấy tổng tiền; staff chỉ thấy tiền thu hôm nay)
- [`getTransaction`](../backend/src/controllers/transaction.controller.js#L119) — UC-35.2 Xem chi tiết một giao dịch

**[controllers/workShift.controller.js](../backend/src/controllers/workShift.controller.js)**
- [`shiftTimes`](../backend/src/controllers/workShift.controller.js#L13) — Giờ bắt đầu / kết thúc thực tế của ca (ca qua đêm thì cộng sang ngày sau)
- [`enrich`](../backend/src/controllers/workShift.controller.js#L22) — Thêm giờ thực tế, trễ / về sớm, lương và các thao tác được phép cho một ca
- [`markMissed`](../backend/src/controllers/workShift.controller.js#L51) — Ca đã qua giờ kết thúc mà chưa vào ca thì chuyển thành vắng (missed)
- [`parseDate`](../backend/src/controllers/workShift.controller.js#L59) — Đọc ngày từ query; sai định dạng thì báo lỗi 400
- [`listMyShifts`](../backend/src/controllers/workShift.controller.js#L68) — UC-24 Nhân viên xem ca hiện tại, ca sắp tới, lịch sử ca và thu nhập tháng này
- [`loadOwnShift`](../backend/src/controllers/workShift.controller.js#L104) — Lấy ca của chính nhân viên đang đăng nhập (403 nếu là ca người khác)
- [`logAction`](../backend/src/controllers/workShift.controller.js#L113) — Ghi nhật ký thao tác ca làm (lỗi ghi nhật ký không làm hỏng thao tác chính)
- [`clockIn`](../backend/src/controllers/workShift.controller.js#L118) — UC-24 Vào ca (mở trước 30 phút, không vào khi đang ở ca khác)
- [`clockOut`](../backend/src/controllers/workShift.controller.js#L140) — UC-24 Ra ca (ra sớm vẫn ghi nhận và đánh dấu về sớm)
- [`dayOf`](../backend/src/controllers/workShift.controller.js#L165) — Đổi "YYYY-MM-DD" thành 00:00 ngày đó theo giờ máy chủ
- [`dayKey`](../backend/src/controllers/workShift.controller.js#L173) — Đổi Date thành chuỗi "YYYY-MM-DD"
- [`findOverlap`](../backend/src/controllers/workShift.controller.js#L176) — Tìm ca của cùng nhân viên bị trùng giờ (tính cả ca qua đêm)
- [`readShiftBody`](../backend/src/controllers/workShift.controller.js#L183) — Kiểm tra giờ bắt đầu / kết thúc và ghi chú của ca
- [`withStaff`](../backend/src/controllers/workShift.controller.js#L196) — Gắn tên, mã nhân viên vào dữ liệu ca
- [`listShifts`](../backend/src/controllers/workShift.controller.js#L199) — Admin xem chấm công các ca + tổng hợp giờ làm và lương theo nhân viên
- [`readCapacity`](../backend/src/controllers/workShift.controller.js#L252) — Kiểm tra số nhân viên cần cho ca (1–20)
- [`signupsFor`](../backend/src/controllers/workShift.controller.js#L259) — Danh sách nhân viên đã nhận của từng ca trống
- [`slotView`](../backend/src/controllers/workShift.controller.js#L274) — Dữ liệu một ca trống trả về (số chỗ, lương dự kiến, ai đã nhận / mình đã nhận chưa)
- [`listSlots`](../backend/src/controllers/workShift.controller.js#L290) — Admin xem các ca trống trong khoảng ngày và ai đã nhận
- [`createSlots`](../backend/src/controllers/workShift.controller.js#L300) — Admin mở ca trống cho nhiều ngày (giờ, số người cần, ghi chú)
- [`updateSlot`](../backend/src/controllers/workShift.controller.js#L321) — Admin sửa ca trống (đổi giờ chỉ khi chưa ai nhận; số người cần không thấp hơn số đã nhận)
- [`deleteSlot`](../backend/src/controllers/workShift.controller.js#L347) — Admin xóa ca trống chưa ai nhận
- [`listOpenSlots`](../backend/src/controllers/workShift.controller.js#L359) — Nhân viên xem ca trống 14 ngày tới (đánh dấu ca đã đầy / trùng giờ / của mình)
- [`claimSlot`](../backend/src/controllers/workShift.controller.js#L380) — Nhân viên nhận ca (chống vượt số chỗ khi nhiều người bấm cùng lúc)
- [`releaseShift`](../backend/src/controllers/workShift.controller.js#L404) — Nhân viên hủy nhận ca (chỉ khi còn ít nhất 12 giờ trước giờ bắt đầu)
- [`deleteShift`](../backend/src/controllers/workShift.controller.js#L419) — Admin gỡ nhân viên khỏi ca chưa bắt đầu (trả lại chỗ cho ca trống)
- [`closeShift`](../backend/src/controllers/workShift.controller.js#L432) — Admin chốt ca khi nhân viên quên ra ca


## 4. Backend — middleware, config, utils, models, scripts

Phần hạ tầng: xác thực, xử lý lỗi, transaction, cấu hình lương, migration…

**[config/db.js](../backend/src/config/db.js)**
- [`connectDB`](../backend/src/config/db.js#L4) — Kết nối MongoDB theo MONGODB_URI trong .env

**[config/migrations.js](../backend/src/config/migrations.js)**
- [`relaxUserEmailIndex`](../backend/src/config/migrations.js#L4) — Đổi index email của users thành unique chỉ cho tài khoản có email (thành viên tại quầy có thể không có email)
- [`run`](../backend/src/config/migrations.js#L16) — Chạy các bước cập nhật database khi server khởi động (chạy lại nhiều lần vẫn an toàn)

**[config/payroll.js](../backend/src/config/payroll.js)**
- [`num`](../backend/src/config/payroll.js#L2) — Đọc mức lương từ biến môi trường; sai hoặc âm thì dùng giá trị mặc định
- [`nightMinutes`](../backend/src/config/payroll.js#L13) — Đếm số phút nằm trong khung giờ đêm 22:00–06:00 của khoảng thời gian [from, to)
- [`payFor`](../backend/src/config/payroll.js#L27) — Tính lương cho khoảng thời gian làm việc: tách phút ngày / phút đêm và nhân với mức lương tương ứng

**[middlewares/auth.middleware.js](../backend/src/middlewares/auth.middleware.js)**
- [`readToken`](../backend/src/middlewares/auth.middleware.js#L5) — Lấy JWT từ header Authorization: Bearer <token>
- [`authenticate`](../backend/src/middlewares/auth.middleware.js#L11) — Bắt buộc đăng nhập: kiểm tra token và tài khoản còn hoạt động, gắn req.user
- [`optionalAuth`](../backend/src/middlewares/auth.middleware.js#L31) — Đăng nhập tùy chọn: có token hợp lệ thì gắn req.user, không có vẫn cho qua
- [`authorize`](../backend/src/middlewares/auth.middleware.js#L45) — Chỉ cho các vai trò được liệt kê, vd authorize("admin", "staff")

**[middlewares/error.middleware.js](../backend/src/middlewares/error.middleware.js)**
- [`notFound`](../backend/src/middlewares/error.middleware.js#L4) — Trả 404 cho đường dẫn API không tồn tại
- [`errorHandler`](../backend/src/middlewares/error.middleware.js#L8) — Trả lỗi dạng JSON { message } (ApiError giữ mã lỗi, lỗi khác trả 500)

**[scripts/attach-catalog-images.js](../backend/src/scripts/attach-catalog-images.js)**
- [`main`](../backend/src/scripts/attach-catalog-images.js#L9) — Gắn ảnh trong thư viện ảnh cho các sản phẩm chưa có ảnh (theo mã SKU)

**[scripts/init-db.js](../backend/src/scripts/init-db.js)**
- [`init`](../backend/src/scripts/init-db.js#L7) — Tạo đủ collection và index trong database

**[scripts/verify-mail.js](../backend/src/scripts/verify-mail.js)**
- [`timeout`](../backend/src/scripts/verify-mail.js#L5) — Hủy thao tác nếu quá thời gian chờ

**[utils/ApiError.js](../backend/src/utils/ApiError.js)**
- [`ApiError`](../backend/src/utils/ApiError.js#L2) — Lỗi nghiệp vụ có mã HTTP và dữ liệu kèm theo

**[utils/atomic.js](../backend/src/utils/atomic.js)**
- [`supportsTransactions`](../backend/src/utils/atomic.js#L6) — Kiểm tra MongoDB có hỗ trợ transaction không (lưu lại kết quả)
- [`runAtomic`](../backend/src/utils/atomic.js#L18) — Chạy nhiều thao tác như một khối: dùng transaction nếu có, không thì tự hoàn tác khi lỗi

**[utils/mask.js](../backend/src/utils/mask.js)**
- [`maskEmail`](../backend/src/utils/mask.js#L2) — Che email: a*****@gmail.com
- [`maskPhone`](../backend/src/utils/mask.js#L9) — Che số điện thoại: 090****567

**[utils/memberCode.js](../backend/src/utils/memberCode.js)**
- [`memberCode`](../backend/src/utils/memberCode.js#L2) — Mã thành viên từ id khách: QUICK-<id>
- [`memberIdFromCode`](../backend/src/utils/memberCode.js#L4) — Lấy id khách từ mã thành viên QUICK-…

**[utils/notImplemented.js](../backend/src/utils/notImplemented.js)**
- [`notImplemented`](../backend/src/utils/notImplemented.js#L2) — Handler tạm cho API chưa làm (trả 501)

**[utils/orderDto.js](../backend/src/utils/orderDto.js)**
- [`toItem`](../backend/src/utils/orderDto.js#L2) — Dòng hàng trả về: giá, tên đã chốt trong đơn + ảnh, đơn vị lấy từ sản phẩm


## 5. Frontend — trang (pages)

Mỗi trang ứng với một đường dẫn trong `routes/AppRouter.jsx`.

**[pages/NotFoundPage.jsx](../frontend/src/pages/NotFoundPage.jsx)**
- [`NotFoundPage`](../frontend/src/pages/NotFoundPage.jsx#L4) — Trang 404

**[pages/admin/AdminCategoriesPage.jsx](../frontend/src/pages/admin/AdminCategoriesPage.jsx)**
- [`CategoryEditor`](../frontend/src/pages/admin/AdminCategoriesPage.jsx#L6) — Form thêm / sửa danh mục
- [`AdminCategoriesPage`](../frontend/src/pages/admin/AdminCategoriesPage.jsx#L36) — UC-33 Admin quản lý danh mục

**[pages/admin/AdminCustomersPage.jsx](../frontend/src/pages/admin/AdminCustomersPage.jsx)**
- [`CustomerEditor`](../frontend/src/pages/admin/AdminCustomersPage.jsx#L10) — Form admin sửa thông tin khách
- [`CustomerDetail`](../frontend/src/pages/admin/AdminCustomersPage.jsx#L35) — Khung chi tiết khách (thông tin, hạng, đơn gần đây)
- [`AdminCustomersPage`](../frontend/src/pages/admin/AdminCustomersPage.jsx#L60) — UC-29 Admin quản lý khách hàng (mở sẵn chi tiết khi có ?view=id)

**[pages/admin/AdminDashboardPage.jsx](../frontend/src/pages/admin/AdminDashboardPage.jsx)**
- [`n`](../frontend/src/pages/admin/AdminDashboardPage.jsx#L9) — Định dạng số
- [`AdminDashboardPage`](../frontend/src/pages/admin/AdminDashboardPage.jsx#L12) — Dashboard admin: doanh thu, đơn, khách, tồn kho, biểu đồ, top sản phẩm

**[pages/admin/AdminDiscountCodesPage.jsx](../frontend/src/pages/admin/AdminDiscountCodesPage.jsx)**
- [`local`](../frontend/src/pages/admin/AdminDiscountCodesPage.jsx#L7) — Đổi ngày sang dạng cho ô datetime-local
- [`CodeEditor`](../frontend/src/pages/admin/AdminDiscountCodesPage.jsx#L10) — Form thêm / sửa mã giảm giá
- [`AdminDiscountCodesPage`](../frontend/src/pages/admin/AdminDiscountCodesPage.jsx#L57) — UC-38 Admin quản lý mã giảm giá

**[pages/admin/AdminInventoryPage.jsx](../frontend/src/pages/admin/AdminInventoryPage.jsx)**
- [`AdminInventoryPage`](../frontend/src/pages/admin/AdminInventoryPage.jsx#L4) — UC-34 Admin quản lý kho

**[pages/admin/AdminMembershipPage.jsx](../frontend/src/pages/admin/AdminMembershipPage.jsx)**
- [`num`](../frontend/src/pages/admin/AdminMembershipPage.jsx#L8) — Định dạng số
- [`date`](../frontend/src/pages/admin/AdminMembershipPage.jsx#L10) — Định dạng ngày
- [`message`](../frontend/src/pages/admin/AdminMembershipPage.jsx#L13) — Lấy thông báo lỗi từ response API
- [`AdminMembershipPage`](../frontend/src/pages/admin/AdminMembershipPage.jsx#L16) — UC-39 Admin quản lý thành viên, hạng, điểm

**[pages/admin/AdminNotificationsPage.jsx](../frontend/src/pages/admin/AdminNotificationsPage.jsx)**
- [`blank`](../frontend/src/pages/admin/AdminNotificationsPage.jsx#L10) — Dữ liệu trống cho form thông báo mới
- [`localTime`](../frontend/src/pages/admin/AdminNotificationsPage.jsx#L12) — Đổi ngày sang dạng cho ô datetime-local
- [`AdminNotificationsPage`](../frontend/src/pages/admin/AdminNotificationsPage.jsx#L22) — Admin soạn, đăng, gỡ thông báo và cấu hình thông báo tự động

**[pages/admin/AdminOrderDetailPage.jsx](../frontend/src/pages/admin/AdminOrderDetailPage.jsx)**
- [`AdminOrderDetailPage`](../frontend/src/pages/admin/AdminOrderDetailPage.jsx#L19) — UC-34.3 Chi tiết đơn của admin: chuyển trạng thái, hủy đơn, sự cố

**[pages/admin/AdminOrdersPage.jsx](../frontend/src/pages/admin/AdminOrdersPage.jsx)**
- [`pickOf`](../frontend/src/pages/admin/AdminOrdersPage.jsx#L16) — Lấy giá trị query hợp lệ trong danh sách cho phép
- [`AdminOrdersPage`](../frontend/src/pages/admin/AdminOrdersPage.jsx#L19) — UC-34.1/34.2 Admin xem và tìm đơn

**[pages/admin/AdminPaymentsPage.jsx](../frontend/src/pages/admin/AdminPaymentsPage.jsx)**
- [`ResolvePanel`](../frontend/src/pages/admin/AdminPaymentsPage.jsx#L14) — Khung xử lý giao dịch lỗi
- [`AdminPaymentsPage`](../frontend/src/pages/admin/AdminPaymentsPage.jsx#L37) — UC-41 Admin xem giao dịch thanh toán (tiền đã thu / đã hoàn / thực nhận)

**[pages/admin/AdminProductDetailPage.jsx](../frontend/src/pages/admin/AdminProductDetailPage.jsx)**
- [`batchState`](../frontend/src/pages/admin/AdminProductDetailPage.jsx#L10) — Trạng thái của một lô (còn hạn / sắp hết hạn / hết hạn)
- [`AdminProductDetailPage`](../frontend/src/pages/admin/AdminProductDetailPage.jsx#L19) — UC-32.3 Chi tiết sản phẩm: lô hàng, lịch sử giá, sửa / đổi giá / bật tắt / xóa

**[pages/admin/AdminProductFormPage.jsx](../frontend/src/pages/admin/AdminProductFormPage.jsx)**
- [`autoSku`](../frontend/src/pages/admin/AdminProductFormPage.jsx#L14) — Tự tạo SKU từ tên sản phẩm
- [`validate`](../frontend/src/pages/admin/AdminProductFormPage.jsx#L20) — Kiểm tra form sản phẩm
- [`AdminProductFormPage`](../frontend/src/pages/admin/AdminProductFormPage.jsx#L34) — Form thêm / sửa sản phẩm (dùng chung admin / staff)

**[pages/admin/AdminProductsPage.jsx](../frontend/src/pages/admin/AdminProductsPage.jsx)**
- [`AdminProductsPage`](../frontend/src/pages/admin/AdminProductsPage.jsx#L25) — UC-32 Admin quản lý sản phẩm

**[pages/admin/AdminProfilePage.jsx](../frontend/src/pages/admin/AdminProfilePage.jsx)**
- [`AdminProfilePage`](../frontend/src/pages/admin/AdminProfilePage.jsx#L4) — UC-28 Hồ sơ admin

**[pages/admin/AdminPromotionsPage.jsx](../frontend/src/pages/admin/AdminPromotionsPage.jsx)**
- [`money`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L8) — Định dạng tiền VND
- [`date`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L10) — Định dạng ngày
- [`message`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L14) — Lấy thông báo lỗi từ response API
- [`localDate`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L20) — Đổi ngày sang dạng cho ô datetime-local
- [`reference`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L26) — Tên sản phẩm / danh mục mà khuyến mãi áp dụng
- [`timing`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L28) — Trạng thái thời gian của khuyến mãi (sắp chạy / đang chạy / đã kết thúc)
- [`PromotionEditor`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L35) — Form thêm / sửa khuyến mãi
- [`AdminPromotionsPage`](../frontend/src/pages/admin/AdminPromotionsPage.jsx#L117) — UC-37 Admin quản lý khuyến mãi

**[pages/admin/AdminRefundsPage.jsx](../frontend/src/pages/admin/AdminRefundsPage.jsx)**
- [`AdminRefundsPage`](../frontend/src/pages/admin/AdminRefundsPage.jsx#L8) — Admin xem lịch sử hoàn tiền

**[pages/admin/AdminReviewsPage.jsx](../frontend/src/pages/admin/AdminReviewsPage.jsx)**
- [`AdminReviewsPage`](../frontend/src/pages/admin/AdminReviewsPage.jsx#L16) — UC-40 Admin xem, ẩn và xử lý đánh giá vi phạm

**[pages/admin/AdminStaffPage.jsx](../frontend/src/pages/admin/AdminStaffPage.jsx)**
- [`toDateInput`](../frontend/src/pages/admin/AdminStaffPage.jsx#L9) — Đổi ngày sang dạng YYYY-MM-DD cho ô chọn ngày
- [`StaffEditor`](../frontend/src/pages/admin/AdminStaffPage.jsx#L12) — Form thêm / sửa nhân viên
- [`Activity`](../frontend/src/pages/admin/AdminStaffPage.jsx#L49) — Nhật ký thao tác của một nhân viên
- [`AdminStaffPage`](../frontend/src/pages/admin/AdminStaffPage.jsx#L64) — UC-30 Admin quản lý nhân viên

**[pages/admin/AdminStoresPage.jsx](../frontend/src/pages/admin/AdminStoresPage.jsx)**
- [`StoreEditor`](../frontend/src/pages/admin/AdminStoresPage.jsx#L9) — Form thêm / sửa cửa hàng
- [`HoursEditor`](../frontend/src/pages/admin/AdminStoresPage.jsx#L37) — Form sửa giờ mở cửa 7 ngày
- [`AdminStoresPage`](../frontend/src/pages/admin/AdminStoresPage.jsx#L67) — UC-31 Admin quản lý cửa hàng

**[pages/admin/AdminTransactionsPage.jsx](../frontend/src/pages/admin/AdminTransactionsPage.jsx)**
- [`AdminTransactionsPage`](../frontend/src/pages/admin/AdminTransactionsPage.jsx#L4) — UC-35 Admin xem giao dịch

**[pages/admin/AdminWorkShiftsPage.jsx](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx)**
- [`vnd`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L11) — Định dạng tiền VND
- [`pad`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L14) — Thêm số 0 phía trước (5 → "05")
- [`ymd`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L16) — Đổi Date thành "YYYY-MM-DD"
- [`addDays`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L18) — Cộng thêm n ngày
- [`mondayOf`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L20) — Thứ Hai đầu tuần của một ngày
- [`hours`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L22) — Đổi số phút thành giờ (vd "7.5 h")
- [`time`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L24) — Định dạng giờ:phút
- [`datesBetween`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L27) — Các ngày trong khoảng thuộc những thứ đã chọn
- [`SlotCreator`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L35) — Form mở ca trống cho nhiều ngày (giờ, số người cần, ghi chú)
- [`SlotEditor`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L78) — Form sửa ca trống
- [`AdminWorkShiftsPage`](../frontend/src/pages/admin/AdminWorkShiftsPage.jsx#L99) — Admin quản lý ca làm: lịch tuần, ai đã nhận, chấm công, lương

**[pages/customer/AddressPage.jsx](../frontend/src/pages/customer/AddressPage.jsx)**
- [`messageOf`](../frontend/src/pages/customer/AddressPage.jsx#L11) — Lấy thông báo lỗi từ response API
- [`validate`](../frontend/src/pages/customer/AddressPage.jsx#L14) — Kiểm tra form địa chỉ
- [`AddressForm`](../frontend/src/pages/customer/AddressPage.jsx#L24) — Form thêm / sửa địa chỉ
- [`AddressPage`](../frontend/src/pages/customer/AddressPage.jsx#L67) — UC-07 Khách quản lý địa chỉ

**[pages/customer/CartPage.jsx](../frontend/src/pages/customer/CartPage.jsx)**
- [`CartPage`](../frontend/src/pages/customer/CartPage.jsx#L19) — UC-07 Giỏ hàng: xem, đổi số lượng, xóa sản phẩm

**[pages/customer/CheckoutPage.jsx](../frontend/src/pages/customer/CheckoutPage.jsx)**
- [`CheckoutPage`](../frontend/src/pages/customer/CheckoutPage.jsx#L18) — UC-08.1 Trang đặt hàng: xem lại đơn, mã giảm giá, ví, đặt hàng

**[pages/customer/MembershipPage.jsx](../frontend/src/pages/customer/MembershipPage.jsx)**
- [`formatDateTime`](../frontend/src/pages/customer/MembershipPage.jsx#L10) — Định dạng ngày giờ
- [`number`](../frontend/src/pages/customer/MembershipPage.jsx#L12) — Định dạng số
- [`messageOf`](../frontend/src/pages/customer/MembershipPage.jsx#L15) — Lấy thông báo lỗi từ response API
- [`MembershipPage`](../frontend/src/pages/customer/MembershipPage.jsx#L18) — UC-12 Trang thành viên: điểm, hạng, lịch sử điểm

**[pages/customer/MyReviewsPage.jsx](../frontend/src/pages/customer/MyReviewsPage.jsx)**
- [`RatingInput`](../frontend/src/pages/customer/MyReviewsPage.jsx#L11) — Chọn số sao
- [`messageOf`](../frontend/src/pages/customer/MyReviewsPage.jsx#L22) — Lấy thông báo lỗi từ response API
- [`MyReviewsPage`](../frontend/src/pages/customer/MyReviewsPage.jsx#L25) — UC-11 Khách đánh giá món đã nhận, sửa / xóa đánh giá của mình

**[pages/customer/NotificationsPage.jsx](../frontend/src/pages/customer/NotificationsPage.jsx)**
- [`NotificationsPage`](../frontend/src/pages/customer/NotificationsPage.jsx#L9) — Trang thông báo của người dùng

**[pages/customer/OrderDetailPage.jsx](../frontend/src/pages/customer/OrderDetailPage.jsx)**
- [`todayHours`](../frontend/src/pages/customer/OrderDetailPage.jsx#L15) — Giờ mở cửa hôm nay của cửa hàng
- [`Row`](../frontend/src/pages/customer/OrderDetailPage.jsx#L22) — Một dòng trong bảng tổng tiền
- [`OrderDetailPage`](../frontend/src/pages/customer/OrderDetailPage.jsx#L32) — UC-09.2 Chi tiết đơn của khách (hủy đơn nếu còn được)

**[pages/customer/OrderHistoryPage.jsx](../frontend/src/pages/customer/OrderHistoryPage.jsx)**
- [`VALID_STATUS`](../frontend/src/pages/customer/OrderHistoryPage.jsx#L15) — —
- [`OrderHistoryPage`](../frontend/src/pages/customer/OrderHistoryPage.jsx#L25) — UC-09.4 Lịch sử đơn đã kết thúc

**[pages/customer/OrderTrackingPage.jsx](../frontend/src/pages/customer/OrderTrackingPage.jsx)**
- [`OrderTrackingPage`](../frontend/src/pages/customer/OrderTrackingPage.jsx#L16) — UC-09.3 Theo dõi trạng thái đơn (tự làm mới)

**[pages/customer/OrdersPage.jsx](../frontend/src/pages/customer/OrdersPage.jsx)**
- [`VALID_STATUS`](../frontend/src/pages/customer/OrdersPage.jsx#L14) — —
- [`OrdersPage`](../frontend/src/pages/customer/OrdersPage.jsx#L17) — UC-09.1 Danh sách đơn của khách

**[pages/customer/PayOrderPage.jsx](../frontend/src/pages/customer/PayOrderPage.jsx)**
- [`ONLINE_METHODS`](../frontend/src/pages/customer/PayOrderPage.jsx#L13) — —
- [`PayOrderPage`](../frontend/src/pages/customer/PayOrderPage.jsx#L16) — UC-08.2 Thanh toán (lại) đơn đang chờ bằng VNPay

**[pages/customer/PaymentResultPage.jsx](../frontend/src/pages/customer/PaymentResultPage.jsx)**
- [`resolve`](../frontend/src/pages/customer/PaymentResultPage.jsx#L14) — Quyết định kết quả hiển thị từ trạng thái đơn do server trả về (không tin URL)
- [`PaymentResultPage`](../frontend/src/pages/customer/PaymentResultPage.jsx#L40) — Trang kết quả đặt hàng / thanh toán

**[pages/customer/ProfilePage.jsx](../frontend/src/pages/customer/ProfilePage.jsx)**
- [`ProfilePage`](../frontend/src/pages/customer/ProfilePage.jsx#L4) — UC-06 Hồ sơ khách hàng

**[pages/customer/SupportPage.jsx](../frontend/src/pages/customer/SupportPage.jsx)**
- [`date`](../frontend/src/pages/customer/SupportPage.jsx#L10) — Định dạng ngày
- [`errorMessage`](../frontend/src/pages/customer/SupportPage.jsx#L12) — Lấy thông báo lỗi từ response API
- [`SupportPage`](../frontend/src/pages/customer/SupportPage.jsx#L19) — Khách gửi và xem yêu cầu hỗ trợ / khiếu nại

**[pages/customer/WalletPage.jsx](../frontend/src/pages/customer/WalletPage.jsx)**
- [`WalletPage`](../frontend/src/pages/customer/WalletPage.jsx#L10) — Ví của khách: số dư và lịch sử cộng / trừ

**[pages/guest/ForgotPasswordPage.jsx](../frontend/src/pages/guest/ForgotPasswordPage.jsx)**
- [`ForgotPasswordPage`](../frontend/src/pages/guest/ForgotPasswordPage.jsx#L8) — UC-05/16 Nhập email để nhận link đặt lại mật khẩu

**[pages/guest/HomePage.jsx](../frontend/src/pages/guest/HomePage.jsx)**
- [`HomePage`](../frontend/src/pages/guest/HomePage.jsx#L20) — Trang chủ cửa hàng

**[pages/guest/LoginPage.jsx](../frontend/src/pages/guest/LoginPage.jsx)**
- [`LoginPage`](../frontend/src/pages/guest/LoginPage.jsx#L11) — UC-03/14/26 Trang đăng nhập

**[pages/guest/ProductDetailPage.jsx](../frontend/src/pages/guest/ProductDetailPage.jsx)**
- [`ProductDetailPage`](../frontend/src/pages/guest/ProductDetailPage.jsx#L19) — UC-02.2 Chi tiết sản phẩm

**[pages/guest/ProductListPage.jsx](../frontend/src/pages/guest/ProductListPage.jsx)**
- [`Icon`](../frontend/src/pages/guest/ProductListPage.jsx#L13) — Icon Material Symbols của trang sản phẩm
- [`ProductTile`](../frontend/src/pages/guest/ProductListPage.jsx#L16) — Thẻ sản phẩm trong danh sách
- [`ProductListPage`](../frontend/src/pages/guest/ProductListPage.jsx#L46) — UC-02.1/02.3 Danh sách và tìm kiếm sản phẩm (lọc danh mục, giá, còn hàng)

**[pages/guest/PromotionsPage.jsx](../frontend/src/pages/guest/PromotionsPage.jsx)**
- [`Icon`](../frontend/src/pages/guest/PromotionsPage.jsx#L13) — Icon Material Symbols của trang khuyến mãi
- [`promoValue`](../frontend/src/pages/guest/PromotionsPage.jsx#L15) — Mô tả mức giảm của khuyến mãi
- [`promoScore`](../frontend/src/pages/guest/PromotionsPage.jsx#L19) — Điểm xếp hạng khuyến mãi (giảm nhiều hơn xếp trước)
- [`endsInDays`](../frontend/src/pages/guest/PromotionsPage.jsx#L21) — Số ngày còn lại của khuyến mãi
- [`dateLabel`](../frontend/src/pages/guest/PromotionsPage.jsx#L23) — Định dạng ngày
- [`DealProductCard`](../frontend/src/pages/guest/PromotionsPage.jsx#L26) — Thẻ sản phẩm đang giảm giá
- [`CampaignCard`](../frontend/src/pages/guest/PromotionsPage.jsx#L45) — Thẻ chương trình khuyến mãi
- [`PromotionsPage`](../frontend/src/pages/guest/PromotionsPage.jsx#L63) — UC-02.4 Trang khuyến mãi

**[pages/guest/RegisterPage.jsx](../frontend/src/pages/guest/RegisterPage.jsx)**
- [`RegisterPage`](../frontend/src/pages/guest/RegisterPage.jsx#L9) — UC-01 Trang đăng ký

**[pages/guest/ResetPasswordPage.jsx](../frontend/src/pages/guest/ResetPasswordPage.jsx)**
- [`ResetPasswordPage`](../frontend/src/pages/guest/ResetPasswordPage.jsx#L8) — UC-05/16 Đặt mật khẩu mới từ link trong email

**[pages/staff/StaffComplaintDetailPage.jsx](../frontend/src/pages/staff/StaffComplaintDetailPage.jsx)**
- [`StaffComplaintDetailPage`](../frontend/src/pages/staff/StaffComplaintDetailPage.jsx#L15) — UC-19.3 Staff xem và phản hồi một khiếu nại

**[pages/staff/StaffComplaintsPage.jsx](../frontend/src/pages/staff/StaffComplaintsPage.jsx)**
- [`StaffComplaintsPage`](../frontend/src/pages/staff/StaffComplaintsPage.jsx#L15) — UC-19.3 Staff xem danh sách khiếu nại / yêu cầu hỗ trợ

**[pages/staff/StaffCustomerDetailPage.jsx](../frontend/src/pages/staff/StaffCustomerDetailPage.jsx)**
- [`StaffCustomerDetailPage`](../frontend/src/pages/staff/StaffCustomerDetailPage.jsx#L15) — UC-19.2 Staff xem chi tiết khách

**[pages/staff/StaffCustomersPage.jsx](../frontend/src/pages/staff/StaffCustomersPage.jsx)**
- [`StaffCustomersPage`](../frontend/src/pages/staff/StaffCustomersPage.jsx#L16) — UC-19.1 Staff xem khách hàng và đăng ký thành viên

**[pages/staff/StaffDashboardPage.jsx](../frontend/src/pages/staff/StaffDashboardPage.jsx)**
- [`n`](../frontend/src/pages/staff/StaffDashboardPage.jsx#L8) — Định dạng số
- [`StaffDashboardPage`](../frontend/src/pages/staff/StaffDashboardPage.jsx#L11) — Dashboard staff: hàng đợi đơn, doanh thu hôm nay, tồn kho

**[pages/staff/StaffInventoryPage.jsx](../frontend/src/pages/staff/StaffInventoryPage.jsx)**
- [`StaffInventoryPage`](../frontend/src/pages/staff/StaffInventoryPage.jsx#L4) — UC-19 Staff quản lý kho

**[pages/staff/StaffOrderDetailPage.jsx](../frontend/src/pages/staff/StaffOrderDetailPage.jsx)**
- [`StaffOrderDetailPage`](../frontend/src/pages/staff/StaffOrderDetailPage.jsx#L15) — Staff chuẩn bị đơn: chuyển trạng thái, thu tiền mặt, hủy đơn

**[pages/staff/StaffOrdersPage.jsx](../frontend/src/pages/staff/StaffOrdersPage.jsx)**
- [`StaffOrdersPage`](../frontend/src/pages/staff/StaffOrdersPage.jsx#L12) — Staff xem hàng đợi / lịch sử đơn

**[pages/staff/StaffPaymentPage.jsx](../frontend/src/pages/staff/StaffPaymentPage.jsx)**
- [`msg`](../frontend/src/pages/staff/StaffPaymentPage.jsx#L9) — Lấy thông báo lỗi từ response API
- [`StaffPaymentPage`](../frontend/src/pages/staff/StaffPaymentPage.jsx#L13) — UC-23 Staff thu tiền đơn tại quầy và in hóa đơn

**[pages/staff/StaffProductsPage.jsx](../frontend/src/pages/staff/StaffProductsPage.jsx)**
- [`StaffProductsPage`](../frontend/src/pages/staff/StaffProductsPage.jsx#L4) — UC-18 Staff quản lý sản phẩm

**[pages/staff/StaffProfilePage.jsx](../frontend/src/pages/staff/StaffProfilePage.jsx)**
- [`StaffProfilePage`](../frontend/src/pages/staff/StaffProfilePage.jsx#L4) — UC-17 Hồ sơ nhân viên

**[pages/staff/StaffPromotionsPage.jsx](../frontend/src/pages/staff/StaffPromotionsPage.jsx)**
- [`fmtDate`](../frontend/src/pages/staff/StaffPromotionsPage.jsx#L10) — Định dạng ngày
- [`valueText`](../frontend/src/pages/staff/StaffPromotionsPage.jsx#L12) — Mô tả mức giảm của khuyến mãi
- [`scopeDetail`](../frontend/src/pages/staff/StaffPromotionsPage.jsx#L14) — Mô tả phạm vi áp dụng của khuyến mãi
- [`StaffPromotionsPage`](../frontend/src/pages/staff/StaffPromotionsPage.jsx#L21) — UC-20 Staff xem khuyến mãi và tính thử cho hóa đơn

**[pages/staff/StaffTransactionsPage.jsx](../frontend/src/pages/staff/StaffTransactionsPage.jsx)**
- [`StaffTransactionsPage`](../frontend/src/pages/staff/StaffTransactionsPage.jsx#L4) — UC-23 Staff xem giao dịch (tiền thu hôm nay)

**[pages/staff/StoreOrderPage.jsx](../frontend/src/pages/staff/StoreOrderPage.jsx)**
- [`StoreOrderPage`](../frontend/src/pages/staff/StoreOrderPage.jsx#L17) — POS bán tại quầy: chọn sản phẩm, gắn thành viên, khuyến mãi, thu tiền, in hóa đơn

**[pages/staff/WorkShiftPage.jsx](../frontend/src/pages/staff/WorkShiftPage.jsx)**
- [`hm`](../frontend/src/pages/staff/WorkShiftPage.jsx#L9) — Định dạng giờ:phút
- [`dayText`](../frontend/src/pages/staff/WorkShiftPage.jsx#L11) — Định dạng ngày kèm thứ
- [`dur`](../frontend/src/pages/staff/WorkShiftPage.jsx#L13) — Đổi số phút thành "8h 00m"
- [`vnd`](../frontend/src/pages/staff/WorkShiftPage.jsx#L16) — Định dạng tiền VND
- [`Chip`](../frontend/src/pages/staff/WorkShiftPage.jsx#L19) — Nhãn trạng thái ca
- [`WorkShiftPage`](../frontend/src/pages/staff/WorkShiftPage.jsx#L22) — UC-24 Nhân viên nhận ca, vào / ra ca, xem lịch sử và thu nhập


## 6. Frontend — component, context, hook, layout, utils

Thành phần dùng lại giữa các trang.

**[App.jsx](../frontend/src/App.jsx)**
- [`App`](../frontend/src/App.jsx#L4) — Gốc ứng dụng: bọc các Provider và bộ định tuyến

**[components/admin/AdminCancelOrder.jsx](../frontend/src/components/admin/AdminCancelOrder.jsx)**
- [`AdminCancelOrder`](../frontend/src/components/admin/AdminCancelOrder.jsx#L12) — Nút + hộp hủy đơn cho staff/admin (chọn lý do; đơn đã trả thì hoàn tiền vào ví)

**[components/admin/AdminLayout.jsx](../frontend/src/components/admin/AdminLayout.jsx)**
- [`AdminLayout`](../frontend/src/components/admin/AdminLayout.jsx#L16) — Khung trang admin cũ (sidebar + nội dung)

**[components/admin/AdminOrderStatusActions.jsx](../frontend/src/components/admin/AdminOrderStatusActions.jsx)**
- [`AdminOrderStatusActions`](../frontend/src/components/admin/AdminOrderStatusActions.jsx#L16) — Nút chuyển đơn sang bước kế tiếp (đơn tiền mặt phải xác nhận đã thu)

**[components/admin/AdminShell.jsx](../frontend/src/components/admin/AdminShell.jsx)**
- [`AdminShell`](../frontend/src/components/admin/AdminShell.jsx#L36) — Khung trang admin: menu bên trái theo nhóm chức năng

**[components/admin/OrderIssues.jsx](../frontend/src/components/admin/OrderIssues.jsx)**
- [`OrderIssues`](../frontend/src/components/admin/OrderIssues.jsx#L9) — UC-34.4 Danh sách sự cố của đơn, ghi sự cố mới và ghi hướng xử lý

**[components/admin/kit/index.jsx](../frontend/src/components/admin/kit/index.jsx)**
- [`money`](../frontend/src/components/admin/kit/index.jsx#L6) — Định dạng tiền VND
- [`moneyVi`](../frontend/src/components/admin/kit/index.jsx#L8) — Định dạng tiền VND theo kiểu Việt Nam
- [`dt`](../frontend/src/components/admin/kit/index.jsx#L10) — Định dạng ngày giờ
- [`d`](../frontend/src/components/admin/kit/index.jsx#L12) — Định dạng ngày
- [`dtVi`](../frontend/src/components/admin/kit/index.jsx#L14) — Định dạng ngày giờ kiểu Việt Nam
- [`msgOf`](../frontend/src/components/admin/kit/index.jsx#L17) — Lấy thông báo lỗi từ response API
- [`useFetch`](../frontend/src/components/admin/kit/index.jsx#L24) — Hook tải dữ liệu theo params; trả { data, loading, error, reload }
- [`useAction`](../frontend/src/components/admin/kit/index.jsx#L45) — Hook chạy thao tác ghi: quản lý đang xử lý / lỗi / thông báo thành công, xong thì tải lại
- [`Notice`](../frontend/src/components/admin/kit/index.jsx#L60) — Dòng thông báo thành công / lỗi
- [`Pager`](../frontend/src/components/admin/kit/index.jsx#L68) — Thanh phân trang
- [`Tabs`](../frontend/src/components/admin/kit/index.jsx#L78) — Thanh tab lọc
- [`Stat`](../frontend/src/components/admin/kit/index.jsx#L87) — Ô số liệu thống kê
- [`Confirm`](../frontend/src/components/admin/kit/index.jsx#L92) — Hộp xác nhận thao tác
- [`Badge`](../frontend/src/components/admin/kit/index.jsx#L105) — Nhãn trạng thái có màu

**[components/admin/products/ProductDialogs.jsx](../frontend/src/components/admin/products/ProductDialogs.jsx)**
- [`Modal`](../frontend/src/components/admin/products/ProductDialogs.jsx#L5) — Khung hộp thoại
- [`ConfirmDialog`](../frontend/src/components/admin/products/ProductDialogs.jsx#L27) — Hộp xác nhận bật / tắt bán hoặc xóa sản phẩm
- [`PriceDialog`](../frontend/src/components/admin/products/ProductDialogs.jsx#L41) — UC-32.6 Hộp đổi giá sản phẩm

**[components/admin/products/ProductImagePicker.jsx](../frontend/src/components/admin/products/ProductImagePicker.jsx)**
- [`ProductImagePicker`](../frontend/src/components/admin/products/ProductImagePicker.jsx#L6) — Chọn ảnh sản phẩm từ thư viện ảnh

**[components/admin/products/productUtils.js](../frontend/src/components/admin/products/productUtils.js)**
- [`vnd`](../frontend/src/components/admin/products/productUtils.js#L2) — Định dạng tiền VND
- [`errMsg`](../frontend/src/components/admin/products/productUtils.js#L4) — Lấy thông báo lỗi từ response API
- [`mealLabel`](../frontend/src/components/admin/products/productUtils.js#L13) — Tên hiển thị của loại món (món chính, ăn vặt…)
- [`stockState`](../frontend/src/components/admin/products/productUtils.js#L16) — Trạng thái hiển thị của sản phẩm: đang bán / tắt + mức tồn kho
- [`categoryName`](../frontend/src/components/admin/products/productUtils.js#L24) — Tên danh mục của sản phẩm
- [`shortDate`](../frontend/src/components/admin/products/productUtils.js#L26) — Định dạng ngày ngắn

**[components/admin/products/useProductBase.js](../frontend/src/components/admin/products/useProductBase.js)**
- [`useProductBase`](../frontend/src/components/admin/products/useProductBase.js#L4) — Logic trang sản phẩm dùng chung admin / staff (staff không đổi giá, không bật / tắt bán)

**[components/auth/AuthField.jsx](../frontend/src/components/auth/AuthField.jsx)**
- [`AuthField`](../frontend/src/components/auth/AuthField.jsx#L5) — Ô nhập của form đăng nhập / đăng ký (nhãn, icon, hiện / ẩn mật khẩu, lỗi)

**[components/auth/AuthShell.jsx](../frontend/src/components/auth/AuthShell.jsx)**
- [`Icon`](../frontend/src/components/auth/AuthShell.jsx#L5) — Icon Material Symbols của trang đăng nhập
- [`AuthShell`](../frontend/src/components/auth/AuthShell.jsx#L16) — Khung chung cho trang đăng nhập / đăng ký / quên mật khẩu

**[components/auth/GoogleButton.jsx](../frontend/src/components/auth/GoogleButton.jsx)**
- [`loadGsi`](../frontend/src/components/auth/GoogleButton.jsx#L7) — Nạp thư viện Google Identity Services (một lần)
- [`GoogleButton`](../frontend/src/components/auth/GoogleButton.jsx#L24) — Nút đăng nhập bằng Google

**[components/cart/AddToCart.jsx](../frontend/src/components/cart/AddToCart.jsx)**
- [`AddToCart`](../frontend/src/components/cart/AddToCart.jsx#L12) — Khối chọn số lượng + thêm vào giỏ ở trang chi tiết sản phẩm

**[components/cart/QuantityStepper.jsx](../frontend/src/components/cart/QuantityStepper.jsx)**
- [`QuantityStepper`](../frontend/src/components/cart/QuantityStepper.jsx#L6) — Bộ tăng / giảm số lượng

**[components/checkout/PaymentMethodPicker.jsx](../frontend/src/components/checkout/PaymentMethodPicker.jsx)**
- [`PaymentMethodPicker`](../frontend/src/components/checkout/PaymentMethodPicker.jsx#L6) — Chọn phương thức thanh toán

**[components/checkout/PriceSummary.jsx](../frontend/src/components/checkout/PriceSummary.jsx)**
- [`PriceSummary`](../frontend/src/components/checkout/PriceSummary.jsx#L6) — Bảng tổng tiền: tạm tính, khuyến mãi, mã giảm giá, tổng thanh toán

**[components/common/CartIcon.jsx](../frontend/src/components/common/CartIcon.jsx)**
- [`CartIcon`](../frontend/src/components/common/CartIcon.jsx#L7) — Icon giỏ hàng (SVG)

**[components/common/Icon.jsx](../frontend/src/components/common/Icon.jsx)**
- [`Icon`](../frontend/src/components/common/Icon.jsx#L4) — Icon Material Symbols dùng chung

**[components/common/Loading.jsx](../frontend/src/components/common/Loading.jsx)**
- [`Loading`](../frontend/src/components/common/Loading.jsx#L2) — Trạng thái đang tải

**[components/common/NotificationBell.jsx](../frontend/src/components/common/NotificationBell.jsx)**
- [`NotificationBell`](../frontend/src/components/common/NotificationBell.jsx#L9) — Chuông thông báo: số chưa đọc + danh sách thông báo mới

**[components/common/UserAvatarIcon.jsx](../frontend/src/components/common/UserAvatarIcon.jsx)**
- [`UserAvatarIcon`](../frontend/src/components/common/UserAvatarIcon.jsx#L2) — Icon avatar mặc định (SVG)

**[components/dashboard/DashboardHeader.jsx](../frontend/src/components/dashboard/DashboardHeader.jsx)**
- [`fmt`](../frontend/src/components/dashboard/DashboardHeader.jsx#L4) — Định dạng ngày cho tiêu đề báo cáo
- [`rangeLabel`](../frontend/src/components/dashboard/DashboardHeader.jsx#L6) — Mô tả khoảng thời gian của báo cáo
- [`DashboardHeader`](../frontend/src/components/dashboard/DashboardHeader.jsx#L13) — Tiêu đề dashboard: chọn khoảng ngày, làm mới, xuất CSV
- [`exportCsv`](../frontend/src/components/dashboard/DashboardHeader.jsx#L51) — Xuất báo cáo đang xem ra file CSV

**[components/dashboard/DashboardWidgets.jsx](../frontend/src/components/dashboard/DashboardWidgets.jsx)**
- [`Icon`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L4) — Icon Material Symbols của dashboard
- [`compact`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L7) — Rút gọn số lớn (1.2M, 350K)
- [`num`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L15) — Định dạng số
- [`Panel`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L28) — Khung một khối trên dashboard
- [`Empty`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L37) — Trạng thái chưa có dữ liệu
- [`Delta`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L40) — Mũi tên tăng / giảm so với kỳ trước
- [`KpiCard`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L47) — Ô chỉ số chính (doanh thu, số đơn…)
- [`SalesChart`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L58) — Biểu đồ cột theo giờ / ngày (doanh thu hoặc số đơn)
- [`StatusBreakdown`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L85) — Tỉ lệ đơn theo trạng thái
- [`ChannelSplit`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L101) — So sánh đơn online và đơn tại quầy
- [`CategoryBreakdown`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L116) — Doanh thu theo danh mục
- [`Thumb`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L129) — Ảnh nhỏ của sản phẩm
- [`TopProducts`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L132) — Sản phẩm bán chạy
- [`StockAlerts`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L144) — Cảnh báo tồn kho (sắp hết, hết hạn)
- [`when`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L161) — Thời gian tương đối (5 phút trước…)
- [`RecentOrders`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L163) — Danh sách đơn gần đây
- [`OrderQueue`](../frontend/src/components/dashboard/DashboardWidgets.jsx#L178) — Hàng đợi đơn theo trạng thái

**[components/home/HomeHeader.jsx](../frontend/src/components/home/HomeHeader.jsx)**
- [`HomeHeader`](../frontend/src/components/home/HomeHeader.jsx#L26) — Header cửa hàng: logo, menu, tìm kiếm, giỏ hàng, chuông, avatar + menu tài khoản

**[components/home/HomeParts.jsx](../frontend/src/components/home/HomeParts.jsx)**
- [`Icon`](../frontend/src/components/home/HomeParts.jsx#L4) — Icon Material Symbols của trang chủ
- [`Media`](../frontend/src/components/home/HomeParts.jsx#L7) — Ảnh sản phẩm (chưa có ảnh thì hiện ô màu theo danh mục)
- [`ProductTile`](../frontend/src/components/home/HomeParts.jsx#L15) — Thẻ sản phẩm trên trang chủ
- [`PromoCard`](../frontend/src/components/home/HomeParts.jsx#L39) — Thẻ khuyến mãi trên trang chủ
- [`CategorySign`](../frontend/src/components/home/HomeParts.jsx#L60) — Biển danh mục trên trang chủ

**[components/home/MemberPass.jsx](../frontend/src/components/home/MemberPass.jsx)**
- [`MemberPass`](../frontend/src/components/home/MemberPass.jsx#L5) — Thẻ thành viên có mã QR của khách

**[components/home/PickupJourney.jsx](../frontend/src/components/home/PickupJourney.jsx)**
- [`ProcessArt`](../frontend/src/components/home/PickupJourney.jsx#L15) — Hình minh họa từng bước đặt và nhận hàng
- [`PickupJourney`](../frontend/src/components/home/PickupJourney.jsx#L49) — Khối giới thiệu quy trình đặt online và nhận tại cửa hàng

**[components/home/ProductModal.jsx](../frontend/src/components/home/ProductModal.jsx)**
- [`ProductModal`](../frontend/src/components/home/ProductModal.jsx#L11) — Hộp xem nhanh sản phẩm

**[components/home/ProductSearchInput.jsx](../frontend/src/components/home/ProductSearchInput.jsx)**
- [`ProductSearchInput`](../frontend/src/components/home/ProductSearchInput.jsx#L8) — Ô tìm kiếm sản phẩm có gợi ý

**[components/home/ProductStoreSection.jsx](../frontend/src/components/home/ProductStoreSection.jsx)**
- [`lettersOf`](../frontend/src/components/home/ProductStoreSection.jsx#L11) — Chữ viết tắt của tên sản phẩm (dùng khi chưa có ảnh)
- [`ShelfProduct`](../frontend/src/components/home/ProductStoreSection.jsx#L18) — Sản phẩm trên kệ hàng ở trang chủ
- [`ProductStoreSection`](../frontend/src/components/home/ProductStoreSection.jsx#L38) — Khu kệ hàng sản phẩm trên trang chủ

**[components/home/homeConfig.js](../frontend/src/components/home/homeConfig.js)**
- [`productImage`](../frontend/src/components/home/homeConfig.js#L8) — Ảnh đầu tiên của sản phẩm
- [`money`](../frontend/src/components/home/homeConfig.js#L11) — Định dạng tiền VND
- [`catMeta`](../frontend/src/components/home/homeConfig.js#L24) — Icon và màu của danh mục
- [`norm`](../frontend/src/components/home/homeConfig.js#L29) — Bỏ dấu + chữ thường để tìm kiếm không dấu
- [`idOf`](../frontend/src/components/home/homeConfig.js#L33) — Lấy id từ giá trị (đối tượng hoặc chuỗi)
- [`promoApplies`](../frontend/src/components/home/homeConfig.js#L36) — Khuyến mãi có áp dụng cho sản phẩm không
- [`discountOf`](../frontend/src/components/home/homeConfig.js#L46) — Số tiền giảm của khuyến mãi cho một sản phẩm
- [`bestPromo`](../frontend/src/components/home/homeConfig.js#L53) — Khuyến mãi giảm nhiều nhất cho sản phẩm (chỉ để hiển thị)
- [`promoValueText`](../frontend/src/components/home/homeConfig.js#L86) — Mô tả mức giảm của khuyến mãi (-10%, -5.000 đ)
- [`scopeText`](../frontend/src/components/home/homeConfig.js#L89) — Mô tả phạm vi áp dụng của khuyến mãi
- [`daysLeft`](../frontend/src/components/home/homeConfig.js#L96) — Số ngày còn lại của khuyến mãi
- [`stockState`](../frontend/src/components/home/homeConfig.js#L99) — Trạng thái kho để hiển thị (còn hàng / sắp hết / hết)
- [`openInfo`](../frontend/src/components/home/homeConfig.js#L107) — Cửa hàng hôm nay có đang mở không và giờ mở cửa

**[components/inventory/InventoryManager.jsx](../frontend/src/components/inventory/InventoryManager.jsx)**
- [`ProductPicker`](../frontend/src/components/inventory/InventoryManager.jsx#L15) — Chọn sản phẩm bằng tên / SKU / mã vạch
- [`FormShell`](../frontend/src/components/inventory/InventoryManager.jsx#L34) — Khung chung cho các form kho
- [`ReceiveForm`](../frontend/src/components/inventory/InventoryManager.jsx#L45) — Form nhập hàng (số lượng, hạn dùng, giá vốn)
- [`AdjustForm`](../frontend/src/components/inventory/InventoryManager.jsx#L73) — Form điều chỉnh tồn kho (bắt buộc lý do)
- [`DamagedForm`](../frontend/src/components/inventory/InventoryManager.jsx#L98) — Form ghi nhận hàng hỏng / hết hạn
- [`Batches`](../frontend/src/components/inventory/InventoryManager.jsx#L123) — Danh sách lô của một sản phẩm
- [`StockTable`](../frontend/src/components/inventory/InventoryManager.jsx#L136) — Bảng tồn kho (lọc còn / sắp hết / hết hàng)
- [`StocktakeTab`](../frontend/src/components/inventory/InventoryManager.jsx#L164) — Tab kiểm kê: tạo phiên, nhập số đếm, hoàn tất
- [`ExpiredTab`](../frontend/src/components/inventory/InventoryManager.jsx#L209) — Tab các lô đã hết hạn
- [`DamagedTab`](../frontend/src/components/inventory/InventoryManager.jsx#L228) — Tab lịch sử hàng hỏng
- [`HistoryTab`](../frontend/src/components/inventory/InventoryManager.jsx#L246) — Tab lịch sử biến động kho
- [`InventoryManager`](../frontend/src/components/inventory/InventoryManager.jsx#L271) — Trang quản lý kho dùng chung staff / admin (các tab theo quyền)

**[components/layout/PortalShell.jsx](../frontend/src/components/layout/PortalShell.jsx)**
- [`autoCrumbs`](../frontend/src/components/layout/PortalShell.jsx#L15) — Tự tạo breadcrumb từ menu và đường dẫn hiện tại
- [`PortalShell`](../frontend/src/components/layout/PortalShell.jsx#L26) — Khung trang staff / admin: sidebar, thanh trên cùng (Dashboard, chuông, avatar)

**[components/layout/PortalUserMenu.jsx](../frontend/src/components/layout/PortalUserMenu.jsx)**
- [`PortalUserMenu`](../frontend/src/components/layout/PortalUserMenu.jsx#L7) — Avatar + menu tài khoản trên thanh trên cùng của staff / admin

**[components/layout/StorefrontShell.jsx](../frontend/src/components/layout/StorefrontShell.jsx)**
- [`StorefrontShell`](../frontend/src/components/layout/StorefrontShell.jsx#L9) — Khung trang phía khách: header cửa hàng + nội dung + footer

**[components/membership/MemberCodeLookup.jsx](../frontend/src/components/membership/MemberCodeLookup.jsx)**
- [`MemberCodeLookup`](../frontend/src/components/membership/MemberCodeLookup.jsx#L7) — Ô tra mã thành viên (quét QR hoặc nhập mã)

**[components/order/AccountSidebar.jsx](../frontend/src/components/order/AccountSidebar.jsx)**
- [`initials`](../frontend/src/components/order/AccountSidebar.jsx#L20) — Chữ cái đầu của họ tên (cho avatar)
- [`AccountSidebar`](../frontend/src/components/order/AccountSidebar.jsx#L24) — Cột menu tài khoản bên trái các trang của khách

**[components/order/CancelReasonPicker.jsx](../frontend/src/components/order/CancelReasonPicker.jsx)**
- [`reasonText`](../frontend/src/components/order/CancelReasonPicker.jsx#L24) — Lý do hủy cuối cùng từ lựa chọn (chọn sẵn hoặc Other tự nhập)
- [`CancelReasonPicker`](../frontend/src/components/order/CancelReasonPicker.jsx#L27) — Danh sách lý do hủy đơn có sẵn + mục Other để tự nhập

**[components/order/CustomerCancelOrder.jsx](../frontend/src/components/order/CustomerCancelOrder.jsx)**
- [`CustomerCancelOrder`](../frontend/src/components/order/CustomerCancelOrder.jsx#L6) — Khách tự hủy đơn (chỉ khi staff chưa bắt đầu chuẩn bị)

**[components/order/OrderCard.jsx](../frontend/src/components/order/OrderCard.jsx)**
- [`Callout`](../frontend/src/components/order/OrderCard.jsx#L12) — Khối nhắc nổi bật theo trạng thái đơn
- [`OrderCard`](../frontend/src/components/order/OrderCard.jsx#L84) — Thẻ một đơn trong danh sách đơn của khách

**[components/order/OrderFilterTabs.jsx](../frontend/src/components/order/OrderFilterTabs.jsx)**
- [`OrderFilterTabs`](../frontend/src/components/order/OrderFilterTabs.jsx#L7) — Tab lọc đơn theo trạng thái (kèm số lượng)

**[components/order/OrderHistoryRow.jsx](../frontend/src/components/order/OrderHistoryRow.jsx)**
- [`OrderHistoryRow`](../frontend/src/components/order/OrderHistoryRow.jsx#L10) — Một dòng đơn trong lịch sử đơn

**[components/order/OrderStatusBadge.jsx](../frontend/src/components/order/OrderStatusBadge.jsx)**
- [`OrderStatusBadge`](../frontend/src/components/order/OrderStatusBadge.jsx#L7) — Nhãn trạng thái đơn

**[components/order/OrderTimeline.jsx](../frontend/src/components/order/OrderTimeline.jsx)**
- [`OrderTimeline`](../frontend/src/components/order/OrderTimeline.jsx#L8) — Timeline các mốc của đơn

**[components/product/ProductCard.jsx](../frontend/src/components/product/ProductCard.jsx)**
- [`ProductCard`](../frontend/src/components/product/ProductCard.jsx#L6) — Thẻ sản phẩm (ảnh, giá, khuyến mãi)

**[components/product/ProductGallery.jsx](../frontend/src/components/product/ProductGallery.jsx)**
- [`ProductGallery`](../frontend/src/components/product/ProductGallery.jsx#L5) — Ảnh sản phẩm: ảnh lớn + dải ảnh nhỏ

**[components/product/ProductReviews.jsx](../frontend/src/components/product/ProductReviews.jsx)**
- [`Stars`](../frontend/src/components/product/ProductReviews.jsx#L6) — Hiển thị số sao (kể cả số lẻ)
- [`fmtDate`](../frontend/src/components/product/ProductReviews.jsx#L16) — Định dạng ngày đánh giá
- [`ProductReviews`](../frontend/src/components/product/ProductReviews.jsx#L20) — UC-40.1 Điểm trung bình và danh sách đánh giá của sản phẩm

**[components/product/StoreReviewForm.jsx](../frontend/src/components/product/StoreReviewForm.jsx)**
- [`StoreReviewForm`](../frontend/src/components/product/StoreReviewForm.jsx#L6) — Form đánh giá cửa hàng

**[components/profile/ProfileView.jsx](../frontend/src/components/profile/ProfileView.jsx)**
- [`messageOf`](../frontend/src/components/profile/ProfileView.jsx#L11) — Lấy thông báo lỗi từ response API
- [`toDateInput`](../frontend/src/components/profile/ProfileView.jsx#L15) — Đổi ngày sang dạng YYYY-MM-DD cho ô chọn ngày
- [`today`](../frontend/src/components/profile/ProfileView.jsx#L17) — Ngày hôm nay dạng YYYY-MM-DD
- [`resizeImage`](../frontend/src/components/profile/ProfileView.jsx#L20) — Thu nhỏ ảnh đại diện về 256x256 JPEG trước khi lưu
- [`fmtDate`](../frontend/src/components/profile/ProfileView.jsx#L39) — Định dạng ngày giờ
- [`initials`](../frontend/src/components/profile/ProfileView.jsx#L41) — Chữ cái đầu của họ tên (cho avatar)
- [`Message`](../frontend/src/components/profile/ProfileView.jsx#L45) — Dòng thông báo thành công / lỗi
- [`ProfileView`](../frontend/src/components/profile/ProfileView.jsx#L51) — Trang hồ sơ dùng chung khách / staff / admin: sửa thông tin, ảnh, đổi mật khẩu

**[components/staff/ComplaintBadge.jsx](../frontend/src/components/staff/ComplaintBadge.jsx)**
- [`ComplaintBadge`](../frontend/src/components/staff/ComplaintBadge.jsx#L6) — Nhãn trạng thái / loại khiếu nại

**[components/staff/MemberPicker.jsx](../frontend/src/components/staff/MemberPicker.jsx)**
- [`MemberPicker`](../frontend/src/components/staff/MemberPicker.jsx#L8) — POS: tìm thành viên cho hóa đơn (SĐT / email / mã) hoặc đăng ký thành viên mới

**[components/staff/Receipt.jsx](../frontend/src/components/staff/Receipt.jsx)**
- [`Receipt`](../frontend/src/components/staff/Receipt.jsx#L9) — Hóa đơn thanh toán để in

**[components/staff/RegisterMemberForm.jsx](../frontend/src/components/staff/RegisterMemberForm.jsx)**
- [`RegisterMemberForm`](../frontend/src/components/staff/RegisterMemberForm.jsx#L10) — Form đăng ký thành viên tại quầy (họ tên, email bắt buộc, SĐT tùy chọn)

**[components/staff/StaffShell.jsx](../frontend/src/components/staff/StaffShell.jsx)**
- [`StaffShell`](../frontend/src/components/staff/StaffShell.jsx#L31) — Khung trang staff: menu bên trái theo nhóm chức năng

**[components/transaction/TransactionManager.jsx](../frontend/src/components/transaction/TransactionManager.jsx)**
- [`dt`](../frontend/src/components/transaction/TransactionManager.jsx#L12) — Định dạng ngày giờ
- [`Badge`](../frontend/src/components/transaction/TransactionManager.jsx#L16) — Nhãn trạng thái giao dịch
- [`Row`](../frontend/src/components/transaction/TransactionManager.jsx#L18) — Một dòng thông tin trong chi tiết giao dịch
- [`TransactionManager`](../frontend/src/components/transaction/TransactionManager.jsx#L21) — Trang giao dịch dùng chung staff / admin: tìm, lọc, xem chi tiết, in hóa đơn

**[context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx)**
- [`AuthProvider`](../frontend/src/context/AuthContext.jsx#L7) — Lưu người đang đăng nhập; cung cấp login, register, googleLogin, logout

**[context/NotificationContext.jsx](../frontend/src/context/NotificationContext.jsx)**
- [`notificationPath`](../frontend/src/context/NotificationContext.jsx#L8) — Đường dẫn mở khi bấm vào một thông báo
- [`NotificationProvider`](../frontend/src/context/NotificationContext.jsx#L13) — Tải và làm mới thông báo định kỳ, cung cấp cho toàn ứng dụng
- [`useNotifications`](../frontend/src/context/NotificationContext.jsx#L51) — Hook lấy dữ liệu thông báo

**[hooks/useAuth.js](../frontend/src/hooks/useAuth.js)**
- [`useAuth`](../frontend/src/hooks/useAuth.js#L5) — Hook lấy thông tin đăng nhập từ AuthContext

**[hooks/useDashboard.js](../frontend/src/hooks/useDashboard.js)**
- [`useDashboard`](../frontend/src/hooks/useDashboard.js#L5) — Hook tải số liệu dashboard admin / staff theo khoảng ngày

**[hooks/useHomeStoryAnimations.js](../frontend/src/hooks/useHomeStoryAnimations.js)**
- [`useHomeStoryAnimations`](../frontend/src/hooks/useHomeStoryAnimations.js#L8) — Hiệu ứng cuộn của trang chủ

**[hooks/useSmoothScroll.js](../frontend/src/hooks/useSmoothScroll.js)**
- [`useSmoothScroll`](../frontend/src/hooks/useSmoothScroll.js#L10) — Cuộn mượt cho trang chủ (thiết bị cảm ứng giữ cuộn gốc)

**[layouts/AdminLayout.jsx](../frontend/src/layouts/AdminLayout.jsx)**
- [`AdminLayout`](../frontend/src/layouts/AdminLayout.jsx#L5) — Layout các trang /admin/* (Reviews tự dựng khung riêng)

**[layouts/CustomerLayout.jsx](../frontend/src/layouts/CustomerLayout.jsx)**
- [`CustomerLayout`](../frontend/src/layouts/CustomerLayout.jsx#L4) — Layout các trang của khách (dùng khung cửa hàng)

**[layouts/PublicLayout.jsx](../frontend/src/layouts/PublicLayout.jsx)**
- [`PublicLayout`](../frontend/src/layouts/PublicLayout.jsx#L4) — Layout các trang công khai (dùng khung cửa hàng)

**[layouts/StaffLayout.jsx](../frontend/src/layouts/StaffLayout.jsx)**
- [`StaffLayout`](../frontend/src/layouts/StaffLayout.jsx#L5) — Layout các trang /staff/*

**[routes/AppRouter.jsx](../frontend/src/routes/AppRouter.jsx)**
- [`HomePage`](../frontend/src/routes/AppRouter.jsx#L76) — Tải trang chủ theo kiểu lazy
- [`AppRouter`](../frontend/src/routes/AppRouter.jsx#L79) — Khai báo toàn bộ đường dẫn của web theo vai trò

**[routes/ProtectedRoute.jsx](../frontend/src/routes/ProtectedRoute.jsx)**
- [`ProtectedRoute`](../frontend/src/routes/ProtectedRoute.jsx#L6) — Chặn trang khi chưa đăng nhập hoặc sai vai trò

**[utils/dateRange.js](../frontend/src/utils/dateRange.js)**
- [`pad`](../frontend/src/utils/dateRange.js#L2) — Thêm số 0 phía trước (5 → "05")
- [`toYMD`](../frontend/src/utils/dateRange.js#L5) — Đổi Date thành "YYYY-MM-DD"
- [`daysAgoYMD`](../frontend/src/utils/dateRange.js#L8) — Ngày cách hôm nay n ngày dạng "YYYY-MM-DD"
- [`monthsAgoYMD`](../frontend/src/utils/dateRange.js#L11) — Ngày cách hôm nay n tháng dạng "YYYY-MM-DD"
- [`isYMD`](../frontend/src/utils/dateRange.js#L14) — Chuỗi có đúng dạng "YYYY-MM-DD" không
- [`validYMD`](../frontend/src/utils/dateRange.js#L16) — Chuỗi "YYYY-MM-DD" có phải ngày hợp lệ không
- [`dayStartISO`](../frontend/src/utils/dateRange.js#L19) — 00:00 của ngày theo giờ máy người dùng, dạng ISO
- [`dayEndISO`](../frontend/src/utils/dateRange.js#L21) — 23:59:59 của ngày theo giờ máy người dùng, dạng ISO

**[utils/format.js](../frontend/src/utils/format.js)**
- [`formatCurrency`](../frontend/src/utils/format.js#L2) — Định dạng tiền VND
- [`formatDate`](../frontend/src/utils/format.js#L6) — Định dạng ngày
- [`formatDateTime`](../frontend/src/utils/format.js#L9) — Định dạng ngày giờ (16/10/2026 18:15)
- [`formatTime`](../frontend/src/utils/format.js#L13) — Định dạng giờ (18:15)

**[utils/idempotency.js](../frontend/src/utils/idempotency.js)**
- [`newIdempotencyKey`](../frontend/src/utils/idempotency.js#L2) — Tạo khóa chống đặt trùng cho mỗi lần bấm đặt hàng

**[utils/orderMeta.js](../frontend/src/utils/orderMeta.js)**
- [`paymentSummary`](../frontend/src/utils/orderMeta.js#L33) — Mô tả ngắn về thanh toán của đơn
- [`statusMessage`](../frontend/src/utils/orderMeta.js#L66) — Thông điệp trạng thái đơn có xét tình trạng thanh toán

**[utils/orderTimeline.js](../frontend/src/utils/orderTimeline.js)**
- [`buildTimeline`](../frontend/src/utils/orderTimeline.js#L14) — Dựng các mốc timeline của đơn (đã qua / hiện tại / sắp tới / lỗi)

**[utils/productSearch.js](../frontend/src/utils/productSearch.js)**
- [`normalizeProductSearch`](../frontend/src/utils/productSearch.js#L2) — Chuẩn hóa từ khóa tìm kiếm (bỏ dấu, chữ thường)
- [`matchesProductSearch`](../frontend/src/utils/productSearch.js#L12) — Sản phẩm có khớp từ khóa tìm kiếm không

**[utils/promoPrice.js](../frontend/src/utils/promoPrice.js)**
- [`sameId`](../frontend/src/utils/promoPrice.js#L4) — Hai id có giống nhau không
- [`estimatePromo`](../frontend/src/utils/promoPrice.js#L7) — Giá sau khuyến mãi ước tính cho một sản phẩm (cùng cách tính với backend)


## 7. Frontend — gọi API

Mỗi hàm gọi đúng một API ở mục 1 (axios tự gắn token).

**[api/address.api.js](../frontend/src/api/address.api.js)**
- [`listAddresses`](../frontend/src/api/address.api.js#L4) — Gọi API: danh sách địa chỉ của khách (UC-07.1)
- [`addAddress`](../frontend/src/api/address.api.js#L7) — Gọi API: thêm địa chỉ (UC-07.2)
- [`updateAddress`](../frontend/src/api/address.api.js#L10) — Gọi API: sửa địa chỉ (UC-07.3)
- [`deleteAddress`](../frontend/src/api/address.api.js#L13) — Gọi API: xóa địa chỉ (UC-07.4)

**[api/auth.api.js](../frontend/src/api/auth.api.js)**
- [`register`](../frontend/src/api/auth.api.js#L4) — Gọi API: đăng ký tài khoản (UC-01)
- [`login`](../frontend/src/api/auth.api.js#L7) — Gọi API: đăng nhập (UC-03/14/26)
- [`googleLogin`](../frontend/src/api/auth.api.js#L10) — Gọi API: đăng nhập bằng Google
- [`logout`](../frontend/src/api/auth.api.js#L13) — Gọi API: đăng xuất (UC-04/15/27)
- [`forgotPassword`](../frontend/src/api/auth.api.js#L16) — Gọi API: gửi email đặt lại mật khẩu (UC-05/16)
- [`resetPassword`](../frontend/src/api/auth.api.js#L19) — Gọi API: đặt mật khẩu mới bằng token
- [`getMe`](../frontend/src/api/auth.api.js#L22) — Gọi API: thông tin người đang đăng nhập

**[api/cart.api.js](../frontend/src/api/cart.api.js)**
- [`publishCart`](../frontend/src/api/cart.api.js#L4) — Phát sự kiện giỏ hàng thay đổi để header cập nhật số lượng
- [`getCart`](../frontend/src/api/cart.api.js#L10) — Gọi API: xem giỏ hàng (UC-07.1)
- [`addCartItem`](../frontend/src/api/cart.api.js#L13) — Gọi API: thêm sản phẩm vào giỏ (UC-07.2)
- [`updateCartItem`](../frontend/src/api/cart.api.js#L16) — Gọi API: đổi số lượng (UC-07.3)
- [`removeCartItem`](../frontend/src/api/cart.api.js#L19) — Gọi API: xóa sản phẩm khỏi giỏ (UC-07.4)
- [`getCartSuggestions`](../frontend/src/api/cart.api.js#L22) — Gọi API: gợi ý giỏ hàng theo ngân sách (backend chưa làm)

**[api/category.api.js](../frontend/src/api/category.api.js)**
- [`listCategories`](../frontend/src/api/category.api.js#L4) — Gọi API: danh sách danh mục (UC-33.1)
- [`createCategory`](../frontend/src/api/category.api.js#L7) — Gọi API: thêm danh mục (UC-33.2)
- [`updateCategory`](../frontend/src/api/category.api.js#L10) — Gọi API: sửa danh mục (UC-33.3)
- [`deleteCategory`](../frontend/src/api/category.api.js#L13) — Gọi API: xóa danh mục (UC-33.4)

**[api/customer.api.js](../frontend/src/api/customer.api.js)**
- [`listCustomers`](../frontend/src/api/customer.api.js#L4) — Gọi API: danh sách khách hàng (UC-19.1)
- [`getCustomer`](../frontend/src/api/customer.api.js#L7) — Gọi API: chi tiết khách hàng (UC-19.2)
- [`updateCustomer`](../frontend/src/api/customer.api.js#L10) — Gọi API: admin sửa khách (UC-29.4)
- [`unlockCustomer`](../frontend/src/api/customer.api.js#L13) — Gọi API: mở khóa khách (UC-29.5)
- [`deleteCustomer`](../frontend/src/api/customer.api.js#L16) — Gọi API: xóa khách (UC-29.6)
- [`registerMember`](../frontend/src/api/customer.api.js#L19) — Gọi API: đăng ký thành viên tại quầy
- [`findMember`](../frontend/src/api/customer.api.js#L22) — Gọi API: tìm thành viên theo SĐT / email / mã

**[api/dashboard.api.js](../frontend/src/api/dashboard.api.js)**
- [`getAdminDashboard`](../frontend/src/api/dashboard.api.js#L4) — Gọi API: số liệu dashboard admin
- [`getStaffDashboard`](../frontend/src/api/dashboard.api.js#L7) — Gọi API: số liệu dashboard staff

**[api/discountCode.api.js](../frontend/src/api/discountCode.api.js)**
- [`validateDiscountCode`](../frontend/src/api/discountCode.api.js#L4) — Gọi API: kiểm tra mã giảm giá
- [`listDiscountCodes`](../frontend/src/api/discountCode.api.js#L7) — Gọi API: danh sách mã (UC-38.1)
- [`createDiscountCode`](../frontend/src/api/discountCode.api.js#L10) — Gọi API: tạo mã (UC-38.2)
- [`updateDiscountCode`](../frontend/src/api/discountCode.api.js#L13) — Gọi API: sửa mã (UC-38.3)
- [`activateDiscountCode`](../frontend/src/api/discountCode.api.js#L16) — Gọi API: kích hoạt mã (UC-38.4)
- [`suspendDiscountCode`](../frontend/src/api/discountCode.api.js#L19) — Gọi API: tạm ngưng mã (UC-38.5)
- [`deleteDiscountCode`](../frontend/src/api/discountCode.api.js#L22) — Gọi API: xóa mã (UC-38.6)

**[api/inventory.api.js](../frontend/src/api/inventory.api.js)**
- [`listInventory`](../frontend/src/api/inventory.api.js#L4) — Gọi API: xem tồn kho (UC-19.1/34.1)
- [`receiveStock`](../frontend/src/api/inventory.api.js#L7) — Gọi API: nhập hàng (UC-19.2)
- [`adjustInventory`](../frontend/src/api/inventory.api.js#L10) — Gọi API: điều chỉnh tồn kho (UC-19.3/34.2)
- [`listStocktakes`](../frontend/src/api/inventory.api.js#L13) — Gọi API: danh sách phiên kiểm kê
- [`createStocktake`](../frontend/src/api/inventory.api.js#L16) — Gọi API: tạo phiên kiểm kê
- [`completeStocktake`](../frontend/src/api/inventory.api.js#L19) — Gọi API: hoàn tất kiểm kê
- [`listLowStock`](../frontend/src/api/inventory.api.js#L22) — Gọi API: sản phẩm sắp hết hàng
- [`listExpired`](../frontend/src/api/inventory.api.js#L25) — Gọi API: lô đã hết hạn
- [`listOutOfStock`](../frontend/src/api/inventory.api.js#L28) — Gọi API: sản phẩm hết hàng
- [`listDamaged`](../frontend/src/api/inventory.api.js#L31) — Gọi API: lịch sử hàng hỏng
- [`recordDamaged`](../frontend/src/api/inventory.api.js#L34) — Gọi API: ghi nhận hàng hỏng
- [`getInventoryHistory`](../frontend/src/api/inventory.api.js#L37) — Gọi API: lịch sử biến động kho
- [`getProductStock`](../frontend/src/api/inventory.api.js#L40) — Gọi API: các lô còn hàng của một sản phẩm

**[api/membership.api.js](../frontend/src/api/membership.api.js)**
- [`getMyMembership`](../frontend/src/api/membership.api.js#L4) — Gọi API: điểm và hạng của khách (UC-12.1)
- [`getMyPointHistory`](../frontend/src/api/membership.api.js#L7) — Gọi API: lịch sử điểm của khách (UC-12.2)
- [`lookupMemberCode`](../frontend/src/api/membership.api.js#L9) — Gọi API: tra mã thành viên
- [`listMembers`](../frontend/src/api/membership.api.js#L12) — Gọi API: danh sách thành viên (UC-39.1/39.2)
- [`getMember`](../frontend/src/api/membership.api.js#L15) — Gọi API: chi tiết thành viên (UC-39.3)
- [`adjustPoints`](../frontend/src/api/membership.api.js#L18) — Gọi API: cộng / trừ điểm (UC-39.5)
- [`listTiers`](../frontend/src/api/membership.api.js#L21) — Gọi API: danh sách hạng
- [`createTier`](../frontend/src/api/membership.api.js#L24) — Gọi API: thêm hạng
- [`updateTier`](../frontend/src/api/membership.api.js#L27) — Gọi API: sửa hạng
- [`deleteTier`](../frontend/src/api/membership.api.js#L30) — Gọi API: xóa hạng
- [`listPointHistory`](../frontend/src/api/membership.api.js#L33) — Gọi API: lịch sử điểm (UC-39.6)
- [`listRedemptions`](../frontend/src/api/membership.api.js#L36) — Gọi API: lịch sử đổi điểm (UC-39.7)

**[api/notification.api.js](../frontend/src/api/notification.api.js)**
- [`listNotifications`](../frontend/src/api/notification.api.js#L3) — Gọi API: thông báo của tôi
- [`readNotification`](../frontend/src/api/notification.api.js#L5) — Gọi API: đánh dấu đã đọc một thông báo
- [`readAllNotifications`](../frontend/src/api/notification.api.js#L7) — Gọi API: đánh dấu đã đọc tất cả
- [`listManagedNotifications`](../frontend/src/api/notification.api.js#L9) — Gọi API: admin xem thông báo đã soạn
- [`createNotification`](../frontend/src/api/notification.api.js#L11) — Gọi API: admin tạo thông báo
- [`updateNotification`](../frontend/src/api/notification.api.js#L13) — Gọi API: admin sửa thông báo
- [`publishNotification`](../frontend/src/api/notification.api.js#L15) — Gọi API: admin đăng thông báo
- [`archiveNotification`](../frontend/src/api/notification.api.js#L17) — Gọi API: admin gỡ thông báo
- [`getNotificationSettings`](../frontend/src/api/notification.api.js#L19) — Gọi API: xem cấu hình thông báo tự động
- [`saveNotificationSettings`](../frontend/src/api/notification.api.js#L21) — Gọi API: lưu cấu hình thông báo tự động

**[api/order.api.js](../frontend/src/api/order.api.js)**
- [`createOrder`](../frontend/src/api/order.api.js#L4) — Gọi API: tạo đơn (UC-08.1, có Idempotency-Key)
- [`previewCheckout`](../frontend/src/api/order.api.js#L8) — Gọi API: xem trước đơn
- [`listMyOrders`](../frontend/src/api/order.api.js#L11) — Gọi API: đơn của tôi (UC-09.1)
- [`getMyOrder`](../frontend/src/api/order.api.js#L14) — Gọi API: chi tiết đơn của tôi (UC-09.2)
- [`trackMyOrder`](../frontend/src/api/order.api.js#L17) — Gọi API: theo dõi đơn (UC-09.3)
- [`listMyOrderHistory`](../frontend/src/api/order.api.js#L20) — Gọi API: lịch sử đơn (UC-09.4)
- [`createStoreOrder`](../frontend/src/api/order.api.js#L23) — Gọi API: tạo đơn tại quầy (UC-22)
- [`quoteStoreOrder`](../frontend/src/api/order.api.js#L25) — Gọi API: báo giá hóa đơn tại quầy
- [`checkoutPosSale`](../frontend/src/api/order.api.js#L27) — Gọi API: chốt bán tại quầy (POS)
- [`listStaffOrders`](../frontend/src/api/order.api.js#L29) — Gọi API: staff xem hàng đợi / lịch sử đơn
- [`getStaffOrder`](../frontend/src/api/order.api.js#L31) — Gọi API: staff xem chi tiết đơn
- [`updateStaffOrder`](../frontend/src/api/order.api.js#L33) — Gọi API: staff chuyển trạng thái đơn
- [`cancelStaffOrder`](../frontend/src/api/order.api.js#L35) — Gọi API: staff hủy đơn
- [`listOrders`](../frontend/src/api/order.api.js#L38) — Gọi API: admin xem / tìm đơn (UC-34.1/34.2)
- [`getOrder`](../frontend/src/api/order.api.js#L41) — Gọi API: admin xem chi tiết đơn (UC-34.3)
- [`updateOrderStatus`](../frontend/src/api/order.api.js#L44) — Gọi API: admin chuyển trạng thái đơn
- [`handleOrderIssue`](../frontend/src/api/order.api.js#L47) — Gọi API: ghi nhận sự cố đơn (UC-34.4)
- [`resolveOrderIssue`](../frontend/src/api/order.api.js#L49) — Gọi API: đóng sự cố đơn
- [`cancelOrder`](../frontend/src/api/order.api.js#L52) — Gọi API: admin hủy đơn
- [`listRefunds`](../frontend/src/api/order.api.js#L55) — Gọi API: lịch sử hoàn tiền

**[api/payment.api.js](../frontend/src/api/payment.api.js)**
- [`createOnlinePayment`](../frontend/src/api/payment.api.js#L4) — Gọi API: tạo link thanh toán VNPay (UC-08.2)
- [`vnpayReturn`](../frontend/src/api/payment.api.js#L7) — Gọi API: kết quả VNPay chuyển về
- [`vnpayIpn`](../frontend/src/api/payment.api.js#L10) — Gọi API: IPN của VNPay
- [`processCashPayment`](../frontend/src/api/payment.api.js#L13) — Gọi API: thu tiền mặt (UC-23.1)
- [`processCardPayment`](../frontend/src/api/payment.api.js#L16) — Gọi API: thu tiền thẻ / ví (UC-23.2)
- [`listPayments`](../frontend/src/api/payment.api.js#L19) — Gọi API: tất cả giao dịch (UC-41.1)
- [`listFailedPayments`](../frontend/src/api/payment.api.js#L22) — Gọi API: giao dịch thất bại (UC-41.2)
- [`listPendingPayments`](../frontend/src/api/payment.api.js#L25) — Gọi API: giao dịch đang chờ (UC-41.3)
- [`handlePaymentError`](../frontend/src/api/payment.api.js#L28) — Gọi API: xử lý giao dịch lỗi (UC-41.4)
- [`listStoreOrdersToPay`](../frontend/src/api/payment.api.js#L31) — Gọi API: đơn tại quầy chờ thu tiền
- [`getReceipt`](../frontend/src/api/payment.api.js#L34) — Gọi API: dữ liệu hóa đơn để in

**[api/product.api.js](../frontend/src/api/product.api.js)**
- [`listProducts`](../frontend/src/api/product.api.js#L4) — Gọi API: xem / tìm sản phẩm
- [`getProduct`](../frontend/src/api/product.api.js#L7) — Gọi API: chi tiết sản phẩm
- [`createProduct`](../frontend/src/api/product.api.js#L10) — Gọi API: thêm sản phẩm
- [`updateProduct`](../frontend/src/api/product.api.js#L13) — Gọi API: sửa sản phẩm
- [`updateProductPrice`](../frontend/src/api/product.api.js#L16) — Gọi API: đổi giá (UC-32.6)
- [`activateProduct`](../frontend/src/api/product.api.js#L19) — Gọi API: bật bán sản phẩm
- [`deactivateProduct`](../frontend/src/api/product.api.js#L22) — Gọi API: tắt bán sản phẩm
- [`deleteProduct`](../frontend/src/api/product.api.js#L25) — Gọi API: xóa sản phẩm

**[api/profile.api.js](../frontend/src/api/profile.api.js)**
- [`getProfile`](../frontend/src/api/profile.api.js#L4) — Gọi API: xem hồ sơ
- [`updateProfile`](../frontend/src/api/profile.api.js#L7) — Gọi API: sửa hồ sơ
- [`changePassword`](../frontend/src/api/profile.api.js#L10) — Gọi API: đổi mật khẩu

**[api/promotion.api.js](../frontend/src/api/promotion.api.js)**
- [`listPromotions`](../frontend/src/api/promotion.api.js#L4) — Gọi API: khuyến mãi đang chạy
- [`applyPromotion`](../frontend/src/api/promotion.api.js#L7) — Gọi API: tính thử khuyến mãi cho hóa đơn
- [`listAllPromotions`](../frontend/src/api/promotion.api.js#L10) — Gọi API: admin xem tất cả khuyến mãi
- [`createPromotion`](../frontend/src/api/promotion.api.js#L13) — Gọi API: tạo khuyến mãi
- [`updatePromotion`](../frontend/src/api/promotion.api.js#L16) — Gọi API: sửa khuyến mãi
- [`activatePromotion`](../frontend/src/api/promotion.api.js#L19) — Gọi API: kích hoạt khuyến mãi
- [`suspendPromotion`](../frontend/src/api/promotion.api.js#L22) — Gọi API: tạm ngưng khuyến mãi
- [`deletePromotion`](../frontend/src/api/promotion.api.js#L25) — Gọi API: xóa khuyến mãi

**[api/review.api.js](../frontend/src/api/review.api.js)**
- [`listProductReviews`](../frontend/src/api/review.api.js#L4) — Gọi API: đánh giá của sản phẩm (UC-40.1)
- [`listStoreReviews`](../frontend/src/api/review.api.js#L7) — Gọi API: đánh giá cửa hàng (UC-40.2)
- [`listMyReviews`](../frontend/src/api/review.api.js#L9) — Gọi API: đánh giá của tôi
- [`listEligibleReviews`](../frontend/src/api/review.api.js#L11) — Gọi API: món còn đánh giá được
- [`addReview`](../frontend/src/api/review.api.js#L14) — Gọi API: thêm đánh giá (UC-11.1)
- [`updateReview`](../frontend/src/api/review.api.js#L17) — Gọi API: sửa đánh giá (UC-11.2)
- [`deleteReview`](../frontend/src/api/review.api.js#L20) — Gọi API: xóa đánh giá (UC-11.3)
- [`listReviewsAdmin`](../frontend/src/api/review.api.js#L23) — Gọi API: admin xem tất cả đánh giá
- [`hideReview`](../frontend/src/api/review.api.js#L26) — Gọi API: ẩn / hiện đánh giá (UC-40.3)
- [`handleViolatingReview`](../frontend/src/api/review.api.js#L29) — Gọi API: xử lý đánh giá vi phạm (UC-40.4)

**[api/staff.api.js](../frontend/src/api/staff.api.js)**
- [`listStaff`](../frontend/src/api/staff.api.js#L4) — Gọi API: danh sách nhân viên (UC-30.1)
- [`addStaff`](../frontend/src/api/staff.api.js#L7) — Gọi API: thêm nhân viên (UC-30.2)
- [`updateStaff`](../frontend/src/api/staff.api.js#L10) — Gọi API: sửa nhân viên (UC-30.3)
- [`lockStaff`](../frontend/src/api/staff.api.js#L13) — Gọi API: khóa nhân viên (UC-30.4)
- [`unlockStaff`](../frontend/src/api/staff.api.js#L16) — Gọi API: mở khóa nhân viên (UC-30.5)
- [`getStaffActivity`](../frontend/src/api/staff.api.js#L19) — Gọi API: nhật ký thao tác nhân viên (UC-30.6)

**[api/store.api.js](../frontend/src/api/store.api.js)**
- [`listStores`](../frontend/src/api/store.api.js#L4) — Gọi API: danh sách cửa hàng
- [`addStore`](../frontend/src/api/store.api.js#L7) — Gọi API: thêm cửa hàng
- [`updateStore`](../frontend/src/api/store.api.js#L10) — Gọi API: sửa cửa hàng
- [`closeStore`](../frontend/src/api/store.api.js#L13) — Gọi API: đóng cửa hàng
- [`openStore`](../frontend/src/api/store.api.js#L16) — Gọi API: mở cửa hàng
- [`updateStoreHours`](../frontend/src/api/store.api.js#L19) — Gọi API: cập nhật giờ mở cửa

**[api/support.api.js](../frontend/src/api/support.api.js)**
- [`submitSupportRequest`](../frontend/src/api/support.api.js#L4) — Gọi API: khách gửi yêu cầu hỗ trợ
- [`listMySupportRequests`](../frontend/src/api/support.api.js#L7) — Gọi API: yêu cầu hỗ trợ của tôi
- [`listSupportRequests`](../frontend/src/api/support.api.js#L10) — Gọi API: staff xem yêu cầu / khiếu nại (UC-19.3)
- [`getSupportRequest`](../frontend/src/api/support.api.js#L13) — Gọi API: chi tiết yêu cầu / khiếu nại
- [`handleComplaint`](../frontend/src/api/support.api.js#L16) — Gọi API: phản hồi / chuyển trạng thái khiếu nại

**[api/transaction.api.js](../frontend/src/api/transaction.api.js)**
- [`listTransactions`](../frontend/src/api/transaction.api.js#L4) — Gọi API: xem / tìm giao dịch
- [`getTransaction`](../frontend/src/api/transaction.api.js#L7) — Gọi API: chi tiết giao dịch

**[api/workShift.api.js](../frontend/src/api/workShift.api.js)**
- [`listMyShifts`](../frontend/src/api/workShift.api.js#L4) — Gọi API: ca làm của tôi
- [`clockIn`](../frontend/src/api/workShift.api.js#L7) — Gọi API: vào ca
- [`clockOut`](../frontend/src/api/workShift.api.js#L10) — Gọi API: ra ca
- [`listShifts`](../frontend/src/api/workShift.api.js#L13) — Gọi API: admin xem chấm công
- [`deleteShift`](../frontend/src/api/workShift.api.js#L15) — Gọi API: admin gỡ nhân viên khỏi ca
- [`closeShift`](../frontend/src/api/workShift.api.js#L17) — Gọi API: admin chốt ca quên ra
- [`listSlots`](../frontend/src/api/workShift.api.js#L20) — Gọi API: admin xem ca trống
- [`createSlots`](../frontend/src/api/workShift.api.js#L22) — Gọi API: admin mở ca trống
- [`updateSlot`](../frontend/src/api/workShift.api.js#L24) — Gọi API: admin sửa ca trống
- [`deleteSlot`](../frontend/src/api/workShift.api.js#L26) — Gọi API: admin xóa ca trống
- [`listOpenSlots`](../frontend/src/api/workShift.api.js#L28) — Gọi API: nhân viên xem ca trống
- [`claimSlot`](../frontend/src/api/workShift.api.js#L30) — Gọi API: nhân viên nhận ca
- [`releaseShift`](../frontend/src/api/workShift.api.js#L32) — Gọi API: nhân viên hủy nhận ca

