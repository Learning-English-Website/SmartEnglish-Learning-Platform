# 📱 WEEK 2: ANDROID APP — Dev C Plan (7 Ngày)

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + Room + Navigation Compose
> **Architecture:** MVVM + Clean Architecture (data/domain/presentation)
> **Mục tiêu:** Auto-login, Flashcard Set CRUD, Browse/Search, Study Session, Share

---

## 📆 NGÀY 1 — Auto-login + Splash Screen (Carryover từ Week 1)

### Tasks
- [ ] Tạo `presentation/auth/SplashScreen.kt`:
  ```kotlin
  @Composable
  fun SplashScreen(
      onNavigateToLogin: () -> Unit,
      onNavigateToHome: () -> Unit,
      viewModel: AuthViewModel = hiltViewModel()
  ) {
      val uiState by viewModel.uiState.collectAsState()

      LaunchedEffect(Unit) {
          viewModel.checkAuthState()
      }

      LaunchedEffect(uiState) {
          when (uiState) {
              is AuthUiState.Success -> onNavigateToHome()
              is AuthUiState.Error -> onNavigateToLogin()
              else -> {} // Still loading
          }
      }

      // Show logo + loading indicator
  }
  ```
- [ ] Cập nhật `AuthViewModel.kt` - thêm `checkAuthState()`:
  ```kotlin
  fun checkAuthState() {
      viewModelScope.launch {
          _uiState.value = AuthUiState.Loading
          if (authRepository.isLoggedIn()) {
              when (val result = authRepository.getMe()) {
                  is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                  is ApiResult.Error -> {
                      authRepository.logout()
                      _uiState.value = AuthUiState.Idle
                  }
                  else -> {}
              }
          } else {
              _uiState.value = AuthUiState.Idle
          }
      }
  }
  ```
- [ ] Cập nhật `MainActivity.kt`:
  ```kotlin
  @Composable
  fun MainContent() {
      val navController = rememberNavController()
      val navBackStackEntry by navController.currentBackStackEntryAsState()
      val currentRoute = navBackStackEntry?.destination?.route

      val startDestination = Screen.Splash.route

      // ... rest of navigation setup
  }
  ```
- [ ] Thêm route trong `Screen.kt`:
  ```kotlin
  data object Splash : Screen("splash", "Splash", Icons.Default.Home)
  ```
- [ ] Cập nhật `AppNavGraph.kt`:
  ```kotlin
  composable(Screen.Splash.route) {
      SplashScreen(
          onNavigateToLogin = {
              navController.navigate(Screen.Login.route) {
                  popUpTo(Screen.Splash.route) { inclusive = true }
              }
          },
          onNavigateToHome = {
              navController.navigate(Screen.Home.route) {
                  popUpTo(Screen.Splash.route) { inclusive = true }
              }
          }
      )
  }
  ```
- [ ] **Test auto-login:**
  - [ ] Login → kill app → mở lại → vẫn logged in
  - [ ] Token hết hạn → redirect login

### ✅ Deliverable
Auto-login hoạt động. Splash screen hiển thị khi app khởi động.

---

## 📆 NGÀY 2 — Flashcard Set CRUD API Integration

### Tasks
- [ ] Tạo `data/remote/dto/FlashcardSetDto.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class FlashcardSetDto(
      val _id: String,
      val title: String,
      val description: String?,
      val language: String,
      val isPublic: Boolean,
      val cardCount: Int,
      val user: UserDto?,
      val tags: List<String>,
      val tagObjects: List<TagDto>?,
      val createdAt: String,
      val updatedAt: String
  )

  @JsonClass(generateAdapter = true)
  data class CreateSetRequest(
      val title: String,
      val description: String?,
      val language: String,
      val isPublic: Boolean,
      val tags: List<String>
  )
  ```
