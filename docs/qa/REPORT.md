# QUICK Store — Báo cáo kiểm thử chức năng

Thời điểm: lúc 04:41 Thứ Hai, 9 tháng 11, 2026. Phạm vi: working tree local, dữ liệu kiểm thử tách riêng.

**Kết luận:** Các luồng local đã kiểm thử đều PASS sau sửa. Có thể dùng cho demo các luồng đã nêu; chưa kết luận production vì các kết nối ngoài chưa được nghiệm thu.

| Hạng mục | Kết quả |
|---|---|
| Backend (Node runner, gồm nhóm test bao ngoài) | 121/121 PASS, 0 FAIL |
| Browser Microsoft Edge | 78/78 PASS |
| Phân loại browser | 10 workflow/runtime, 50 route smoke, 18 responsive |
| Tình huống lỗi đã tái hiện và sửa | 15/15 RETEST PASS |
| Frontend production build | PASS; còn cảnh báo bundle trên 500 kB |

## Cơ sở đối chiếu

- Yêu cầu đã xác nhận trong cuộc trò chuyện: pickup tại cửa hàng, POS, VNPay/ví, hoàn tiền, điểm, thông báo và preorder ngoài giờ.
- Tài liệu đầu vào: QUICK_Package_Descriptions.xlsx, sheet “Package Descriptions”, A4:C18. Đây là mô tả 15 package kiến trúc, không chứa một bộ tiêu chí nghiệm thu chi tiết. File nguồn không bị sửa.
- Tham khảo vận hành pickup: https://help.shopify.com/en/manual/fulfillment/setup/delivery-methods/pickup-in-store
- Đối chiếu callback/thanh toán: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

## Business rule và kiểm thử

| ID | Rule | Bằng chứng |
|---|---|---|
| BR-01 | Phân quyền Guest/Customer/Staff/Admin, dữ liệu đơn/ví của chính khách, tài khoản bị khóa mất quyền ngay. | Auth, membership, notification, wallet và QA-02/19. |
| BR-02 | Đơn website dùng ví trước; phần thiếu chỉ VNPay. Ví đủ thì không mở cổng. | wallet-checkout và UI-02/04/05. |
| BR-03 | POS tại quầy chọn hàng → bill → thu tiền → confirm → completed và lưu lịch sử. | pos-and-pickup và UI-07. |
| BR-04 | Giá và khuyến mãi tính lại trên server; chặn giá cũ, mã hết hạn và vượt lượt. | Pricing/promotion, QA-03/04/05/16. |
| BR-05 | Không bán quá kho; loại batch hết hạn; FEFO; rollback khi ghi dữ liệu lỗi. | QA-07/08/09/14/15/22/23/24. |
| BR-06 | Đơn online đã trả: confirmed → preparing → ready_for_pickup → completed. | Staff HTTP tests, UI-03. |
| BR-07 | Done chỉ đánh dấu sẵn sàng và thông báo khách; Confirm pickup mới hoàn tất. | UI-03 và thông báo riêng theo customer. |
| BR-08 | Khách tự hủy trước khi staff chuẩn bị; admin hủy đơn chưa hoàn tất ở bước sau. | Wallet integration và QA-03/10. |
| BR-09 | Tiền đã nhận của đơn hủy/hết hạn trả vào ví đúng một lần, kể cả kết quả VNPay muộn. | Wallet integration, QA-10, UI-04. |
| BR-10 | Đơn paid và completed mới cộng 1 điểm/10.000đ. Hủy trước hoàn tất không nhận điểm. | Points recovery tests, UI-03. |
| BR-11 | Thông báo chung, theo role và riêng khách; draft/scheduled/archived không lộ sai đối tượng. | Notification HTTP suite và UI pickup notification. |
| BR-12 | Ảnh sản phẩm chọn từ thư mục/file, tối đa 8 ảnh; ảnh upload tối đa 2 MB; không nhập URL mới. | Product image integration, UI-08. |
| BR-13 | Admin đóng cửa thủ công thì không nhận đơn mới. | QA-16 và pickup-schedule test. |
| BR-14 | Theo yêu cầu đã xác nhận: ngoài 07:00–24:00 vẫn nhận preorder, nêu giờ mở lại; chặn bắt đầu chuẩn bị trước giờ mở. | QA-17, 7 ca biên lịch và UI-06. |

## Lỗi trước sửa và kết quả sau sửa

