# QUICK Store - Ứng dụng di động (Expo / React Native)

Một app dùng chung cho **khách hàng, nhân viên và quản trị viên**, chuyển từ các trang của web (`frontend/`). Đăng nhập bằng tài khoản nào thì app hiện giao diện của vai trò đó.
Mô hình: khách đặt hàng trong app rồi **đến cửa hàng nhận hàng** (không giao tận nơi).
App dùng lại toàn bộ API của `backend/`.

## Chức năng

| Nhóm | Màn hình |
|---|---|
| Tài khoản | Đăng nhập, đăng ký, quên mật khẩu, đặt lại mật khẩu (dán liên kết trong email) |
| Mua sắm | Trang chủ (thông tin cửa hàng, khuyến mãi, danh mục, sản phẩm nổi bật), danh sách sản phẩm (tìm kiếm, lọc danh mục, còn hàng, sắp xếp), chi tiết sản phẩm (giá khuyến mãi, tồn kho, đánh giá, sản phẩm cùng danh mục), khuyến mãi |
| Đặt hàng | Giỏ hàng, xác nhận đơn (mã giảm giá, ghi chú, ví QUICK trừ trước rồi trả phần còn lại qua VNPay, chống đặt trùng), thanh toán lại, kết quả thanh toán |
| Ví & hủy đơn | Ví QUICK (số dư, lịch sử, rút tiền về ngân hàng), hủy đơn kèm chọn lý do, tiền hoàn vào ví, voucher xin lỗi khi cửa hàng hủy, thông báo trong app |
| Đơn hàng | Danh sách theo trạng thái, chi tiết, theo dõi tiến trình (tự cập nhật), lịch sử, báo vấn đề với đơn |
| Tài khoản | Hồ sơ (họ tên, SĐT, ngày sinh, ảnh đại diện: xem / chụp / chọn / xóa), đổi mật khẩu, địa chỉ, thành viên và lịch sử điểm |
| Phản hồi | Đánh giá sản phẩm và cửa hàng (thêm / sửa / xóa), hỗ trợ và khiếu nại (gửi, xem phản hồi) |
| Tiện ích (tham khảo app 7-Eleven, GS25, Circle K) | Mã QR nhận hàng trên đơn, thẻ thành viên QR cho nhân viên quét tại quầy, banner đơn đang xử lý / sẵn sàng nhận ở trang chủ, thêm nhanh vào giỏ (+), mua lại đơn cũ, yêu thích, đã xem gần đây, lịch sử tìm kiếm, giờ mở cửa cả tuần, gọi cửa hàng, chỉ đường, rung phản hồi khi thêm giỏ |
| Ưu đãi | Kho voucher (mã giảm giá khách còn dùng được, kể cả voucher tặng riêng), chọn voucher ngay ở bước đặt hàng (báo cần mua thêm bao nhiêu) |
| **Nhân viên** | Tổng quan (ca hiện tại, doanh thu hôm nay, đơn cần xử lý), xử lý đơn nhận tại cửa hàng (chuẩn bị → sẵn sàng → giao khách), hủy đơn 2 bước (do khách / do cửa hàng + voucher), bán tại quầy (tiền mặt / thẻ / VNPay QR, tích điểm thành viên, khuyến mãi), ca làm (vào / ra ca, nhận ca trống, hủy nhận ca, lương), tra cứu / đăng ký thành viên tại quầy, tồn kho, khiếu nại |
| **Quản trị viên** | Tổng quan (doanh thu, đơn, tồn kho, yêu cầu rút tiền chờ), đơn hàng (người xử lý từng bước, chuyển trạng thái, hủy 2 bước), tài chính (hoàn tiền đơn hủy, duyệt rút tiền: đã chuyển / từ chối), ca làm theo tuần (mở ca trống, gỡ nhân viên, giờ công & lương), nhân viên (chi tiết, đơn đã xử lý, khóa / mở khóa), sản phẩm (đổi giá, ngừng / mở bán), khách hàng |
| Thông báo | Khi app đang mở, tự kiểm tra mỗi 30 giây và hiện thông báo khi đơn được xác nhận / sẵn sàng nhận / hoàn tất / bị hủy, đồng thời làm mới các màn hình đơn hàng |