- [ ] Tạo `data/remote/api/FlashcardSetApi.kt`:
  ```kotlin
  interface FlashcardSetApi {
      @GET("flashcard-sets/my")
      suspend fun getMySets(): Response<ApiResponse<List<FlashcardSetDto>>>

      @GET("flashcard-sets/public")
      suspend fun getPublicSets(
          @Query("search") search: String?,
          @Query("tags") tags: String?,
          @Query("sort") sort: String?,
          @Query("page") page: Int?,
          @Query("limit") limit: Int?
      ): Response<ApiResponse<List<FlashcardSetDto>>>

      @GET("flashcard-sets/{id}")
      suspend fun getSetById(@Path("id") id: String): Response<ApiResponse<FlashcardSetDto>>

      @POST("flashcard-sets")
      suspend fun createSet(@Body body: CreateSetRequest): Response<ApiResponse<FlashcardSetDto>>

      @PUT("flashcard-sets/{id}")
      suspend fun updateSet(@Path("id") id: String, @Body body: CreateSetRequest): Response<ApiResponse<FlashcardSetDto>>

      @DELETE("flashcard-sets/{id}")
      suspend fun deleteSet(@Path("id") id: String): Response<ApiResponse<Unit>>
  }
  ```
- [ ] Tạo `domain/model/FlashcardSet.kt`:
  ```kotlin
  data class FlashcardSet(
      val id: String,
      val title: String,
      val description: String?,
      val language: String,
      val isPublic: Boolean,
      val cardCount: Int,
      val userId: String?,
      val username: String?,
      val tags: List<String>,
      val createdAt: String,
      val updatedAt: String
  )
  ```
- [ ] Tạo `domain/repository/FlashcardSetRepository.kt`:
  ```kotlin
  interface FlashcardSetRepository {
      suspend fun getMySets(): ApiResult<List<FlashcardSet>>
      suspend fun getPublicSets(search: String?, tags: List<String>?, sort: String?, page: Int?): ApiResult<List<FlashcardSet>>
      suspend fun getSetById(id: String): ApiResult<FlashcardSet>
      suspend fun createSet(title: String, description: String?, language: String, isPublic: Boolean, tags: List<String>): ApiResult<FlashcardSet>
      suspend fun updateSet(id: String, title: String, description: String?, language: String, isPublic: Boolean, tags: List<String>): ApiResult<FlashcardSet>
      suspend fun deleteSet(id: String): ApiResult<Unit>
  }
  ```
- [ ] Tạo `data/repository/FlashcardSetRepositoryImpl.kt`
- [ ] Tạo Use Cases:
  - `GetMySetsUseCase.kt`
  - `GetPublicSetsUseCase.kt`
  - `CreateSetUseCase.kt`
  - `UpdateSetUseCase.kt`
  - `DeleteSetUseCase.kt`
- [ ] Cập nhật `AppModule.kt` - thêm FlashcardSetApi provider
- [ ] **Test:**
  - [ ] Get my sets → list hiển thị đúng
  - [ ] Create set → set mới xuất hiện

### ✅ Deliverable
FlashcardSet repository + API layer hoàn chỉnh.

---

## 📆 NGÀY 3 — Vocabulary Screen + Create/Edit Set

### Tasks
- [ ] Tạo `presentation/vocabulary/VocabularyViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class VocabularyViewModel @Inject constructor(
      private val getMySetsUseCase: GetMySetsUseCase,
      private val deleteSetUseCase: DeleteSetUseCase
  ) : ViewModel() {
      private val _sets = MutableStateFlow<List<FlashcardSet>>(emptyList())
      val sets: StateFlow<List<FlashcardSet>> = _sets.asStateFlow()

      private val _uiState = MutableStateFlow<VocabularyUiState>(VocabularyUiState.Loading)
      val uiState: StateFlow<VocabularyUiState> = _uiState.asStateFlow()

      fun loadSets() { /* load from API */ }
      fun deleteSet(id: String) { /* delete + refresh */ }
  }

  sealed class VocabularyUiState {
      object Loading : VocabularyUiState()
      data class Success(val sets: List<FlashcardSet>) : VocabularyUiState()
      data class Error(val message: String) : VocabularyUiState()
  }
  ```
- [ ] Cập nhật `presentation/vocabulary/VocabularyScreen.kt`:
  - Grid layout hiển thị danh sách sets (Card component)
  - Mỗi card: title, card count, language, created date
  - Swipe to delete hoặc long press menu
  - FAB "Create New Set" button
  - Pull to refresh
  - Empty state: "Bạn chưa có flashcard set nào"
- [ ] Tạo `presentation/vocabulary/CreateSetScreen.kt`:
  - Form: title, description, language (dropdown), isPublic (switch)
  - Tag picker (chips)
  - Validation: title required, min 3 chars
  - Submit → POST /flashcard-sets → navigate to SetDetail
  - Loading state + error handling
- [ ] Tạo `presentation/vocabulary/EditSetScreen.kt`:
  - Pre-fill form với existing data
  - Save → PUT /flashcard-sets/:id
  - Delete button với confirmation dialog
