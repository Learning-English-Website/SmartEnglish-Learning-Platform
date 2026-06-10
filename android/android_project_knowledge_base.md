# TÀI LIỆU ÔN TẬP & BÁO CÁO DỰ ÁN ANDROID (SMARTENGLISH / MEMORIS)

Chào bạn, đây là tài liệu hướng dẫn chi tiết toàn bộ kiến thức về dự án Android của bạn nhằm chuẩn bị cho buổi báo cáo môn học ngày mai. Tài liệu được cấu trúc sâu sắc từ kiến trúc hệ thống, công nghệ cốt lõi, cơ chế vận hành nâng cao, cho đến chức năng chi tiết của từng file code quan trọng.

---

## 1. Kiến Trúc Hệ Thống (System Architecture)

Dự án Android được xây dựng theo kiến trúc **Clean Architecture** kết hợp mô hình **MVVM (Model-View-ViewModel)**. Đây là kiến trúc chuẩn hóa khuyến nghị bởi Google giúp mã nguồn dễ bảo trì, dễ mở rộng và dễ viết Unit Test.

```mermaid
graph TD
    subgraph Presentation_Layer [Presentation Layer UI & ViewModels]
        UI[Composables / Screens] -->|Quan sát State| VM[ViewModels]
        VM -->|Gửi Events| UI
    end

    subgraph Domain_Layer [Domain Layer Core Business Logic]
        VM -->|Gọi| UC[Use Cases]
        UC -->|Sử dụng| RI[Repository Interfaces]
        UC -->|Thao tác| EN[Entities / Models]
    end

    subgraph Data_Layer [Data Layer Frameworks & Data Sources]
        RI <.---|Triển khai| RE[Repository Implementations]
        RE -->|Mạng API| Retrofit[Retrofit / Remote API]
        RE -->|Bộ nhớ Local| Room[Room Local DB / SQLite]
        RE -->|Tệp tin offline| FileIO[Bộ nhớ Local Media]
        RE -->|Cài đặt ứng dụng| DataStore[SharedPreferences / DataStore]
    end
    
    style Domain_Layer fill:#f9f,stroke:#333,stroke-width:2px
    style Data_Layer fill:#bbf,stroke:#333,stroke-width:2px
    style Presentation_Layer fill:#bfb,stroke:#333,stroke-width:2px
```

### Các lớp Kiến trúc (Layers):
1. **Domain Layer (Lớp nghiệp vụ cốt lõi)**:
   - **Đặc điểm**: Độc lập hoàn toàn, không phụ thuộc vào bất kỳ thư viện Android hay Database/Network nào. Nếu bạn đổi DB từ Room sang Realm hoặc đổi thư viện mạng, lớp Domain vẫn không đổi.
   - **Thành phần**:
     - **Entities/Models**: Các định nghĩa dữ liệu thuần túy như [Flashcard](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/model/Flashcard.kt), [User](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/model/User.kt), [FlashcardSet](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/model/FlashcardSet.kt).
     - **Repository Interfaces**: Định nghĩa các giao thức (hợp đồng) lấy dữ liệu (ví dụ: [CardRepository](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/repository/CardRepository.kt)).
     - **Use Cases (Interactors)**: Đại diện cho từng ca sử dụng cụ thể của ứng dụng, ví dụ: [LoginUseCase](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/usecase/auth/LoginUseCase.kt), [GetProfileUseCase](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/usecase/user/GetProfileUseCase.kt).
2. **Data Layer (Lớp dữ liệu)**:
   - **Đặc điểm**: Nơi thực hiện lấy dữ liệu thực tế thông qua API hoặc Local Database. Phụ thuộc trực tiếp vào các thư viện bên thứ ba.
   - **Thành phần**:
     - **Remote Data Sources**: Gồm các API interface của Retrofit ([SetApi](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/remote/api/SetApi.kt), [CardApi](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/remote/api/CardApi.kt)) và DTOs (Data Transfer Objects) đại diện cho cấu trúc JSON trả về từ Server.
     - **Local Data Sources**: Gồm Room Database ([AppDatabase](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/local/AppDatabase.kt)), các DAOs ([FlashcardDao](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/local/dao/FlashcardDao.kt)) và các DB Entity.
     - **Repository Implementations**: Lớp kế thừa giao diện từ Domain để điều phối luồng dữ liệu (Offline-First): Khi có mạng thì tải từ API và ghi vào Cache DB; khi không có mạng thì tải từ DB ra (ví dụ: [CardRepositoryImpl](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/repository/CardRepositoryImpl.kt)).
