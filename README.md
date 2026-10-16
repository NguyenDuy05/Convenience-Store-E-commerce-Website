# Convenience Store E-commerce Website

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

## Đã làm sẵn / còn lại

- **Đã chạy được:** đăng nhập, đăng ký, đăng xuất, xem sản phẩm (có tìm kiếm, lọc danh mục), xem danh mục, xem cửa hàng, phân quyền theo role.
- **Còn lại:** mọi API khác đã có sẵn route và phân quyền, nhưng controller đang trả `501 Chưa triển khai: UC-...`. Mở file controller của module mình phụ trách, thay từng dòng `notImplemented(...)` bằng code thật. Trang frontend chưa làm đang hiện khung `PagePlaceholder` liệt kê use case cần làm.

## Quy ước làm việc

- Mỗi người làm trong controller, route, trang và file api của **module mình**, hạn chế sửa file của người khác.
- Sửa model (thêm field) phải báo cả nhóm, tạo nhánh riêng và Pull Request.
- API trả lỗi dạng `{ "message": "..." }`. Ném lỗi bằng `throw new ApiError(404, '...')` trong controller bọc `asyncHandler`.
- Đã có sẵn `routes/*.routes.js` ghi rõ từng API ứng với use case nào và role nào được gọi, dùng làm hợp đồng API giữa frontend và backend.
- Hai API không có trong catalog UC nhưng cần cho tính năng: `GET /api/cart/suggestions` (giỏ gợi ý) và `POST /api/discount-codes/validate` (kiểm tra mã khi checkout).

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
