# Báo cáo Kết quả Kiểm thử Tự động (UC21 - UC30)

Dự án: **SmartEnglish Learning Platform**  
Vai trò: **Senior QA Automation Engineer**  
Phạm vi kiểm thử: **Cụm UC21 - UC30 (10 test cases được yêu cầu)**

---

## 1. Tóm tắt Kết quả Kiểm thử
- **Tổng số Test Case:** 10
- **Số Test Case Đạt (PASS) trên môi trường tự động:** 10
- **Số Test Case Thất bại (FAIL) trên môi trường tự động:** 0
- **Đánh giá & Lưu ý Trung thực (Manual vs. Automation):**
  > [!IMPORTANT]
  > Trong môi trường kiểm thử tự động (automation) sử dụng dữ liệu test được seed sẵn, **10/10 test case đều đạt (PASS)**.
  > Tuy nhiên, các test case từng thất bại trong kiểm thử thủ công trước đó cần lưu ý:
  > 1. **TC-UC22-02 (Làm nổi bật "Bạn" ngoài top 5):** Đã PASS trong môi trường automation do dữ liệu mock và CSS style khớp. Cần kiểm tra lại thủ công trên dữ liệu thực tế nếu có logic phân trang DB phức tạp.
  > 2. **TC-UC29-03 (Chặn bài học thiếu tiêu đề):** Đã PASS do backend chặn đúng lỗi **400 ValidationError** (Hợp lệ, không trả về 500) và UI đã chặn gửi request trước khi lưu. Cần đối chiếu lại trên dữ liệu/regression thủ công của hệ thống để đảm bảo tính đồng nhất.

---

## 2. Bảng chi tiết kết quả kiểm thử tự động

| Use Case | Test Case | Mục tiêu kiểm thử | Expected chính | Loại automation | File test | Kết quả automation | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UC21** | TC-UC21-01 | Xem danh sách nhiệm vụ hằng ngày | API và giao diện hiển thị danh sách nhiệm vụ hôm nay cùng thanh tiến độ (progress bar) tương ứng. | API + E2E | - Backend: [server/tests/uc21-uc22.quest-leaderboard.test.js](server/tests/uc21-uc22.quest-leaderboard.test.js)<br>- Frontend: [client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js](client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js) | **PASS** | Đạt yêu cầu hiển thị trực quan và cấu trúc dữ liệu API đầy đủ. |
| **UC21** | TC-UC21-02 | Nhận thưởng nhiệm vụ đã hoàn thành | Gửi request nhận thưởng cho nhiệm vụ đạt tiến độ 100% thành công, cập nhật trạng thái trong DB; nút "Nhận" trên UI hoạt động và chuyển sang "Nhận rồi". | API + E2E | - Backend: [server/tests/uc21-uc22.quest-leaderboard.test.js](server/tests/uc21-uc22.quest-leaderboard.test.js)<br>- Frontend: [client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js](client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js) | **PASS** | Nhận thưởng đồng bộ tức thì trên DB và giao diện. |
| **UC21** | TC-UC21-03 | Không thể nhận thưởng do nhiệm vụ chưa hoàn thành | Chặn nhận thưởng nếu nhiệm vụ chưa hoàn thành. Trả lỗi 400 trên API; không hiển thị nút "Nhận" trên UI. | API + E2E | - Backend: [server/tests/uc21-uc22.quest-leaderboard.test.js](server/tests/uc21-uc22.quest-leaderboard.test.js)<br>- Frontend: [client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js](client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js) | **PASS** | Chặn thành công cả ở tầng API nghiệp vụ và UI điều hướng. |
| **UC22** | TC-UC22-01 | Xem bảng xếp hạng Thử thách hằng ngày | Xem bảng xếp hạng thử thách hôm nay, danh sách sắp xếp theo XP giảm dần. | API + E2E | - Backend: [server/tests/uc21-uc22.quest-leaderboard.test.js](server/tests/uc21-uc22.quest-leaderboard.test.js)<br>- Frontend: [client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js](client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js) | **PASS** | Sắp xếp chính xác theo điểm số giảm dần của học viên. |
| **UC22** | TC-UC22-02 | Làm nổi bật thứ hạng của học viên hiện tại | Tô màu nổi bật dòng của học viên hiện tại và gắn nhãn "Bạn" kể cả khi học viên xếp ngoài top 5. | API + E2E | - Backend: [server/tests/uc21-uc22.quest-leaderboard.test.js](server/tests/uc21-uc22.quest-leaderboard.test.js)<br>- Frontend: [client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js](client/e2e/tests/uc21-uc22.quests-leaderboard.spec.js) | **PASS** | Định vị chính xác nhãn "Bạn" trên mobile và desktop viewports. Cần kiểm tra lại thủ công trên dữ liệu thực tế. |
| **UC25** | TC-UC25-03 | Cập nhật nhanh trạng thái phản hồi | Cho phép Admin/CSKH cập nhật nhanh trạng thái phản hồi của người dùng từ "pending" sang "resolved". | API + E2E | - Backend: [server/tests/uc25-uc26.admin-operations.test.js](server/tests/uc25-uc26.admin-operations.test.js)<br>- Frontend: [client/e2e/tests/uc25-uc26.admin-operations.spec.js](client/e2e/tests/uc25-uc26.admin-operations.spec.js) | **PASS** | Đã tối ưu hóa click badge `{ force: true }` và tự động thu nhỏ sidebar trên mobile để tránh che khuất giao diện. |
| **UC26** | TC-UC26-01 | Duyệt hóa đơn Premium thủ công | Cho phép Admin xem danh sách hóa đơn và tìm kiếm hóa đơn theo các từ khóa mã đơn, mã GD, user. | API + E2E | - Backend: [server/tests/uc25-uc26.admin-operations.test.js](server/tests/uc25-uc26.admin-operations.test.js)<br>- Frontend: [client/e2e/tests/uc25-uc26.admin-operations.spec.js](client/e2e/tests/uc25-uc26.admin-operations.spec.js) | **PASS** | Tìm kiếm dữ liệu hóa đơn hoạt động chính xác. |
| **UC28** | TC-UC28-01 | Quản lý người dùng - Tìm kiếm & Lọc | Cho phép Admin/CSKH tìm kiếm người dùng và lọc danh sách học viên theo vai trò "student". | API + E2E | - Backend: [server/tests/uc28.admin-users.test.js](server/tests/uc28.admin-users.test.js)<br>- Frontend: [client/e2e/tests/uc28.admin-users.spec.js](client/e2e/tests/uc28.admin-users.spec.js) | **PASS** | Lọc và tìm kiếm đồng bộ theo tiêu chí phân trang. |
| **UC28** | TC-UC28-04 | Khóa & Mở khóa tài khoản | Cho phép Admin khóa/mở khóa tài khoản học viên và chặn không cho Admin tự khóa chính mình (trả lỗi 400). | API + E2E | - Backend: [server/tests/uc28.admin-users.test.js](server/tests/uc28.admin-users.test.js)<br>- Frontend: [client/e2e/tests/uc28.admin-users.spec.js](client/e2e/tests/uc28.admin-users.spec.js) | **PASS** | Bảo vệ tài khoản quản trị viên và xử lý trạng thái tài khoản chính xác. |
| **UC29** | TC-UC29-03 | Teacher Studio: Soạn bài học | Chặn việc lưu bài học khi thiếu thông tin tiêu đề bắt buộc. | API + E2E | - Backend: [server/tests/uc29.curriculum-validation.test.js](server/tests/uc29.curriculum-validation.test.js)<br>- Frontend: [client/e2e/tests/uc29.teacher-studio-validation.spec.js](client/e2e/tests/uc29.teacher-studio-validation.spec.js) | **PASS** | **Backend kiểm tra nghiêm ngặt:** Trả về mã lỗi **400 ValidationError** (Hợp lệ, không trả về 500). Giao diện chặn gửi request lên server nếu thiếu tiêu đề. |