3. **Presentation Layer (Lớp giao diện người dùng)**:
   - **Đặc điểm**: Xử lý việc hiển thị màn hình và tương tác với người dùng.
   - **Thành phần**:
     - **UI (Jetpack Compose)**: Các hàm Composable vẽ nên giao diện màn hình linh hoạt, mượt mà và trực quan.
     - **ViewModels**: Nơi quản lý State (trạng thái hiển thị) của màn hình và tiếp nhận Event từ UI để kích hoạt các Use Cases trong Domain Layer. ViewModels tồn tại lâu hơn chu kỳ sống của Activity/Fragment (sống sót qua các sự kiện xoay màn hình).

---

## 2. Các Công Nghệ Và Thư Viện Cốt Lõi (Tech Stack)

Khi báo cáo môn học, bạn hãy tự tin nêu bật các công nghệ tiên tiến đang sử dụng trong ứng dụng:

*   **Jetpack Compose**: Bộ công cụ xây dựng giao diện người dùng (UI) khai báo (Declarative UI) hiện đại nhất của Android, thay thế hoàn toàn cho XML Layouts cũ kỹ. Giúp giảm thiểu boilerplate code và đồng bộ state với UI dễ dàng.
*   **Kotlin Coroutines & Flow**: Thư viện xử lý lập trình bất đồng bộ (Asynchronous) hiệu năng cao. `Flow` (đặc biệt là `StateFlow` và `SharedFlow`) hoạt động như các luồng dữ liệu phản ứng (Reactive Data Streams) cập nhật UI theo thời gian thực khi tầng dữ liệu thay đổi.
*   **Dagger Hilt**: Thư viện quản lý Tiêm phụ thuộc (Dependency Injection) được xây dựng trên Dagger2 giúp tự động hóa việc khởi tạo và truyền các đối tượng (`Retrofit`, `RoomDatabase`, `Repository`) vào ViewModels hoặc Activities.
*   **Retrofit & OkHttp**: Cặp đôi hoàn hảo để kết nối REST API. OkHttp xử lý các interceptor bảo mật (gắn Access Token vào Header) và tự động làm mới token (TokenAuthenticator). Retrofit giúp ánh xạ các API endpoint thành interface Kotlin.
*   **Room Database**: Lớp trừu tượng hóa SQLite giúp truy vấn dữ liệu an toàn ngay tại thời điểm biên dịch (compile-time safety) và hỗ trợ trả về dữ liệu dạng `Flow` để UI tự động cập nhật khi DB thay đổi.
*   **WorkManager**: Thư viện điều phối các tác vụ chạy ngầm của Android kể cả khi ứng dụng bị tắt hoặc thiết bị khởi động lại. Sử dụng để chạy tiến trình đồng bộ dữ liệu ngầm định kỳ ([SyncWorker](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/sync/SyncWorker.kt)).
*   **AlarmManager & BroadcastReceiver**: Được dùng để lập lịch nhắc nhở học bài hằng ngày vào khung giờ cố định chính xác, hoạt động bền bỉ ngay cả khi máy khởi động lại ([StudyReminderReceiver](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/receiver/StudyReminderReceiver.kt)).
*   **Apache POI**: Dùng để xử lý phân tích và trích xuất dữ liệu trực tiếp từ file bảng tính Excel (`.xlsx`, `.xls`) ngay trên điện thoại để tạo bộ thẻ từ vựng ([XlsxImporter](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/XlsxImporter.kt)).
*   **ZXing (Zebra Crossing)**: Thư viện tạo và quét mã QR Code giúp người dùng chia sẻ nhanh các bộ thẻ học tập ([ShareBottomSheet](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/sets/ShareBottomSheet.kt)).
*   **Coil**: Thư viện tải và hiển thị hình ảnh tối ưu hóa bộ nhớ được thiết kế riêng cho Jetpack Compose.

---

## 3. Các Hệ Thống Đặc Sắc (Unique Technical Features)

Đây chính là các điểm nhấn kỹ thuật nâng tầm đồ án của bạn, hãy tập trung giải thích cơ chế của các tính năng này trước hội đồng chấm thi:

