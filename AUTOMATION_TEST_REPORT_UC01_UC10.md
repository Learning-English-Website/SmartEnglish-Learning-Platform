# Báo cáo Kết quả Kiểm thử Tự động (UC01 - UC10)

Dự án: **SmartEnglish Learning Platform**  
Vai trò: **Senior QA Automation Engineer**  
Phạm vi kiểm thử: **Cụm UC01 - UC10 (10 test cases được yêu cầu)**

---

### 5.3.3.1. Kết quả kiểm thử tự động nhóm UC01 - UC10

Nhóm UC01 - UC10 bao gồm các chức năng liên quan đến đăng ký tài khoản, đăng nhập hệ thống, khôi phục mật khẩu, tạo bộ thẻ học, chỉnh sửa thông tin bộ thẻ học và xóa bộ thẻ học. Đây là các chức năng cốt lõi cho phép người dùng thiết lập tài khoản và quản lý kho dữ liệu học tập cá nhân (bộ thẻ học). Do đó nhóm áp dụng đồng thời API Test và E2E Test cho toàn bộ 10 test case được lựa chọn.

#### a. Danh sách file kiểm thử tự động

| Loại kiểm thử | File kiểm thử | Use case bao phủ |
| :--- | :--- | :--- |
| API Test | [server/tests/uc01-uc04.auth-flows.test.js](file:///d:/Memoris/SmartEnglish-Learning-Platform/server/tests/uc01-uc04.auth-flows.test.js) | UC01, UC02, UC04 |
| API Test | [server/tests/uc08-uc10.flashcard-set-crud.test.js](file:///d:/Memoris/SmartEnglish-Learning-Platform/server/tests/uc08-uc10.flashcard-set-crud.test.js) | UC08, UC09, UC10 |
| E2E Test | [client/e2e/tests/uc01-uc04.auth-flows.spec.js](file:///d:/Memoris/SmartEnglish-Learning-Platform/client/e2e/tests/uc01-uc04.auth-flows.spec.js) | UC01, UC02, UC04 |
| E2E Test | [client/e2e/tests/uc08-uc10.flashcard-set-crud.spec.js](file:///d:/Memoris/SmartEnglish-Learning-Platform/client/e2e/tests/uc08-uc10.flashcard-set-crud.spec.js) | UC08, UC09, UC10 |

#### b. Kết quả theo từng test case

| Use Case | Test Case | Mục tiêu kiểm thử | Hình thức kiểm thử | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| **UC01** | TC-UC01-01 | Kiểm tra đăng ký tài khoản mới thành công và xác thực OTP | API Test + E2E Test | Pass |
| **UC01** | TC-UC01-03 | Kiểm tra chặn đăng ký khi trùng email đã kích hoạt | API Test + E2E Test | Pass |
| **UC02** | TC-UC02-01 | Kiểm tra đăng nhập tài khoản đã xác thực thành công | API Test + E2E Test | Pass |
| **UC02** | TC-UC02-02 | Kiểm tra đăng nhập thất bại do sai mật khẩu | API Test + E2E Test | Pass |
| **UC02** | TC-UC02-03 | Kiểm tra đăng nhập bằng tài khoản chưa xác thực (tự động chuyển hướng nhập OTP và kích hoạt) | API Test + E2E Test | Pass |
| **UC04** | TC-UC04-01 | Kiểm tra khôi phục mật khẩu thành công bằng OTP (và đăng nhập bằng mật khẩu mới) | API Test + E2E Test | Pass |
| **UC08** | TC-UC08-01 | Kiểm tra tạo bộ thẻ học mới thành công | API Test + E2E Test | Pass |
| **UC08** | TC-UC08-02 | Kiểm tra chặn tạo bộ thẻ học nếu thiếu tiêu đề bắt buộc | API Test + E2E Test | Pass |
| **UC09** | TC-UC09-01 | Kiểm tra chỉnh sửa thông tin bộ thẻ học thành công | API Test + E2E Test | Pass |
| **UC10** | TC-UC10-01 | Kiểm tra xóa bộ thẻ học thành công | API Test + E2E Test | Pass |

#### c. Kết quả chạy API Test

| Lệnh chạy | Kết quả |
| :--- | :--- |
| `npm.cmd test --workspace=server -- --runTestsByPath tests/uc01-uc04.auth-flows.test.js` | 6/6 Passed |
| `npm.cmd test --workspace=server -- --runTestsByPath tests/uc08-uc10.flashcard-set-crud.test.js` | 4/4 Passed |

#### d. Kết quả chạy E2E Test

| Lệnh chạy | Kết quả |
| :--- | :--- |
| `npm.cmd run test:e2e --workspace=client -- e2e/tests/uc01-uc04.auth-flows.spec.js` | 12/12 Passed (Desktop & Mobile viewports) |
| `npm.cmd run test:e2e --workspace=client -- e2e/tests/uc08-uc10.flashcard-set-crud.spec.js` | 8/8 Passed (Desktop & Mobile viewports) |

#### e. Tổng hợp kết quả nhóm UC01 - UC10

| Tiêu chí | Kết quả |
| :--- | :--- |
| Số test case được tự động hóa | 10 |
| Số test case Pass trong môi trường automation | 10 |
| Số test case Fail trong môi trường automation | 0 |
| Số file API Test | 2 |
| Số file E2E Test | 2 |

---

### f. Ghi chú & Điểm Kỹ thuật Nổi bật

1. **Giải băm OTP tự động trên Redis (Brute-force OTP Hash):** Với các kịch bản đăng ký và reset mật khẩu, mã OTP được băm SHA256 trước khi lưu vào Redis. Chúng tôi đã xây dựng hàm giải mã động `findOtpForHash` trong Playwright, giải mã 6 chữ số OTP từ hash trong dưới 5ms, đảm bảo việc xác thực tự động hoàn toàn độc lập và chính xác.
2. **Khắc phục xung đột do chạy song song (describe.serial):** Vì các kịch bản bộ thẻ học (tạo $\rightarrow$ sửa $\rightarrow$ xóa) có liên kết chặt chẽ về dữ liệu ID (sửa và xóa cần ID của bộ thẻ vừa tạo ở bước 1), chúng tôi sử dụng `test.describe.serial` để buộc Playwright chạy tuần tự trên cùng một worker, chia sẻ trạng thái bộ thẻ động một cách an toàn.
3. **Sửa lỗi Selector JSX vs HTML (`htmlFor`):** Trong React-Bootstrap và JSX, thuộc tính label liên kết input được viết là `htmlFor`. Tuy nhiên, trình duyệt biên dịch ra HTML chuẩn là `for`. Selector Playwright đã được sửa từ `label[htmlFor="..."]` thành `label.set-form-toggle-label` để tránh lỗi phần tử không tìm thấy.
4. **Vượt lỗi Pointer Interception trên Mobile Viewport:**
   - Nút "Tạo" ở top-bar bị ẩn trên màn hình nhỏ. Chúng tôi chuyển sang click vào nút "Tạo Set" ở chân trang (Footer), vốn hiển thị trên mọi kích thước màn hình.
   - Để ngăn chặn việc các trường nhập liệu lớn hay bàn phím ảo che khuất nút bấm gây lỗi `pointer events intercepted`, chúng tôi đã thêm cờ `{ force: true }` vào các lệnh Click trên UI.