- [ ] Cập nhật navigation:
  - VocabularyScreen → CreateSetScreen
  - VocabularyScreen → SetDetailScreen
- [ ] **Test:**
  - [ ] Create set → set mới xuất hiện trong danh sách
  - [ ] Edit set → thông tin cập nhật
  - [ ] Delete set → set biến mất

### ✅ Deliverable
Vocabulary screen + Create/Edit Set hoàn chỉnh.

---

## 📆 NGÀY 4 — SetDetail Screen + Flashcard CRUD

### Tasks
- [ ] Tạo `data/remote/dto/FlashcardDto.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class FlashcardDto(
      val _id: String,
      val setId: String,
      val front: String,
      val back: String,
      val pronunciation: String?,
      val example: String?,
      val note: String?,
      val collocation: String?,
      val relatedWords: List<String>?,
      val image: String?,
      val audio: String?,
      val order: Int
  )

  @JsonClass(generateAdapter = true)
  data class CreateCardRequest(
      val front: String,
      val back: String,
      val pronunciation: String?,
      val example: String?,
      val note: String?,
      val collocation: String?,
      val relatedWords: List<String>?
  )
  ```
- [ ] Tạo `data/remote/api/FlashcardApi.kt`:
  ```kotlin
  interface FlashcardApi {
      @GET("flashcards/set/{setId}")
      suspend fun getCardsBySet(@Path("setId") setId: String): Response<ApiResponse<List<FlashcardDto>>>

      @POST("flashcards/set/{setId}")
      suspend fun createCard(@Path("setId") setId: String, @Body body: CreateCardRequest): Response<ApiResponse<FlashcardDto>>

      @POST("flashcards/set/{setId}/bulk")
      suspend fun bulkCreateCards(@Path("setId") setId: String, @Body body: Map<String, Any>): Response<ApiResponse<List<FlashcardDto>>>

      @PUT("flashcards/{cardId}")
      suspend fun updateCard(@Path("cardId") cardId: String, @Body body: CreateCardRequest): Response<ApiResponse<FlashcardDto>>

      @DELETE("flashcards/{cardId}")
      suspend fun deleteCard(@Path("cardId") cardId: String): Response<ApiResponse<Unit>>
  }
  ```
- [ ] Tạo `domain/model/Flashcard.kt` + Repository + UseCases
- [ ] Tạo `presentation/vocabulary/SetDetailViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class SetDetailViewModel @Inject constructor(
      private val getSetByIdUseCase: GetSetByIdUseCase,
      private val getCardsUseCase: GetCardsUseCase,
      private val createCardUseCase: CreateCardUseCase,
      private val deleteCardUseCase: DeleteCardUseCase
  ) : ViewModel() {
      // State: set, cards, loading, error
      // Functions: loadSet, loadCards, addCard, deleteCard
  }
  ```
- [ ] Tạo `presentation/vocabulary/SetDetailScreen.kt`:
  - Header: Set title, description, card count, edit set button
  - Card list (LazyColumn)
  - Each card: front, back (expandable), edit button, delete button
  - "Add Card" FAB → inline form hoặc dialog
  - "Study" button → navigate to Study screen
- [ ] Tạo `presentation/components/CardItem.kt`:
  - Card front/back display
  - Flip animation (optional for v1)
  - Edit/Delete actions
- [ ] **Test:**
  - [ ] View set detail → cards hiển thị
  - [ ] Add card → card mới xuất hiện
  - [ ] Edit card → nội dung cập nhật
  - [ ] Delete card → card biến mất

### ✅ Deliverable
SetDetail screen hoàn chỉnh. Flashcard CRUD hoạt động.

---

## 📆 NGÀY 5 — Browse/Search + Tags

### Tasks
- [ ] Tạo `data/remote/dto/TagDto.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class TagDto(
      val _id: String,
      val name: String,
      val color: String?
  )
  ```
- [ ] Tạo `data/remote/api/TagApi.kt`:
  ```kotlin
  interface TagApi {
      @GET("tags")
      suspend fun getAllTags(): Response<ApiResponse<List<TagDto>>>

      @POST("tags")
      suspend fun createTag(@Body body: Map<String, String>): Response<ApiResponse<TagDto>>
  }
  ```