### A. Hệ Thống Đồng Bộ Ngoại Tuyến (Offline-First Sync Engine)
Ứng dụng cho phép người dùng học tập và chỉnh sửa bộ thẻ, tạo từ mới ngay cả khi không có kết nối Internet (Offline Mode). Khi thiết bị có mạng trở lại, dữ liệu sẽ tự động được đồng bộ lên Cloud Server.

> [!NOTE]
> **Cơ chế hoạt động của `SyncManager`:**
> 1. **Ghi nhận hành động ngoại tuyến**: Khi người dùng thêm/sửa/xóa bộ thẻ khi offline, hệ thống sẽ lưu thông tin hành động vào bảng `PendingOperationEntity` trong SQLite cục bộ kèm theo payload dạng JSON.
> 2. **Theo dõi trạng thái mạng**: Lớp [NetworkMonitor](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/NetworkMonitor.kt) sử dụng `ConnectivityManager.NetworkCallback` để lắng nghe thay đổi kết nối mạng thời gian thực.
> 3. **Tự động kích hoạt đồng bộ**: Khi mạng được khôi phục, `SyncManager` lập tức được đánh thức. Nó chạy thuật toán **Compaction (Nén hàng đợi)**:
>    - *Ví dụ*: Nếu bạn tạo bộ thẻ rồi xóa đi khi offline, hàng đợi sẽ loại bỏ cả 2 lệnh. Nếu bạn sửa bộ thẻ 5 lần liên tiếp, nó chỉ giữ lại thay đổi cuối cùng. Điều này giúp giảm thiểu số lượng Request dư thừa lên Server.
> 4. **Tránh sự cố quá tải (Thundering Herd)**: Khi mạng bật lại, hàng loạt thiết bị đồng loạt gửi yêu cầu sẽ dễ làm sập Server. `SyncManager` sử dụng **Jitter (Độ trễ ngẫu nhiên từ 1s đến 8s)** trước khi thực sự đồng bộ.
> 5. **Tải file phương tiện ngoại tuyến**: Khi người dùng bấm tải một bộ từ vựng, hệ thống tải dữ liệu chữ, đồng thời tải toàn bộ file âm thanh phát âm (`.mp3`) và ảnh minh họa (`.jpg`/`.png`) lưu trữ trực tiếp vào thư mục bộ nhớ trong ứng dụng (`filesDir/offline_media`). Sau đó cập nhật đường dẫn cục bộ vào SQLite để ứng dụng có thể phát âm thanh và xem ảnh khi không có mạng.

### B. Thuật Toán Spaced Repetition (Lặp Lại Ngắt Quãng - SM-2)
Spaced Repetition là phương pháp ghi nhớ từ vựng tối ưu dựa trên đường cong lãng quên của Ebbinghaus. Ứng dụng tích hợp thuật toán **SM-2 (SuperMemo 2)** để tự động tính toán thời điểm ôn tập tối ưu cho từng thẻ từ vựng dựa trên phản hồi của người học.

> [!TIP]
> **Các tham số của thuật toán trong cơ sở dữ liệu ([StudyProgressEntity](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/local/entity/StudyProgressEntity.kt)):**
> *   `easeFactor` (Hệ số dễ): Bắt đầu từ `2.5`. Nếu từ đó khó nhớ, hệ số này giảm xuống; nếu từ dễ nhớ, hệ số này tăng lên.
> *   `interval` (Khoảng thời gian ôn tập tiếp theo - đơn vị: ngày): Số ngày giãn cách trước lần ôn tiếp theo.
> *   `nextReviewAt`: Thời điểm cụ thể từ vựng sẽ xuất hiện trở lại trong danh sách "Cần ôn tập hôm nay" (`dueToday`).

**Cách đánh giá độ ghi nhớ của người học:**
Khi ôn tập thẻ, người học sẽ chọn 1 trong 4 mức độ:
1.  `AGAIN` (Quên hoàn toàn): Đặt lại `interval = 1`, giảm `easeFactor`. Từ sẽ xuất hiện lại ngay lập tức.
2.  `HARD` (Mơ hồ): Tăng khoảng cách ôn nhẹ, giảm `easeFactor`.
3.  `GOOD` (Nhớ khá tốt): Nhân khoảng cách ôn hiện tại với `easeFactor` hiện tại. Giữ nguyên hoặc tăng nhẹ `easeFactor`.
4.  `EASY` (Nhớ nằm lòng): Nhân khoảng cách ôn với hệ số lớn hơn, tăng mạnh `easeFactor` để từ đó lâu xuất hiện lại hơn.

