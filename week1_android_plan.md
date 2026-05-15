# 📱 WEEK 1: ANDROID APP — Dev C Plan (7 Ngày)

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + Room + Navigation Compose
> **Architecture:** MVVM + Clean Architecture (data/domain/presentation)
> **Mục tiêu:** Auth flow đầy đủ (Register, Login, ForgotPassword, EditProfile), Bottom navigation, Room database sẵn sàng, auto-login

---

## 📆 NGÀY 1 — Project Setup + DI

### Tasks
- [ ] Tạo Android project trong Android Studio:
  - Package: `com.memoris.app` (hoặc `com.minlish.app`)
  - Min SDK: 26 (Android 8.0)
  - Target SDK: 34
  - Compose Activity template
- [ ] Setup `build.gradle.kts` (app-level) — dependencies:
  ```kotlin
  // Compose
  implementation(platform("androidx.compose:compose-bom:2024.02.00"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.activity:activity-compose:1.8.2")
  implementation("androidx.navigation:navigation-compose:2.7.7")

  // Hilt DI
  implementation("com.google.dagger:hilt-android:2.50")
  kapt("com.google.dagger:hilt-compiler:2.50")
  implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

  // Networking
  implementation("com.squareup.retrofit2:retrofit:2.9.0")
  implementation("com.squareup.retrofit2:converter-moshi:2.9.0")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
  implementation("com.squareup.moshi:moshi-kotlin:1.15.0")
  kapt("com.squareup.moshi:moshi-kotlin-codegen:1.15.0")

  // Room
  implementation("androidx.room:room-runtime:2.6.1")
  implementation("androidx.room:room-ktx:2.6.1")
  kapt("androidx.room:room-compiler:2.6.1")

  // DataStore / EncryptedSharedPreferences
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
  implementation("androidx.datastore:datastore-preferences:1.0.0")

  // Coil (image loading)
  implementation("io.coil-kt:coil-compose:2.5.0")

  // Coroutines
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
  implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
  ```
- [ ] Tạo `MemorisApplication.kt`:
  ```kotlin
  @HiltAndroidApp
  class MemorisApplication : Application()
  ```
- [ ] Tạo folder structure:
  ```
  com.memoris.app/
  ├── di/                          # Hilt modules
  │   ├── AppModule.kt
  │   ├── NetworkModule.kt
  │   └── DatabaseModule.kt
  ├── data/
  │   ├── remote/
  │   │   ├── api/                 # Retrofit interfaces
  │   │   ├── dto/                 # Data Transfer Objects
  │   │   └── interceptor/        # OkHttp interceptors
  │   ├── local/
  │   │   ├── dao/                 # Room DAOs
  │   │   ├── entity/             # Room entities
  │   │   └── AppDatabase.kt
  │   └── repository/             # Repository implementations
  ├── domain/
  │   ├── model/                   # Domain models
  │   ├── repository/             # Repository interfaces
  │   └── usecase/                # Use cases
  ├── presentation/
  │   ├── auth/                    # Login, Register screens
  │   ├── home/                    # Home screen
  │   ├── profile/                 # Profile screen
  │   ├── components/             # Shared UI components
  │   ├── navigation/             # Navigation graph
  │   └── theme/                  # Material3 theme
  └── util/                       # Utilities, extensions
  ```
- [ ] Tạo `di/NetworkModule.kt`:
  ```kotlin
  @Module
  @InstallIn(SingletonComponent::class)
  object NetworkModule {
      private const val BASE_URL = "http://10.0.2.2:5000/api/" // localhost cho emulator

      @Provides @Singleton
      fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient {
          return OkHttpClient.Builder()
              .addInterceptor(authInterceptor)
              .addInterceptor(HttpLoggingInterceptor().apply {
                  level = HttpLoggingInterceptor.Level.BODY
              })
              .connectTimeout(30, TimeUnit.SECONDS)
              .readTimeout(30, TimeUnit.SECONDS)
              .build()
      }

      @Provides @Singleton
      fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
          return Retrofit.Builder()
              .baseUrl(BASE_URL)
              .client(okHttpClient)
              .addConverterFactory(MoshiConverterFactory.create())
              .build()
      }
  }
  ```