- [ ] Tạo Tag Repository + UseCases
- [ ] Tạo `presentation/browse/BrowseViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class BrowseViewModel @Inject constructor(
      private val getPublicSetsUseCase: GetPublicSetsUseCase
  ) : ViewModel() {
      private val _sets = MutableStateFlow<List<FlashcardSet>>(emptyList())
      private val _isLoading = MutableStateFlow(false)
      private val _searchQuery = MutableStateFlow("")
      private val _selectedTags = MutableStateFlow<List<String>>(emptyList())

      fun search(query: String) { _searchQuery.value = query }
      fun toggleTag(tagId: String) { /* toggle selection */ }
      fun loadSets() { /* load with filters */ }
  }
  ```
- [ ] Cập nhật `Screen.kt`:
  ```kotlin
  data object Browse : Screen("browse", "Browse", Icons.Default.Search)
  ```
- [ ] Tạo `presentation/browse/BrowseScreen.kt`:
  - Search bar (debounced)
  - Filter chips (tags)
  - Sort dropdown: newest, most cards
  - Results grid (SetCard components)
  - Pull to refresh
  - Empty state: "No sets found"
- [ ] Tạo `presentation/components/SetCard.kt`:
  ```kotlin
  @Composable
  fun SetCard(
      set: FlashcardSet,
      onClick: () -> Unit,
      onStudyClick: () -> Unit,
      modifier: Modifier = Modifier
  )
  ```
- [ ] Cập nhật `BottomNavBar.kt` - thêm Browse tab
- [ ] **Test:**
  - [ ] Search → results hiển thị
  - [ ] Filter by tag → kết quả đúng
  - [ ] Sort → thứ tự đúng

### ✅ Deliverable
Browse screen với search + filter. Tag system hoạt động.

---

## 📆 NGÀY 6 — Study Session + Share