### C. Tính Năng Chia Sẻ Thông Minh (Deep Linking & QR Code)
*   **Deep Linking**: Khi người dùng tạo liên kết chia sẻ cho một bộ thẻ học tập, ứng dụng đăng ký Schema tùy chỉnh `smartenglish://set/{shareCode}` trong [AndroidManifest.xml](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/android/app/src/main/AndroidManifest.xml).
    - Khi người dùng click vào liên kết dạng này ở bất kỳ đâu ngoài hệ thống, hệ điều hành Android sẽ tự động đánh thức ứng dụng và mở màn hình [DeepLinkActivity](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/deeplink/DeepLinkActivity.kt) để hiển thị trực quan thông tin bộ thẻ.
    - Người dùng có thể chọn **"Lưu về thư viện" (Clone)**: Ứng dụng sẽ gọi API sao chép toàn bộ cấu trúc và danh sách từ vựng thành bộ thẻ cá nhân mới của họ để họ tự do chỉnh sửa và ôn tập.
*   **QR Code**: Sử dụng lớp `QRCodeWriter` của thư viện ZXing để chuyển đổi chuỗi liên kết chia sẻ thành một ma trận nhị phân nhúng trong đối tượng Bitmap dạng `RGB_565` (tiết kiệm bộ nhớ RAM) và vẽ trực tiếp lên Canvas trong Jetpack Compose để người dùng quét trực tiếp từ thiết bị khác.

### D. Hệ Thống Import Từ File Excel & CSV Linh Hoạt
Không chỉ cho phép gõ tay từng từ vựng thủ công, ứng dụng hỗ trợ Import hàng loạt từ file Excel (`.xlsx`) và `.csv`.
*   **Xử lý CSV thủ công an toàn**: Thay vì phân tách bằng dấu phẩy thông thường (dễ bị lỗi nếu định nghĩa từ vựng có chứa dấu phẩy), lớp [FileImportHelper](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/FileImportHelper.kt) triển khai thuật toán hữu hạn trạng thái nhận biết dấu ngoặc kép để xử lý chuỗi dữ liệu chứa dấu phẩy trích xuất chuẩn xác.
*   **Ánh xạ cột động (Dynamic Column Mapping)**: Ứng dụng không bắt buộc file Excel phải có định dạng tiêu đề cố định. Lớp [ColumnMapper](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/ColumnMapper.kt) sẽ chuẩn hóa tiêu đề và cố gắng **tự động phát hiện** xem cột nào chứa "Front" (Thuật ngữ), cột nào chứa "Back" (Ý nghĩa) thông qua so sánh regex. Người dùng cũng có thể tự ánh xạ lại thủ công qua giao diện trực quan trước khi xác nhận lưu vào SQLite và đồng bộ lên Server.

---

## 4. Chi Tiết Các File Code Quan Trọng & Chức Năng

Dưới đây là sơ đồ hướng dẫn chức năng của từng file để bạn dễ tìm kiếm và trình bày:

### A. Tầng Cấu Hình & Initialize
1.  [build.gradle.kts](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/build.gradle.kts): Khai báo tất cả thư viện, SDK target (Compile & Target SDK 36, Min SDK 26), cấu hình compiler cho Kotlin và Jetpack Compose.
2.  [SmartEnglishApplication.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/SmartEnglishApplication.kt): Lớp khởi chạy đầu tiên của ứng dụng. Kế thừa `Application` và được đánh dấu `@HiltAndroidApp` để khởi tạo đồ thị Dependency Injection của Hilt. Đồng thời lên lịch đồng bộ ngầm định kỳ tại đây.
3.  [MainActivity.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/MainActivity.kt): Điểm vào UI chính của ứng dụng (`@AndroidEntryPoint`). Khởi tạo Scaffold, điều hướng Navigation Bottom Bar, xử lý Bottom Sheet tạo bộ thẻ/thư mục mới, và kiểm tra trạng thái Token để chuyển hướng tự động giữa Login Screen và Home Screen.