- [ ] Tạo `data/remote/interceptor/AuthInterceptor.kt`:
  ```kotlin
  @Singleton
  class AuthInterceptor @Inject constructor(
      private val tokenManager: TokenManager
  ) : Interceptor {
      override fun intercept(chain: Interceptor.Chain): Response {
          val token = tokenManager.getAccessToken()
          val request = chain.request().newBuilder()
          if (token != null) {
              request.addHeader("Authorization", "Bearer $token")
          }
          return chain.proceed(request.build())
      }
  }
  ```
- [ ] Verify: App build + chạy trên emulator, không crash, Hilt inject thành công

### ✅ Deliverable
Android app build thành công. Hilt DI hoạt động. Retrofit instance sẵn sàng.

---

## 📆 NGÀY 2 — Room Database + Navigation + Token

### Tasks
- [ ] Tạo `util/TokenManager.kt`:
  ```kotlin
  @Singleton
  class TokenManager @Inject constructor(@ApplicationContext context: Context) {
      private val prefs = EncryptedSharedPreferences.create(
          "auth_prefs",
          MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
          context,
          EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
          EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
      )

      fun saveTokens(accessToken: String, refreshToken: String) {
          prefs.edit().putString("access_token", accessToken)
              .putString("refresh_token", refreshToken).apply()
      }

      fun getAccessToken(): String? = prefs.getString("access_token", null)
      fun getRefreshToken(): String? = prefs.getString("refresh_token", null)
      fun clearTokens() = prefs.edit().clear().apply()
      fun isLoggedIn(): Boolean = getAccessToken() != null
  }
  ```
- [ ] Tạo `data/local/AppDatabase.kt`:
  ```kotlin
  @Database(
      entities = [WordSetEntity::class, WordEntity::class, StudyProgressEntity::class],
      version = 1, exportSchema = false
  )
  abstract class AppDatabase : RoomDatabase() {
      abstract fun vocabularyDao(): VocabularyDao
      abstract fun progressDao(): ProgressDao
  }
  ```
- [ ] Tạo Room entities:
  - `WordSetEntity.kt` — id, title, description, language, wordCount, createdAt
  - `WordEntity.kt` — id, setId, word, meaning, pronunciation, example, note
  - `StudyProgressEntity.kt` — id, wordId, status, easeFactor, interval, nextReviewAt
- [ ] Tạo Room DAOs:
  - `VocabularyDao.kt` — insert, update, delete, getBySetId, search
  - `ProgressDao.kt` — insert, update, getDueCards, getStats
- [ ] Tạo `di/DatabaseModule.kt`:
  ```kotlin
  @Module
  @InstallIn(SingletonComponent::class)
  object DatabaseModule {
      @Provides @Singleton
      fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
          return Room.databaseBuilder(context, AppDatabase::class.java, "memoris_db")
              .fallbackToDestructiveMigration()
              .build()
      }
      @Provides fun provideVocabularyDao(db: AppDatabase) = db.vocabularyDao()
      @Provides fun provideProgressDao(db: AppDatabase) = db.progressDao()
  }
  ```
- [ ] Tạo `presentation/navigation/Screen.kt`:
  ```kotlin
  sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
      object Home : Screen("home", "Home", Icons.Default.Home)
      object Vocabulary : Screen("vocabulary", "Vocabulary", Icons.Default.MenuBook)
      object Study : Screen("study", "Study", Icons.Default.School)
      object Progress : Screen("progress", "Progress", Icons.Default.BarChart)
      object Profile : Screen("profile", "Profile", Icons.Default.Person)
  }
  ```
- [ ] Tạo `presentation/navigation/AppNavGraph.kt` — NavHost setup
- [ ] Tạo `presentation/navigation/BottomNavBar.kt`:
  ```kotlin
  @Composable
  fun BottomNavBar(navController: NavController) {
      val screens = listOf(Screen.Home, Screen.Vocabulary, Screen.Study, Screen.Progress, Screen.Profile)
      NavigationBar {
          val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
          screens.forEach { screen ->
              NavigationBarItem(
                  icon = { Icon(screen.icon, contentDescription = screen.title) },
                  label = { Text(screen.title) },
                  selected = currentRoute == screen.route,
                  onClick = { navController.navigate(screen.route) { popUpTo(Screen.Home.route) } }
              )
          }
      }
  }
  ```