Chưa làm: đăng nhập Google trên app (cần tạo client ID riêng cho Android / iOS), thông báo đẩy khi app đã tắt (cần push server, hiện chỉ báo khi app đang mở). Các form cấu hình phức tạp (tạo khuyến mãi, mã giảm giá, danh mục, cửa hàng, hạng thành viên) vẫn làm trên web.

Yêu thích, đã xem gần đây và lịch sử tìm kiếm lưu trên máy (AsyncStorage), không đồng bộ giữa các thiết bị.

## Chạy demo trên Expo Go

Điện thoại và máy tính phải **cùng mạng Wi-Fi**. Cài ứng dụng **Expo Go** trên điện thoại.

### 1. Chạy backend

Chạy bình thường, **không cần sửa `.env`**:

Dữ liệu mẫu: import các file trong `backend/data/` vào database `convenience_store` bằng Compass (xem README gốc).

```
cd backend
npm install
npm run init-db       # tạo collection và index (chạy một lần)
npm run dev
```

Backend lắng nghe trên mọi địa chỉ mạng nên điện thoại truy cập được qua IP máy tính.

**Thanh toán VNPay trên app** (điện thoại, máy ảo BlueStacks / Android Emulator): không cần cấu hình thêm.
Link thanh toán và link quay về tự dùng đúng địa chỉ backend mà app đang gọi (không dùng `localhost`).
Thanh toán xong, trình duyệt hiện "Thanh toán thành công – đóng trang này để quay lại app"; đóng lại, app tự cập nhật trạng thái đơn.

- **Không muốn dùng VNPay sandbox** (máy ảo hay lỗi): đặt `PAYMENT_MOCK=true` trong `backend/.env`.
  App sẽ mở trang thanh toán giả lập, người dùng bấm **Payment successful** để xác nhận đã trả tiền.
- **Dùng VNPay sandbox**: thẻ test NCB `9704198526191432198`, chủ thẻ `NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456`.

### 2. Chạy app

```
cd mobile
npm install
npx expo start
```

Quét mã QR bằng Expo Go (Android) hoặc app Camera (iOS).

App tự lấy IP của máy đang chạy Expo và gọi `http://<IP>:5000/api`. Nếu backend ở nơi khác, tạo file `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
```

(Xem `.env.example`.) Sau khi sửa `.env` hãy chạy lại `npx expo start -c`.

### Tài khoản demo

| Email | Mật khẩu |
|---|---|
| customer@store.local | Password@123 |
| staff@store.local | Password@123 |
| admin@store.local | Password@123 |

### Thử thanh toán online

Ở bước đặt hàng, số dư ví được trừ trước, phần còn lại thanh toán qua VNPay: app mở trang cổng thanh toán (giả lập khi `PAYMENT_MOCK=true`) trong trình duyệt. Bấm **Thanh toán thành công**, đóng trình duyệt, app tự hiển thị kết quả.

## Cấu trúc

```
mobile/
  App.js                 điểm vào
  src/
    api/                 axios + các hàm gọi API (client.js, index.js)
    context/             AuthContext (đăng nhập, số lượng giỏ hàng)
    navigation/          tab dưới đáy + stack màn hình
    screens/             auth, catalog, shop, orders, account, feedback, extra (thẻ thành viên, cửa hàng, yêu thích)
    components/          bộ UI dùng chung (ui.js), hook tải dữ liệu, NeedLogin
    utils/               định dạng tiền/ngày, trạng thái đơn, timeline, giá khuyến mãi
    theme.js             màu lấy từ token --qk-* của web
```