### B. Tầng Data (Dữ liệu & Sync)
1.  [AppDatabase.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/local/AppDatabase.kt): Lớp cơ sở dữ liệu chính của Room, quản lý 8 bảng thực thể (`entities`) cục bộ và khai báo các hàm trừu tượng trả về DAOs để truy vấn dữ liệu.
2.  [SyncManager.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/sync/SyncManager.kt): "Trái tim" của hệ thống offline-first. Xử lý hàng đợi hoạt động chưa đồng bộ, thực hiện nén hàng đợi, thực thi lệnh đồng bộ từng bước, tải tệp âm thanh/hình ảnh offline, và cung cấp các trạng thái đồng bộ (`SyncState`) cho UI.
3.  [SyncScheduler.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/sync/SyncScheduler.kt): Cấu hình cài đặt `WorkManager` để tự động chạy tiến trình ngầm định kỳ (mỗi 15 phút) đồng bộ dữ liệu lên máy chủ kể cả khi app đã đóng.
4.  [SyncWorker.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/data/sync/SyncWorker.kt): Lớp thực thi công việc thực tế của WorkManager. Kế thừa `CoroutineWorker`, gọi hàm xử lý của `SyncManager` trong một Background Thread.

### C. Tầng Domain (Nghiệp vụ cốt lõi)
1.  [StudySession.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/model/StudySession.kt): Thực thể biểu diễn một phiên học từ vựng cụ thể (thời gian bắt đầu, số lượng từ đã học, độ chính xác).
2.  [StudyRepository.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/repository/StudyRepository.kt): Khai báo interface các phương thức tạo, cập nhật, hoàn thành phiên học bài.
3.  [ForgotPasswordUseCase.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/domain/usecase/auth/ForgotPasswordUseCase.kt): Use case xử lý yêu cầu gửi OTP khôi phục mật khẩu khi người dùng quên.

### D. Tầng Presentation (Giao diện người dùng)
1.  [Screen.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/navigation/Screen.kt): Khai báo định tuyến (Routes) dạng Sealed Class cho tất cả màn hình trong ứng dụng và định nghĩa danh sách các mục thuộc Bottom Navigation Bar.
2.  [AppNavGraph.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/navigation/AppNavGraph.kt): Thiết lập sơ đồ chuyển màn hình bằng Jetpack Compose Navigation, định nghĩa tham số truyền đi giữa các màn hình (ví dụ: `setId` khi chuyển sang màn hình Học).
3.  [StudyViewModel.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/study/StudyViewModel.kt): ViewModel quản lý trạng thái học bài. Nắm giữ trạng thái thẻ hiện tại (đã lật mặt sau hay chưa, chỉ số từ hiện tại, số từ trả lời đúng/sai), ghi nhận các lựa chọn ôn tập (Again, Hard, Good, Easy) để cập nhật tiến trình học qua Repository và cập nhật điểm kinh nghiệm XP (Gamification).
4.  [FlashcardStudyScreen.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/study/FlashcardStudyScreen.kt): Màn hình học từ vựng chính, chứa các hiệu ứng lật thẻ (Flip Animation), nút bấm đánh giá mức độ nhớ của từ, phát âm từ vựng qua Audio, và hiển thị bảng tổng kết gamification đẹp mắt khi hoàn thành phiên học.
5.  [ImportModal.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/components/ImportModal.kt): Giao diện Bottom Sheet hỗ trợ chọn tệp tin, xem trước dữ liệu bảng tính động, cấu hình ánh xạ cột thủ công và hiển thị tiến trình đang tải file lên thư viện.
6.  [ShareBottomSheet.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/presentation/sets/ShareBottomSheet.kt): Giao diện chia sẻ bộ thẻ học. Tạo liên kết chia sẻ, hiển thị QR Code để người dùng khác quét, hỗ trợ sao chép liên kết hoặc gửi tin nhắn SMS, Email chứa link chia sẻ.
7.  [DeepLinkActivity.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/deeplink/DeepLinkActivity.kt): Activity chuyên dụng để hứng link liên kết chia sẻ từ bên ngoài, hiển thị thông tin bộ thẻ được chia sẻ và hỗ trợ sao chép/clone bộ thẻ về thư viện cá nhân.