- [ ] Verify: Navigate giữa 5 tabs, Room DB khởi tạo, token save/load hoạt động

### ✅ Deliverable
Bottom navigation hoạt động. Room database sẵn sàng. Token encrypted storage sẵn sàng.

---

## 📆 NGÀY 3 — Auth API Integration Layer

> [!NOTE]
> **Dependency:** Auth API từ Dev A (thường sẵn sàng cuối ngày 3). Bắt đầu tạo layer trước, test API khi có.

### Tasks
- [ ] Tạo `data/remote/dto/ApiResponse.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class ApiResponse<T>(
      val success: Boolean,
      val data: T?,
      val error: ErrorDto?
  )

  @JsonClass(generateAdapter = true)
  data class ErrorDto(val code: String?, val message: String?)
  ```
- [ ] Tạo `data/remote/dto/AuthDto.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class LoginRequest(val email: String, val password: String)

  @JsonClass(generateAdapter = true)
  data class RegisterRequest(val email: String, val username: String, val password: String)

  @JsonClass(generateAdapter = true)
  data class RefreshRequest(val refreshToken: String)

  @JsonClass(generateAdapter = true)
  data class AuthResponse(val user: UserDto, val accessToken: String, val refreshToken: String)

  @JsonClass(generateAdapter = true)
  data class UserDto(
      val _id: String, val email: String, val username: String,
      val role: String, val avatar: String?, val premium: String,
      val createdAt: String
  )
  ```
- [ ] Tạo `data/remote/api/AuthApi.kt`:
  ```kotlin
  interface AuthApi {
      @POST("auth/register")
      suspend fun register(@Body body: RegisterRequest): ApiResponse<AuthResponse>

      @POST("auth/login")
      suspend fun login(@Body body: LoginRequest): ApiResponse<AuthResponse>

      @POST("auth/refresh")
      suspend fun refresh(@Body body: RefreshRequest): ApiResponse<AuthResponse>

      @GET("users/me")
      suspend fun getMe(): ApiResponse<UserDto>
  }
  ```
- [ ] Provide `AuthApi` trong `NetworkModule`:
  ```kotlin
  @Provides @Singleton
  fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)
  ```
- [ ] Tạo `util/ApiResult.kt`:
  ```kotlin
  sealed class ApiResult<out T> {
      data class Success<T>(val data: T) : ApiResult<T>()
      data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
      object Loading : ApiResult<Nothing>()
  }
  ```
- [ ] Tạo `domain/model/User.kt` — domain model (tách khỏi DTO)
- [ ] Tạo `domain/repository/AuthRepository.kt` (interface):
  ```kotlin
  interface AuthRepository {
      suspend fun login(email: String, password: String): ApiResult<User>
      suspend fun register(email: String, username: String, password: String): ApiResult<User>
      suspend fun getMe(): ApiResult<User>
      fun isLoggedIn(): Boolean
      fun logout()
  }
  ```
- [ ] Tạo `data/repository/AuthRepositoryImpl.kt`:
  ```kotlin
  class AuthRepositoryImpl @Inject constructor(
      private val authApi: AuthApi,
      private val tokenManager: TokenManager
  ) : AuthRepository {
      override suspend fun login(email: String, password: String): ApiResult<User> {
          return try {
              val response = authApi.login(LoginRequest(email, password))
              if (response.success && response.data != null) {
                  tokenManager.saveTokens(response.data.accessToken, response.data.refreshToken)
                  ApiResult.Success(response.data.user.toDomain())
              } else {
                  ApiResult.Error(response.error?.message ?: "Login failed")
              }
          } catch (e: Exception) {
              ApiResult.Error(e.message ?: "Network error")
          }
      }
      // ... register, getMe, isLoggedIn, logout tương tự
  }
  ```
- [ ] Tạo `domain/usecase/auth/LoginUseCase.kt`:
  ```kotlin
  class LoginUseCase @Inject constructor(private val repo: AuthRepository) {
      suspend operator fun invoke(email: String, password: String) = repo.login(email, password)
  }
  ```
- [ ] Tạo `domain/usecase/auth/RegisterUseCase.kt` tương tự
- [ ] Verify: Gọi API thật → nhận token → lưu encrypted → log thành công

