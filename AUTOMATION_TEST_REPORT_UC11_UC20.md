# Báo cáo kết quả kiểm thử tự động nhóm UC11 - UC20

Dự án: **SmartEnglish Learning Platform**  
Phạm vi kiểm thử: **Nhóm UC11 - UC20, 10 test case đại diện trong Chương 5**  
Môi trường chạy E2E: **Playwright Chromium desktop**  
Ghi chú: **Không chạy và không tính kết quả mobile**

## 5.3.3.2. Kết quả kiểm thử tự động nhóm UC11 - UC20

Nhóm UC11 - UC20 bao gồm các chức năng quản lý thẻ ghi nhớ, sắp xếp thẻ, tạo thư mục, thêm học phần vào thư mục, chia sẻ/lưu học phần công khai và học theo lộ trình. Bộ kiểm thử tự động được chia thành 2 loại: API Test để kiểm tra logic nghiệp vụ và dữ liệu ở backend, E2E Test để kiểm tra luồng thao tác trên giao diện người dùng.

### a. Danh sách file kiểm thử tự động

| Loại kiểm thử | File kiểm thử | Use case bao phủ |
| :--- | :--- | :--- |
| API Test | `server/tests/uc11-uc20.learning-content-flows.test.js` | UC11, UC12, UC13, UC15, UC17, UC19 |
| E2E Test | `client/e2e/tests/uc11-uc20.learning-content-flows.spec.js` | UC11, UC12, UC13, UC15, UC17, UC19 |

### b. Kết quả theo từng test case

| Use Case | Test Case | Mục tiêu kiểm thử | Hình thức kiểm thử | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| UC11 | TC-UC11-01 | Kiểm tra thêm thẻ ghi nhớ mới thành công | API Test + E2E Test | Pass |
| UC11 | TC-UC11-02 | Kiểm tra không cho lưu thẻ khi thiếu thông tin bắt buộc | API Test + E2E Test | Pass |
| UC12 | TC-UC12-01 | Kiểm tra sắp xếp lại thứ tự thẻ thành công | API Test + E2E Test | Pass |
| UC13 | TC-UC13-01 | Kiểm tra tạo thư mục gốc mới thành công | API Test + E2E Test | Pass |
| UC13 | TC-UC13-03 | Kiểm tra không cho tạo thư mục khi tên không hợp lệ | API Test + E2E Test | Pass |
| UC15 | TC-UC15-01 | Kiểm tra thêm bộ thẻ học vào thư mục thành công | API Test + E2E Test | Pass |
| UC17 | TC-UC17-01 | Kiểm tra tạo và sao chép liên kết chia sẻ bộ thẻ công khai | API Test + E2E Test | Pass |
| UC17 | TC-UC17-03 | Kiểm tra chức năng lưu bộ thẻ công khai vào danh sách đã lưu | API Test + E2E Test | Pass |
| UC19 | TC-UC19-01 | Kiểm tra hoàn thành bài học theo lộ trình và nhận điểm thưởng | API Test + E2E Test | Pass |
| UC19 | TC-UC19-03 | Kiểm tra xử lý trạng thái hết tim khi học bài | API Test + E2E Test | Pass |

### c. Kết quả chạy API Test

| Lệnh chạy | Kết quả |
| :--- | :--- |
| `npm.cmd test --workspace=server -- --runTestsByPath tests/uc11-uc20.learning-content-flows.test.js` | 10/10 Passed |

### d. Kết quả chạy E2E Test

| Lệnh chạy | Kết quả |
| :--- | :--- |
| `npm.cmd run test:e2e --workspace=client -- e2e/tests/uc11-uc20.learning-content-flows.spec.js --project=chromium --reporter=list` | 10/10 Passed |

### e. Tổng hợp kết quả nhóm UC11 - UC20

| Tiêu chí | Kết quả |
| :--- | :--- |
| Số test case được tự động hóa | 10 |
| Số test case Pass trong môi trường automation | 10 |
| Số test case Fail trong môi trường automation | 0 |
| Số file API Test | 1 |
| Số file E2E Test | 1 |