### E. Tầng Utilities (Công cụ hỗ trợ)
1.  [NetworkMonitor.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/NetworkMonitor.kt): Kiểm tra kết nối Internet hiện tại và giám sát sự thay đổi trạng thái mạng của thiết bị bằng cách đăng ký Callback với ConnectivityManager.
2.  [StudyReminderHelper.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/StudyReminderHelper.kt): Cài đặt nhắc nhở học bài hằng ngày bằng cách đặt sự kiện báo thức qua `AlarmManager` kèm theo quyền hoạt động khi máy ngủ ngơi (`setAndAllowWhileIdle`).
3.  [XlsxImporter.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/XlsxImporter.kt): Sử dụng thư viện Apache POI phân tích tệp bảng tính `.xlsx` thành danh sách các dòng văn bản đơn giản.
4.  [ColumnMapper.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/ColumnMapper.kt): Chuẩn hóa tiêu đề cột và tự động khớp cột phù hợp nhất với các thuộc tính từ vựng.
5.  [AudioPlayer.kt](file:///c:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/android/app/src/main/java/com/example/smartenglish/util/AudioPlayer.kt): Điều phối trình phát âm thanh từ vựng cục bộ hoặc phát trực tuyến từ mạng bằng `MediaPlayer`.

---

## 5. Kinh Nghiệm Vàng Khi Báo Cáo Trước Hội Đồng

Để đạt điểm số tối đa, bạn nên chuẩn bị câu trả lời cho các câu hỏi thường gặp của các thầy cô chấm thi:

### 💬 Câu hỏi 1: Tại sao em lại chọn Clean Architecture thay vì MVC hay MVP?
*   **Cách trả lời**:
    - "Clean Architecture giúp tách biệt hoàn toàn nghiệp vụ cốt lõi (Domain) khỏi các công nghệ biên như giao diện (Compose) hay cơ sở dữ liệu (Room). Điều này giúp code cực kỳ dễ bảo trì và mở rộng."
    - "Thứ hai, nó tối ưu hóa việc kiểm thử (Unit Test) vì chúng ta có thể dễ dàng Mock (giả lập) các tầng dữ liệu mà không cần chạy máy ảo Android."
    - "Cuối cùng, nó kết hợp hoàn hảo với MVVM giúp kiểm soát luồng dữ liệu 1 chiều thông qua StateFlow, tránh tình trạng rò rỉ bộ nhớ (Memory Leak) và xung đột trạng thái trên giao diện."

### 💬 Câu hỏi 2: Em giải quyết bài toán Offline-First như thế nào khi thiết bị mất mạng đột ngột?
*   **Cách trả lời**:
    - "Dự án sử dụng cơ chế lưu trữ đệm (Caching) bằng Room Database kết hợp hàng đợi hành động trì hoãn (`PendingOperationTable`)."
    - "Mọi thao tác thay đổi dữ liệu khi offline sẽ được lưu tạm thành các tác vụ chờ kèm theo payload chi tiết dạng JSON."
    - "Khi `NetworkMonitor` phát hiện thiết bị online trở lại, hệ thống nén hàng đợi để tối ưu hóa băng thông, sau đó thực hiện gửi tuần tự các request lên máy chủ. Nếu thành công thì xóa khỏi hàng đợi cục bộ. Các tác vụ định kỳ nặng hơn sẽ được `WorkManager` đảm nhiệm để đảm bảo hoạt động an toàn kể cả khi ứng dụng bị tắt."

### 💬 Câu hỏi 3: Thuật toán Spaced Repetition (SM-2) của em hoạt động thế nào trong ứng dụng?
*   **Cách trả lời**:
    - "Hệ thống lưu trữ các tham số là `easeFactor` (độ dễ) và `interval` (khoảng cách ôn tập) của từng từ vựng trong bảng `study_progress`."
    - "Khi người dùng học từ và chọn các mức phản hồi: Again, Hard, Good, Easy; thuật toán SM-2 sẽ tính toán khoảng giãn cách ôn tập tiếp theo bằng cách nhân khoảng cách hiện tại với `easeFactor` tương ứng, và hiệu chỉnh lại `easeFactor` cho lần sau."
    - "Các từ khó nhớ sẽ liên tục xuất hiện hàng ngày, còn từ đã nhớ lâu sẽ được lùi lịch ôn tập sau vài tuần hoặc vài tháng, giúp người học tiết kiệm tối đa thời gian ghi nhớ."

---

Chúc bạn có một buổi báo cáo môn học thành công rực rỡ vào ngày mai! Nếu có thêm bất kỳ đoạn code nào cần làm rõ chi tiết hoặc giải nghĩa sâu hơn, hãy nhắn ngay cho tôi nhé!