### ✅ Deliverable
Clean Architecture layers hoàn chỉnh cho Auth. API call thành công, tokens lưu an toàn.

---

## 📆 NGÀY 4 — Auth Screens (Login + Register)

> [!IMPORTANT]
> **Dependency:** Auth API **phải sẵn sàng** hôm nay để test end-to-end.

### Tasks
- [ ] Tạo `presentation/auth/AuthViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class AuthViewModel @Inject constructor(
      private val loginUseCase: LoginUseCase,
      private val registerUseCase: RegisterUseCase,
      private val authRepository: AuthRepository
  ) : ViewModel() {

      private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
      val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

      fun login(email: String, password: String) {
          viewModelScope.launch {
              _uiState.value = AuthUiState.Loading
              when (val result = loginUseCase(email, password)) {
                  is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                  is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                  else -> {}
              }
          }
      }

      fun register(email: String, username: String, password: String) { /* tương tự */ }

      fun checkAuthState() {
          if (authRepository.isLoggedIn()) {
              viewModelScope.launch {
                  when (val result = authRepository.getMe()) {
                      is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                      is ApiResult.Error -> { authRepository.logout() }
                      else -> {}
                  }
              }
          }
      }
  }

  sealed class AuthUiState {
      object Idle : AuthUiState()
      object Loading : AuthUiState()
      data class Success(val user: User) : AuthUiState()
      data class Error(val message: String) : AuthUiState()
  }
  ```
- [ ] Tạo `presentation/auth/LoginScreen.kt`:
  - TextField: Email (keyboard type email)
  - TextField: Password (visual transformation, show/hide toggle)
  - Button: "Login" (loading indicator khi processing)
  - Error: Snackbar khi lỗi
  - TextButton: "Forgot Password?" → navigate ForgotPasswordScreen
  - TextButton: "Don't have an account? Register"
  - TextButton: "Sign in with Google" (placeholder)
  - Material3 styling
- [ ] Tạo `presentation/auth/RegisterScreen.kt`:
  - TextField: Email, Username, Password, Confirm Password
  - Validation: email format, username 3-30 chars, password 8+ chars, confirm match
  - Error display
  - Button: "Create Account"
- [ ] Tạo `presentation/auth/ForgotPasswordScreen.kt`:
  - TextField: Email
  - Button: "Send Reset Link"
  - Success state: "Check your email for reset instructions"
  - TextButton: "Back to Login"
  - Gọi `POST /api/auth/forgot-password` → hiện success message
- [ ] Thêm `ForgotPasswordUseCase.kt`:
  ```kotlin
  class ForgotPasswordUseCase @Inject constructor(private val repo: AuthRepository) {
      suspend operator fun invoke(email: String) = repo.forgotPassword(email)
  }
  ```
- [ ] Cập nhật `AuthRepository` + `AuthApi` thêm:
  ```kotlin
  // AuthApi.kt
  @POST("auth/forgot-password")
  suspend fun forgotPassword(@Body body: ForgotPasswordRequest): ApiResponse<Unit>

  // AuthRepository.kt
  suspend fun forgotPassword(email: String): ApiResult<Unit>
  ```
- [ ] Setup auth navigation trong `AppNavGraph`:
  ```kotlin
  // Auth flow: Login ↔ Register ↔ ForgotPassword
  // If logged in → show main screens with bottom nav
  ```
- [ ] **Test end-to-end:**
  - [ ] Register → user trong MongoDB → navigate to Home
  - [ ] Login → token saved → navigate to Home
  - [ ] Wrong password → error snackbar
  - [ ] Duplicate email → error snackbar
  - [ ] Forgot Password → nhập email → success message
  - [ ] Kill app → mở lại → vẫn logged in (token check)

### ✅ Deliverable
Login + Register + ForgotPassword screens hoàn chỉnh, hoạt động end-to-end với backend API.

---

## 📆 NGÀY 5 — Home Screen + Profile Screen

> [!NOTE]
> **Dependency:** `GET /api/users/me` API + Staging URL từ Dev A.

