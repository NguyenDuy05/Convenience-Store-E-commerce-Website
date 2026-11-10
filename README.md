# Convenience Store E-commerce Website

## QUICK mobile app

The customer app is in [`mobile/`](mobile/README.md), using React Native + Expo and the same Express backend/database as the website. See the [feature matrix](docs/mobile/FEATURE_MATRIX.md) and [mobile implementation / QA report](docs/mobile/REPORT.md) for tested flows, native build setup and remaining device acceptance checks.


Web cửa hàng tiện lợi (1 cửa hàng): khách đặt hàng online, ra cửa hàng nhận, không giao hàng.
Điểm khác biệt: **giỏ hàng gợi ý theo ngân sách** (4 giỏ cho cùng một ngân sách).

- **Frontend:** React (Vite) + React Router + Axios, thư mục `frontend/`
- **Backend:** Node.js + Express theo mô hình MVC, thư mục `backend/`
- **Database:** MongoDB + Mongoose

## Cấu trúc

```
convenience-store/
├── backend/
│   ├── data/                  File JSON dữ liệu mẫu để import vào Compass
│   └── src/
│       ├── server.js          Kết nối DB và chạy server
│       ├── app.js             Cấu hình Express
│       ├── config/            Kết nối MongoDB
│       ├── models/            M: 19 Mongoose model (mỗi collection một file)
│       ├── controllers/       C: xử lý nghiệp vụ, mỗi module một file
│       ├── routes/            Khai báo URL, role được phép, nối tới controller
│       ├── middlewares/       authenticate, authorize, xử lý lỗi
│       ├── services/          Logic dùng chung: mã đơn, kho, gợi ý giỏ hàng, VNPay, Momo
│       ├── utils/             ApiError, asyncHandler, notImplemented
│       └── scripts/           seed.js, init-db.js
└── frontend/
    └── src/
        ├── api/               Hàm gọi API, mỗi module một file (khớp với routes backend)
        ├── context/           AuthContext (đăng nhập, token)
        ├── routes/            AppRouter, ProtectedRoute, navConfig
        ├── layouts/           Public / Customer / Staff / Admin
        ├── pages/             guest, customer, staff, admin (V: giao diện)
        ├── components/        Thành phần dùng lại
        └── utils/
```

**MVC trong dự án này:** Model = `backend/src/models`, Controller = `backend/src/controllers` (qua `routes`), View = React ở `frontend/`. Hai phía nói chuyện với nhau bằng REST API, tiền tố `/api`.

## Chạy dự án

**1. Database** (MongoDB chạy trên máy, Compass kết nối `localhost:27017`)
- Tạo database `convenience_store`, import các file trong `backend/data/` vào collection cùng tên (`users`, `products`...).

**2. Backend**
```bash
cd backend
npm install
cp .env.example .env      # rồi điền JWT_SECRET
npm run init-db           # tạo đủ collection và index (chạy một lần)
npm run dev               # http://localhost:5000
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Tài khoản demo (mật khẩu `Password@123`): `admin@store.local`, `staff@store.local`, `customer@store.local`.

## Đăng ký / đăng nhập bằng Google

- Trong Google Auth Platform, tạo OAuth Client loại **Web application**, thêm `http://localhost:5173` vào **Authorized JavaScript origins** (đúng origin đang mở web).
- Điền Client ID vào `GOOGLE_CLIENT_ID` trong `backend/.env` và `VITE_GOOGLE_CLIENT_ID` trong `frontend/.env`, rồi khởi động lại cả backend và frontend.
- Chạy `npm install` trong `backend` để cài `google-auth-library`. Luồng này dùng Google Identity Services gửi ID token về `POST /api/auth/google`; không cần Client Secret hay redirect URI để xử lý đăng nhập.
- Mở `/register`, chọn **Sign up with Google**. Khách mới được tạo tài khoản customer và tự đăng nhập; khách đã có tài khoản có thể dùng nút Google ở `/login`. Tài khoản admin/staff vẫn đăng nhập bằng mật khẩu.
- Nếu Google báo `origin_mismatch`, kiểm tra origin trong Google Console và truy cập đúng `http://localhost:5173`. Nếu ứng dụng Google đang giới hạn người dùng thử, thêm email dùng test vào danh sách người dùng được phép.

Các file `.env` được Git bỏ qua. Không đưa file JSON chứa Client Secret vào frontend hoặc repository.

## Gửi email thông báo

Cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` trong `backend/.env`. Với Gmail, dùng `smtp.gmail.com`, cổng `465` và mật khẩu ứng dụng của đúng địa chỉ gửi. Đặt `FRONTEND_URL` theo địa chỉ web để link trong email trỏ đúng nơi.

- Chạy `npm run mail:verify` trong `backend` để kiểm tra kết nối và đăng nhập SMTP; lệnh này không gửi email.
- Email được gửi khi khách yêu cầu đặt lại mật khẩu, đặt đơn mới, nhận kết quả thanh toán thành công/thất bại, đơn hết hạn, hoặc admin đổi trạng thái/hủy đơn. Email thanh toán về muộn yêu cầu khách liên hệ cửa hàng để kiểm tra.
- Thông báo đơn gửi tới email của khách trong database sau khi dữ liệu đã lưu. Request đặt đơn gửi lại cùng khóa và callback thanh toán bị lặp không gửi lại thông báo.
- Gửi mail đơn chạy nền; lỗi SMTP được ghi mã lỗi và không hủy nghiệp vụ. Hiện chưa có hàng đợi lưu bền hay tự gửi lại nếu tiến trình dừng hoặc SMTP lỗi.
- Chưa cấu hình SMTP thì link quên mật khẩu vẫn in ở terminal để test local; thông báo đơn được bỏ qua. Các tài khoản demo `@store.local` không nhận được email thật, hãy dùng email thật khi test.

## Đã làm sẵn / còn lại

### Interface and in-app notifications

- The interface uses English. Product names/descriptions, addresses and product units remain as entered; prices use Vietnamese VND formatting. Customer pages share one store header/footer; admin and staff pages share one portal frame with a complete mobile menu.
- Customer inbox: `/notifications`. Staff inbox: `/staff/notifications`. Admin inbox: `/admin/inbox`; notification management: `/admin/notifications`.
- Admins can create and edit drafts, choose an audience (all accounts, customers, staff or admins), add a website link, schedule publication, set an expiry and archive announcements. General notices, events, vouchers and promotions are supported. Drafts, future notices and expired/archived notices are hidden from recipients.
- Read state is stored separately for each account. Order notifications are private to their customer; a new online order also notifies staff/admins. Pickup notifications link to the order timeline. Payment retries and repeated callbacks do not duplicate the same in-app event.
- Automatic settings control customer order updates, payment results, new-order alerts for staff/admins, vouchers and promotions. Activating an offer creates one customer announcement per campaign; future campaigns appear at their start time. Suspending/deleting an offer archives its announcement.
- Notifications are stored in MongoDB (`notifications`, `notificationreceipts`, `notificationsettings`) independently of SMTP. The bell and inbox refresh every 20 seconds while the tab is visible and on focus. This is an in-app inbox; it does not require browser push permissions.
- Transactional email continues to use the SMTP configuration described above. Broadcast announcements are delivered in the web inbox. Restart backend and frontend after pulling these changes. Mongoose initializes the new models/indexes; `npm run init-db` is also available for manual database initialization.
- Validation: `npm test`, `npm run test:mail`, `npm run test:notifications` in `backend`, and `npm run build` in `frontend`. The notification integration suite creates and removes its own temporary database and disables external email.

### Local POS and store pickup

The counter workflow follows the product/cart, checkout and receipt sequence described in [Shopify POS](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/process-sales-transaction). Pickup preparation separates **In progress**, **Ready** and **Picked up**, as described in [Square's order fulfillment workflow](https://squareup.com/help/us/en/article/6923-pickup-orders-on-square-point-of-sale).

- Staff **Point of sale** (`/staff/store-order`): choose products from the catalog or enter a SKU/barcode, adjust the bill, select a promotion, proceed to payment and confirm the sale. Cash payments calculate change. Card/QR payments require staff to confirm approval on the store terminal/payment account and record its reference. The application records that approved payment.
- Confirmation checks current server prices and sellable batch stock, then saves the completed order, successful payment and stock movement together. Reusing a checkout key returns the same sale; an approved terminal reference cannot be recorded twice. If the response is lost, the locked bill can be restored after reload and retried using its original key.
- A bill being built does not create an order or reserve stock. A successful sale appears in **Order history** (`/staff/orders/history?source=store`) and has a printable receipt. Existing pending counter bills can still be paid from the **Pending counter bills** menu.
- Staff **Pickup orders** (`/staff/orders`): open a website order, select **Start preparing**, then **Done** when all items are prepared. Done sets `ready_for_pickup` and triggers a private customer web notification plus transactional email. **Confirm pickup** completes the order only when the customer collects it. Cash-at-pickup orders require confirmation of payment; received cash and change are recorded.
- Store details are configured in `backend/src/config/store.js`: phone **09090909090**, address **600 Nguyễn Văn Cừ nối dài, Ninh Kiều, Cần Thơ**, website **Quickstore.com**, daily hours **07:00–24:00**. `npm run configure-store` updates the primary store without resetting orders or products. Midnight closing is stored as `24:00`; the store editor accepts `00:00` for midnight and normalizes it. Opening status is calculated in Vietnam time.
- This project supports direct counter sales and website orders collected in store. Fulfillment and receipts use pickup, with no delivery or courier workflow. Development and verification remain local.
- Run `npm run test:pos` in `backend` for HTTP/MongoDB coverage of payment validation, idempotency, duplicate terminal references, rollback, staff permissions, pickup transitions and notifications. The suite uses an isolated disposable database and disables SMTP.

- **Đã chạy được:** đăng nhập, đăng ký, đăng xuất, xem sản phẩm (có tìm kiếm, lọc danh mục), xem danh mục, xem cửa hàng, phân quyền theo role.
- **Còn lại:** mọi API khác đã có sẵn route và phân quyền, nhưng controller đang trả `501 Chưa triển khai: UC-...`. Mở file controller của module mình phụ trách, thay từng dòng `notImplemented(...)` bằng code thật. Trang frontend chưa làm đang hiện khung `PagePlaceholder` liệt kê use case cần làm.

## Quy ước làm việc

- Mỗi người làm trong controller, route, trang và file api của **module mình**, hạn chế sửa file của người khác.
- Sửa model (thêm field) phải báo cả nhóm, tạo nhánh riêng và Pull Request.
- API trả lỗi dạng `{ "message": "..." }`. Ném lỗi bằng `throw new ApiError(404, '...')` trong controller bọc `asyncHandler`.
- Đã có sẵn `routes/*.routes.js` ghi rõ từng API ứng với use case nào và role nào được gọi, dùng làm hợp đồng API giữa frontend và backend.
- Hai API không có trong catalog UC nhưng cần cho tính năng: `GET /api/cart/suggestions` (giỏ gợi ý) và `POST /api/discount-codes/validate` (kiểm tra mã khi checkout).

## Wallet, website payments and product photos

- Website checkout uses wallet credit first, then VNPay for the remainder. Wallet-covered orders are confirmed immediately. Counter POS supports cash, card terminal and VNPay. MoMo is removed.
- Customers can cancel while awaiting payment or confirmed, before staff starts preparing. Admins handle cancellations after preparation begins, until pickup is completed. Payments received are refunded as store credit. Expired orders release wallet credit; verified late gateway payments are credited once.
- `/wallet` shows balance, payment/refund history and points. Paid, completed pickups earn 1 point per 10,000 VND of the order total. Cancelled orders earn no points. Failed closed-order settlement and reward journals are retried by the background job. There is no wallet withdrawal or top-up feature.
- The wallet follows the store-credit pattern in [Shopify's store credit documentation](https://help.shopify.com/en/manual/customers/store-credit); the cancellation cutoff and VNPay remainder follow this store's requested policy.
- All 78 photos from `ima.zip` are in `frontend/public/images/products`. In Admin/Products, use **Browse image folder** to search filenames and select thumbnails, or **Choose files** to upload photos. Select up to 8 photos; the first is the main image. New remote image URLs are rejected. Unchanged existing photos can be retained.
- Uploaded PNG/JPG/WEBP/GIF files are checked and saved in the same folder. Images are served at `/api/products/images/file/:name`; preserve the `/api` proxy when serving the frontend separately. Back up the image folder with the database and keep it writable for uploads.
- Run `npm run test:wallet` in `backend` for isolated MongoDB/HTTP tests. Tests sign synthetic VNPay callbacks locally and send no external payment or email.

## Module và file

| Module | Controller / Routes (backend/src) | API client (frontend/src/api) | Số API |
|---|---|---|---|
| auth | `controllers/auth.controller.js`, `routes/auth.routes.js` | `auth.api.js` | 6 |
| profile | `controllers/profile.controller.js`, `routes/profile.routes.js` | `profile.api.js` | 3 |
| address | `controllers/address.controller.js`, `routes/address.routes.js` | `address.api.js` | 4 |
| product | `controllers/product.controller.js`, `routes/product.routes.js` | `product.api.js` | 8 |
| category | `controllers/category.controller.js`, `routes/category.routes.js` | `category.api.js` | 4 |
| inventory | `controllers/inventory.controller.js`, `routes/inventory.routes.js` | `inventory.api.js` | 12 |
| cart | `controllers/cart.controller.js`, `routes/cart.routes.js` | `cart.api.js` | 5 |
| order | `controllers/order.controller.js`, `routes/order.routes.js` | `order.api.js` | 8 |
| payment | `controllers/payment.controller.js`, `routes/payment.routes.js` | `payment.api.js` | 10 |
| transaction | `controllers/transaction.controller.js`, `routes/transaction.routes.js` | `transaction.api.js` | 2 |
| promotion | `controllers/promotion.controller.js`, `routes/promotion.routes.js` | `promotion.api.js` | 8 |
| discountCode | `controllers/discountCode.controller.js`, `routes/discountCode.routes.js` | `discountCode.api.js` | 7 |
| membership | `controllers/membership.controller.js`, `routes/membership.routes.js` | `membership.api.js` | 11 |
| review | `controllers/review.controller.js`, `routes/review.routes.js` | `review.api.js` | 8 |
| support | `controllers/support.controller.js`, `routes/support.routes.js` | `support.api.js` | 4 |
| customer | `controllers/customer.controller.js`, `routes/customer.routes.js` | `customer.api.js` | 5 |
| staff | `controllers/staff.controller.js`, `routes/staff.routes.js` | `staff.api.js` | 6 |
| store | `controllers/store.controller.js`, `routes/store.routes.js` | `store.api.js` | 6 |
| workShift | `controllers/workShift.controller.js`, `routes/workShift.routes.js` | `workShift.api.js` | 3 |