| ID / test | Mức | Lỗi và thực tế trước sửa | Sau sửa |
|---|---|---|---|
| BUG-01 / QA-02 | P1 | Token staff bị khóa vẫn xem được sản phẩm ẩn. HTTP 200 và dữ liệu sản phẩm nội bộ. | Không trả dữ liệu nội bộ; 401 hoặc public 404. RETEST PASS. |
| BUG-02 / QA-03 | P2 | Hủy đơn vẫn mất lượt voucher theo khách. Báo đã hết lượt dù đơn đã hủy. | Voucher dùng lại được khi lượt đã được trả. RETEST PASS. |
| BUG-03 / QA-04 | P2 | Đơn hết hạn không trả lượt voucher toàn hệ thống. usedCount còn 1. | usedCount trở về 0 và không âm. RETEST PASS. |
| BUG-04 / QA-05 | P1 | Đặt đồng thời vượt giới hạn voucher theo khách. 4 đơn dùng voucher. | Chỉ 1 reservation/đơn được chấp nhận. RETEST PASS. |
| BUG-05 / QA-07 | P1 | Ghi lịch sử bán lỗi làm mất kho. Batch còn 48 dù thao tác lỗi. | Batch và Product đều giữ 50. RETEST PASS. |
| BUG-06 / QA-08 | P1 | Hoàn kho đồng thời cộng trùng. Kho thành 54. | Kho trở về đúng 50. RETEST PASS. |
| BUG-07 / QA-09 | P1 | Retry hoàn kho sau lỗi journal làm tăng kho. Kho thành 52 thay vì 50. | Retry chỉ hoàn đúng số lượng đã bán. RETEST PASS. |
| BUG-08 / QA-10 | P1 | Admin xác nhận tiền của đơn hủy nhưng ví chưa được hoàn. Ví 0 dù xác nhận nhận 24.000đ. | Ví được cộng 24.000đ đúng một lần. RETEST PASS. |
| BUG-09 / QA-11 | P2 | Thêm đồng thời làm mất số lượng. Giỏ chỉ còn số lượng 1. | Giỏ có số lượng 4. RETEST PASS. |
| BUG-10 / QA-12 | P1 | Token reset mật khẩu dùng được hai lần đồng thời. Cả hai yêu cầu thành công. | Chỉ 1 yêu cầu thành công. RETEST PASS. |
| BUG-11 / QA-20 | P1 | Có thể tạo nhiều link thanh toán còn hiệu lực cho cùng đơn. 6 giao dịch pending cho cùng đơn. | Tối đa 1 giao dịch online pending; request sau dùng lại link hoặc nhận 409. RETEST PASS. |
| BUG-12 / QA-21 | P2 | Tên khách được chèn nguyên HTML vào thư reset. HTML chứa trực tiếp thẻ do khách nhập. | Tên được escape thành văn bản. RETEST PASS. |
| BUG-13 / QA-22 | P1 | Lỗi journal nhập kho vẫn để lại số lượng và batch mới. Kho 55 và batch nhập còn tồn tại. | Kho giữ 50, không còn batch của thao tác thất bại. RETEST PASS. |
| BUG-14 / QA-23 | P1 | Lỗi journal hàng hỏng vẫn trừ kho. Kho còn 45. | Kho giữ 50 sau thao tác thất bại. RETEST PASS. |
| BUG-15 / QA-24 | P1 | Điều chỉnh đồng thời vượt số lượng đích. Kho và tổng batch lên 80. | Kho và tổng batch bằng 60; request xung đột phải đọc lại. RETEST PASS. |

P1: ảnh hưởng tiền, kho, tài khoản hoặc quyền truy cập. P2: ảnh hưởng tính đúng, quota hoặc nội dung giao tiếp. Các lần lỗi ghi DB trong test là fault injection có chủ đích.

Các sửa bổ sung: giữ lại số lượng mới thêm từ tab khác trong lúc checkout; thông báo preorder và nút chuẩn bị theo giờ Việt Nam; bỏ lời hứa pickup cố định 15 phút trên màn hình xác thực.

## Những phần chưa được chứng nhận

- VNPay sandbox: tạo được URL ký từ cấu hình hiện có. Trình duyệt bị net::ERR_NETWORK_ACCESS_DENIED khi mở cổng, nên chưa hoàn tất giao dịch trên cổng thật và chưa kiểm chứng IPN public. Các ca thanh toán PASS ở trên dùng simulator nội bộ hoặc callback VNPay tổng hợp có chữ ký kiểm thử.
- Google: đã kiểm tra frontend/backend có cùng client ID; chưa đăng nhập bằng tài khoản Google thật hoặc kiểm tra consent screen của nhà cung cấp.
- Email: kiểm thử nội dung, trigger và reset token qua outbox local. Không gửi email thật; chưa xác nhận Gmail đã giao thư tới hộp nhận.
- Kiểm thử MongoDB chạy bằng database riêng, có cả ghi thật và fault injection. Chưa chạy test replica-set/đa máy, load test dài hạn, mất điện/process crash hoặc diễn tập khôi phục backup.
- Endpoint gợi ý giỏ hàng theo ngân sách /api/cart/suggestions vẫn là 501 đã khai báo trong code, không được nối vào luồng mua hàng hiện tại. Không tính tính năng này là đã nghiệm thu.
- Các trang trong ma trận ROUTE chỉ xác nhận mở được, không lỗi runtime/API 5xx và không tràn ngang. CRUD/biên của mọi trường trên mọi trang không mặc nhiên được chứng nhận từ việc mở trang.
- Cần UAT bên ngoài môi trường local: VNPay sandbox với IPN public, Google OAuth thật, nhận email thật và kiểm thử vận hành nhiều nhân viên trước khi kết luận dùng production.

## Bằng chứng và chạy lại

- `REPORT.html`: bản trình bày, có ảnh chụp luồng thật trong môi trường kiểm thử.
- `test-matrix.csv`, `backend-results.xml`, `browser-results.json`: danh sách ca và kết quả.
- `baseline-business.log`, `baseline-payment-race.log`, `baseline-inventory-auth.log`: lỗi tái hiện trước sửa.
- `backend-run.log`, `browser-run.log`, `frontend-build.log`, `retest-business.log`: kết quả cuối.
- `source-manifest.json`: hash mã nguồn đã kiểm thử. Không chứa file .env hoặc thông tin đăng nhập.

```powershell
cd backend
npm run test:qa
cd ../frontend
# Cài Playwright trong môi trường test, hoặc trỏ PLAYWRIGHT_MODULE tới bản đã có.
# Ví dụ cài khi có mạng: npm install --no-save --package-lock=false playwright@1.65.0
$env:QA_BROWSER='msedge'
npm run test:qa
npm run build
```

Các runner tạo database UUID riêng rồi drop đúng database kiểm thử. Browser fixture mở cửa 24h để chạy không phụ thuộc đồng hồ; chính sách 07:00–24:00, preorder và thời điểm bắt đầu chuẩn bị được kiểm tra riêng bằng các ca biên và UI-06. Cấu hình cửa hàng thật không bị thay đổi bởi test.