### Tasks
- [ ] Tạo `presentation/home/HomeViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class HomeViewModel @Inject constructor(
      private val authRepository: AuthRepository
  ) : ViewModel() {
      private val _user = MutableStateFlow<User?>(null)
      val user: StateFlow<User?> = _user.asStateFlow()

      init { loadUser() }

      private fun loadUser() {
          viewModelScope.launch {
              when (val result = authRepository.getMe()) {
                  is ApiResult.Success -> _user.value = result.data
                  is ApiResult.Error -> { /* handle */ }
                  else -> {}
              }
          }
      }
  }
  ```
- [ ] Tạo `presentation/home/HomeScreen.kt`:
  - Welcome: "Hello, {username}! 👋"
  - Quick stats cards (placeholder):
    - 🔥 Streak: 0 days
    - ⭐ XP: 0
    - 📚 Words: 0
  - Action buttons:
    - "Start Learning" → Vocabulary tab
    - "Practice" → Study tab
- [ ] Tạo `presentation/profile/ProfileScreen.kt`:
  - Avatar (default icon nếu chưa có)
  - Username, email, role, premium status
  - Member since
  - "Edit Profile" button → navigate EditProfileScreen
  - Logout button:
    ```kotlin
    Button(onClick = {
        authRepository.logout()
        navController.navigate("login") {
            popUpTo(0) { inclusive = true }
        }
    }) { Text("Logout") }
    ```
- [ ] Tạo `presentation/profile/EditProfileScreen.kt`:
  - TextField: Username (pre-filled)
  - TextField: Avatar URL (hoặc image picker placeholder)
  - Dropdown: Role display (read-only)
  - Dropdown: Premium status display (read-only)
  - Button: "Save Changes" → `PUT /api/users/me`
  - Loading state + success toast + error handling
- [ ] Tạo `presentation/profile/ProfileViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class ProfileViewModel @Inject constructor(
      private val userRepository: UserRepository
  ) : ViewModel() {
      private val _user = MutableStateFlow<User?>(null)
      val user: StateFlow<User?> = _user.asStateFlow()

      private val _updateState = MutableStateFlow<ApiResult<User>?>(null)
      val updateState: StateFlow<ApiResult<User>?> = _updateState.asStateFlow()

      fun loadProfile() { /* GET /users/me */ }
      fun updateProfile(username: String?, avatar: String?) {
          viewModelScope.launch {
              _updateState.value = ApiResult.Loading
              _updateState.value = userRepository.updateProfile(username, avatar)
          }
      }
  }
  ```
- [ ] Tạo `data/remote/api/UserApi.kt`:
  ```kotlin
  interface UserApi {
      @GET("users/me")
      suspend fun getMe(): ApiResponse<UserDto>

      @PUT("users/me")
      suspend fun updateProfile(@Body body: UpdateProfileRequest): ApiResponse<UserDto>
  }
  ```
- [ ] Tạo `domain/repository/UserRepository.kt` + `data/repository/UserRepositoryImpl.kt`
- [ ] Update `NetworkModule.kt` — switch BASE_URL sang staging khi có:
  ```kotlin
  private const val BASE_URL = "https://staging.yourdomain.com/api/"
  ```
- [ ] Polish bottom navigation: active tab highlight, smooth transitions
- [ ] **Test EditProfile:**
  - [ ] Mở Profile → nhấn Edit → sửa username → Save → username mới hiện đúng
  - [ ] Sửa trên Android → refresh Web → thấy data mới
- [ ] Test toàn bộ flow trên staging API

### ✅ Deliverable
Home screen hiện user data. Profile + EditProfile hoạt động. Navigation smooth.

---

## 📆 NGÀY 6 — Polish + Auto-login + Error Handling

### Tasks
- [ ] Implement auto-login flow:
  ```kotlin
  // In MainActivity or SplashScreen
  // 1. Check TokenManager.isLoggedIn()
  // 2. If yes → call getMe() to verify token
  // 3. If getMe() success → navigate to Home
  // 4. If getMe() fails (401) → try refresh token
  // 5. If refresh fails → clear tokens, navigate to Login
  ```
- [ ] Implement token refresh Authenticator:
  ```kotlin
  class TokenRefreshAuthenticator @Inject constructor(
      private val tokenManager: TokenManager
  ) : Authenticator {
      override fun authenticate(route: Route?, response: Response): Request? {
          if (response.code == 401) {
              val refreshToken = tokenManager.getRefreshToken() ?: return null
              // Call refresh API synchronously
              // Save new tokens
              // Retry original request with new token
          }
          return null
      }
  }
  ```