### Tasks
- [ ] Tạo `data/remote/dto/StudySessionDto.kt`:
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class StudySessionDto(
      val _id: String,
      val setId: String,
      val userId: String,
      val startedAt: String
  )

  @JsonClass(generateAdapter = true)
  data class StudyResultDto(
      val sessionId: String,
      val totalCards: Int,
      val correctCount: Int,
      val incorrectCount: Int,
      val accuracy: Double,
      val timeSpentSeconds: Int
  )
  ```
- [ ] Tạo `data/remote/api/StudyApi.kt`:
  ```kotlin
  interface StudyApi {
      @POST("study-sessions/start")
      suspend fun startSession(@Body body: Map<String, String>): Response<ApiResponse<StudySessionDto>>

      @POST("study-sessions/{id}/answer")
      suspend fun submitAnswer(@Path("id") id: String, @Body body: Map<String, Any>): Response<ApiResponse<Unit>>

      @POST("study-sessions/{id}/complete")
      suspend fun completeSession(@Path("id") id: String): Response<ApiResponse<StudyResultDto>>
  }
  ```
- [ ] Tạo `domain/model/StudySession.kt` + Repository + UseCases
- [ ] Tạo `presentation/study/StudyViewModel.kt`:
  ```kotlin
  @HiltViewModel
  class StudyViewModel @Inject constructor(
      private val getSetByIdUseCase: GetSetByIdUseCase,
      private val startSessionUseCase: StartSessionUseCase,
      private val completeSessionUseCase: CompleteSessionUseCase
  ) : ViewModel() {
      private val _currentCardIndex = MutableStateFlow(0)
      private val _knownCards = MutableStateFlow<Set<String>>(emptySet())
      private val _unknownCards = MutableStateFlow<Set<String>>(emptySet())

      fun markKnown(cardId: String) { /* record */ }
      fun markUnknown(cardId: String) { /* record */ }
      fun finishSession() { /* complete + get result */ }
  }
  ```
- [ ] Cập nhật `presentation/study/StudyScreen.kt`:
  - Fetch cards từ set
  - Shuffle option
  - Card flip interaction (click to flip)
  - "Know" / "Don't Know" buttons
  - Session progress bar (X/Y)
  - Results summary at end
- [ ] Tạo `presentation/components/FlashcardViewer.kt`:
  - Card flip animation (AnimatedVisibility)
  - Front: word, pronunciation
  - Back: meaning, example, note
  - Click to flip
- [ ] Tạo `presentation/study/StudyResultScreen.kt`:
  - Score: "8/10 correct"
  - Time spent
  - "Study Again" / "Back to Set" buttons
- [ ] **Test:**
  - [ ] Study session → flip cards → mark known/unknown
  - [ ] Complete session → results hiển thị

### ✅ Deliverable
Study session flow hoàn chỉnh. Card flip animation mượt.

---

## 📆 NGÀY 7 — Share + Polish + Integration Test

### Tasks
- [ ] Tạo `data/remote/api/ShareApi.kt`:
  ```kotlin
  interface ShareApi {
      @POST("shares")
      suspend fun createShareLink(@Body body: Map<String, String>): Response<ApiResponse<ShareLinkDto>>

      @GET("shares/{code}")
      suspend fun getSharedSet(@Path("code") code: String): Response<ApiResponse<FlashcardSetDto>>
  }
  ```
- [ ] Tạo Share Repository + UseCases
- [ ] Cập nhật `SetDetailScreen.kt`:
  - Add "Share" button in toolbar
  - Show share dialog/sheet
- [ ] Tạo `presentation/components/ShareBottomSheet.kt`:
  ```kotlin
  @Composable
  fun ShareBottomSheet(
      setId: String,
      onDismiss: () -> Unit
  ) {
      // Generate share link
      // Copy to clipboard button
      // Share via other apps (Intent)
  }
  ```
- [ ] Tạo `presentation/sharedset/SharedSetScreen.kt`:
  - View shared set (read-only)
  - "Add to My Sets" button
  - "Study This Set" button
- [ ] Polish:
  - Loading states (CircularProgressIndicator)
  - Error handling (ErrorDialog)
  - Empty states (Illustrations)
  - Pull to refresh
- [ ] **Integration Test:**
  - [ ] Create set → add cards → edit → delete
  - [ ] Browse → search → filter → open set
  - [ ] Study session → flip cards → complete
  - [ ] Share set → copy link → view shared
  - [ ] Cross-check với Web: cùng account login → data đồng bộ

### ✅ Deliverable
Share hoàn chỉnh. App stable. Sẵn sàng cho Week 3 (Spaced Repetition).

---

## 📋 Week 2 Android Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | Splash Screen + Auto-login | ⬜ |
| 2 | FlashcardSet API layer (Repository, UseCases) | ⬜ |
| 3 | Vocabulary screen (My Sets) | ⬜ |
| 4 | Create/Edit Set screen | ⬜ |
| 5 | SetDetail screen | ⬜ |
| 6 | Flashcard CRUD (add/edit/delete cards) | ⬜ |
| 7 | Browse screen + search | ⬜ |
| 8 | Tag filter | ⬜ |
| 9 | Study session flow | ⬜ |
| 10 | FlashcardViewer (flip animation) | ⬜ |
| 11 | Study result screen | ⬜ |
| 12 | Share functionality | ⬜ |
| 13 | Loading/Error/Empty states | ⬜ |
| 14 | Pull to refresh | ⬜ |
| 15 | Integration test với Web | ⬜ |

---

## 🔗 API Endpoints Cần Dùng (Tuần 2)

```
# Flashcard Set CRUD
GET    /api/flashcard-sets/my                    → FlashcardSet[]
GET    /api/flashcard-sets/public               → FlashcardSet[]
GET    /api/flashcard-sets/:id                  → FlashcardSet
POST   /api/flashcard-sets                       → FlashcardSet
PUT    /api/flashcard-sets/:id                  → FlashcardSet
DELETE /api/flashcard-sets/:id                  → void

# Flashcard CRUD
GET    /api/flashcards/set/:setId               → Flashcard[]
POST   /api/flashcards/set/:setId                → Flashcard
POST   /api/flashcards/set/:setId/bulk          → Flashcard[]
PUT    /api/flashcards/:cardId                   → Flashcard
DELETE /api/flashcards/:cardId                  → void

# Tags
GET    /api/tags                                 → Tag[]
POST   /api/tags                                 → Tag

# Study Sessions
POST   /api/study-sessions/start                 → StudySession
POST   /api/study-sessions/:id/answer            → void
POST   /api/study-sessions/:id/complete          → StudyResult

# Share
POST   /api/shares                               → ShareLink
GET    /api/shares/:code                         → FlashcardSet
```

---

## 📌 Dependencies
- Backend APIs đã có sẵn từ Dev A
- Web frontend đã hoàn thành Week 2
- Android Week 1 infrastructure đã sẵn sàng (Hilt, Room, Retrofit)

> [!TIP]
> Test API với Postman/curl trước khi implement Android layer.