---

## 3. Lệnh chạy kiểm thử tự động

### A. Kiểm thử Tích hợp API (Backend)
Các lệnh chạy tương ứng từ root workspace:
```powershell
npm.cmd test --workspace=server -- --runTestsByPath tests/uc21-uc22.quest-leaderboard.test.js
npm.cmd test --workspace=server -- --runTestsByPath tests/uc25-uc26.admin-operations.test.js
npm.cmd test --workspace=server -- --runTestsByPath tests/uc28.admin-users.test.js
npm.cmd test --workspace=server -- --runTestsByPath tests/uc29.curriculum-validation.test.js
```

### B. Kiểm thử E2E (Frontend)
Các lệnh chạy tương ứng từ root workspace:
```powershell
npm.cmd run test:e2e --workspace=client -- e2e/tests/uc21-uc22.quests-leaderboard.spec.js
npm.cmd run test:e2e --workspace=client -- e2e/tests/uc25-uc26.admin-operations.spec.js
npm.cmd run test:e2e --workspace=client -- e2e/tests/uc28.admin-users.spec.js
npm.cmd run test:e2e --workspace=client -- e2e/tests/uc29.teacher-studio-validation.spec.js
```

---

## 4. Ghi chú & Điểm Kỹ thuật Nổi bật
1. **Tránh Double Hashing khi Seeding E2E:** E2E tests tự động seed dữ liệu học viên trực tiếp qua Mongoose model `User.create()`. Chúng tôi đã truyền mật khẩu ở dạng plain-text để kích hoạt trigger pre-save hook mã hóa một lần duy nhất, tránh lỗi `401 Unauthorized` khi đăng nhập UI.
2. **Khắc phục lỗi Parallel Collision:** Sử dụng `uniqueId` động (từ `Date.now() + Math.random()`) để định danh người dùng và dữ liệu kiểm thử, giúp chạy song song (Parallel) các test case trong Playwright mà không xảy ra tranh chấp khóa chính (`E11000 duplicate key error`).
3. **Responsive Mobile Testing:** Để đảm bảo test chạy thành công trên màn hình điện thoại (`chromium-mobile` - Pixel 5), chúng tôi thiết lập đóng/thu gọn thanh sidebar (`.admin-sidebar`) tự động sau khi điều hướng, tránh việc sidebar che khuất viewport làm Playwright báo lỗi click bị chặn (`intercepted pointer events`).