- [ ] Tạo `presentation/theme/Theme.kt` — Material3 color scheme:
  ```kotlin
  private val DarkColorScheme = darkColorScheme(
      primary = Color(0xFF818CF8),
      secondary = Color(0xFF6366F1),
      background = Color(0xFF1A1A2E),
      surface = Color(0xFF16213E),
  )
  private val LightColorScheme = lightColorScheme(
      primary = Color(0xFF6366F1),
      secondary = Color(0xFF818CF8),
      background = Color(0xFFF8F9FA),
  )
  ```
- [ ] Tạo `presentation/components/LoadingOverlay.kt` — full-screen loading
- [ ] Tạo `presentation/components/ErrorDialog.kt` — error dialog
- [ ] Test edge cases:
  - [ ] No internet → error message (không crash)
  - [ ] Wrong password → snackbar error
  - [ ] Duplicate email register → snackbar error
  - [ ] Server down → timeout error
  - [ ] Token expired → auto refresh
  - [ ] Refresh token expired → redirect login
- [ ] Fix tất cả crashes, warnings

### ✅ Deliverable
Auto-login hoạt động. Error handling đầy đủ. App không crash ở bất kỳ scenario nào.

---

## 📆 NGÀY 7 — Integration Test + Sprint Review

### Tasks
- [ ] **Full E2E test:**
  - [ ] Register → Login → Home hiện username
  - [ ] Kill app → mở lại → vẫn logged in
  - [ ] Profile hiện đúng data
  - [ ] Logout → quay về Login
  - [ ] Bottom navigation 5 tabs
  - [ ] Register trùng email → error
  - [ ] Login sai password → error
  - [ ] Token expired → auto refresh
- [ ] **Cross-platform test:**
  - [ ] Cùng account login trên Web + Android → cả 2 thấy đúng user data
- [ ] Test trên 2-3 emulators/devices:
  - Pixel 7 (API 34)
  - Pixel 4 (API 30)
  - Small screen (5 inch)
- [ ] Check: memory leaks, ANR, slow rendering
- [ ] Fix bugs
- [ ] **Sprint Review (30 phút):** demo Android, list issues, plan tuần 2

### ✅ Deliverable
Android app stable. Auth flow hoàn chỉnh. Sẵn sàng cho Week 2 (Vocabulary CRUD).

---

## 📋 Week 1 Android Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | App build + chạy emulator | ⬜ |
| 2 | Hilt DI inject thành công | ⬜ |
| 3 | Retrofit + OkHttp configured | ⬜ |
| 4 | Room database initialized | ⬜ |
| 5 | TokenManager (EncryptedSharedPref) | ⬜ |
| 6 | Bottom navigation 5 tabs | ⬜ |
| 7 | Login screen → API → Home | ⬜ |
| 8 | Register screen → API → Home | ⬜ |
| 9 | ForgotPassword screen → send email | ⬜ |
| 10 | Kill app → auto-login từ saved token | ⬜ |
| 11 | Home screen hiện username | ⬜ |
| 12 | Profile screen + Logout | ⬜ |
| 13 | EditProfile → save → data cập nhật | ⬜ |
| 14 | Error handling (no crash) | ⬜ |
| 15 | Test trên 2+ devices | ⬜ |

---

## 🔗 API Endpoints Cần Dùng (Tuần 1)

```
POST /api/auth/register          { email, username, password }     → { user, accessToken, refreshToken }
POST /api/auth/login             { email, password }               → { user, accessToken, refreshToken }
POST /api/auth/refresh           { refreshToken }                  → { accessToken, refreshToken }
POST /api/auth/forgot-password   { email }                         → { success, message }
GET  /api/users/me               (header: Bearer token)            → { user }
PUT  /api/users/me               (header: Bearer token) + body     → { user }
```

> [!WARNING]
> **Lưu ý cho Emulator:** Dùng `10.0.2.2` thay vì `localhost` cho BASE_URL khi test với backend trên máy local. Khi có staging URL thì đổi sang URL staging.
