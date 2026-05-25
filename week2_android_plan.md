# 📱 WEEK 2: ANDROID APP — Quizlet-Style UI

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + Room
> **Architecture:** MVVM + Clean Architecture
> **Mục tiêu:** Giao diện Quizlet-style đơn giản như Quicklet - Home, My Sets, Study, Browse

---

## 📌 Thiết kế Quizlet-Style (Quicklet)

### UI Philosophy
- **Đơn giản như Quizlet** - không cần quá phức tạp
- **Grid view** cho library (2 columns)
- **Card flip animation** cho study mode
- **Bottom navigation** đơn giản: Home | Library | Study | Profile

### Color Scheme (Quizlet-inspired)
```kotlin
private val QuizletColorScheme = lightColorScheme(
    primary = Color(0xFF4255FF),      // Quizlet Blue
    onPrimary = Color.White,
    secondary = Color(0xFFFF6B6B),   // Coral accent
    background = Color(0xFFF8F9FA),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8EAED),
    onBackground = Color(0xFF202124),
    onSurface = Color(0xFF202124),
)
```

### Font
- Primary: System default (Roboto)
- Headings: Medium weight

---

## 📆 NGÀY 1 — Bottom Navigation + Home Screen

### Tasks

- [ ] **Simplify Bottom Navigation:**
  ```kotlin
  // Screen.kt
  sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
      data object Home : Screen("home", "Home", Icons.Default.Home)
      data object Library : Screen("library", "Library", Icons.Default.LibraryBooks)
      data object Study : Screen("study", "Study", Icons.Default.School)
      data object Profile : Screen("profile", "Profile", Icons.Default.Person)
  }

  companion object {
      val bottomNavItems = listOf(Home, Library, Study, Profile)
  }
  ```

- [ ] **Update BottomNavBar:**
  - 4 tabs thay vì 5 (gộp Vocabulary + Progress)
  - Active tab highlight với Quizlet blue
  - Smooth transitions

- [ ] **Home Screen (Quizlet-style):**
  ```kotlin
  @Composable
  fun HomeScreen(
      onNavigateToProfile: () -> Unit,
      onNavigateToLibrary: () -> Unit,
      onNavigateToStudy: () -> Unit,
      viewModel: HomeViewModel = hiltViewModel()
  ) {
      Column(
          modifier = Modifier
              .fillMaxSize()
              .padding(16.dp)
      ) {
          // Welcome section
          Text("Hello, {username}!", style = MaterialTheme.typography.headlineMedium)
          Text("Ready to learn?", style = MaterialTheme.typography.bodyLarge)

          Spacer(modifier = Modifier.height(24.dp))

          // Quick stats (Quizlet-style cards)
          Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.spacedBy(12.dp)
          ) {
              StatCard("🔥", "0", "Streak", modifier = Modifier.weight(1f))
              StatCard("⭐", "0", "XP", modifier = Modifier.weight(1f))
          }

          Spacer(modifier = Modifier.height(16.dp))

          Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.spacedBy(12.dp)
          ) {
              StatCard("📚", "0", "Sets", modifier = Modifier.weight(1f))
              StatCard("✓", "0%", "Mastered", modifier = Modifier.weight(1f))
          }

          Spacer(modifier = Modifier.height(32.dp))

          // Quick actions
          Text("Continue Learning", style = MaterialTheme.typography.titleMedium)
          Spacer(modifier = Modifier.height(12.dp))

          // Recent sets (if any)
          LazyColumn {
              items(recentSets) { set ->
                  RecentSetCard(set, onClick = { onNavigateToStudy() })
              }
          }
      }
  }
  ```

- [ ] **StatCard component:**
  ```kotlin
  @Composable
  fun StatCard(emoji: String, value: String, label: String, modifier: Modifier = Modifier) {
      Card(
          modifier = modifier,
          colors = CardDefaults.cardColors(containerColor = Color.White)
      ) {
          Column(
              modifier = Modifier.padding(16.dp),
              horizontalAlignment = Alignment.CenterHorizontally
          ) {
              Text(emoji, style = MaterialTheme.typography.headlineMedium)
              Text(value, style = MaterialTheme.typography.titleLarge)
              Text(label, style = MaterialTheme.typography.bodySmall)
          }
      }
  }
  ```

### ✅ Deliverable
Bottom nav đơn giản + Home screen Quizlet-style.

---

## 📆 NGÀY 2 — Library Screen (My Sets)

### Tasks

- [ ] **Library Screen (Quizlet-style Grid):**
  ```kotlin
  @Composable
  fun LibraryScreen(
      onNavigateToSetDetail: (String) -> Unit,
      viewModel: LibraryViewModel = hiltViewModel()
  ) {
      var showCreateDialog by remember { mutableStateOf(false) }

      Scaffold(
          topBar = {
              TopAppBar(
                  title = { Text("My Library") },
                  actions = {
                      IconButton(onClick = { /* Search */ }) {
                          Icon(Icons.Default.Search, "Search")
                      }
                  }
              )
          },
          floatingActionButton = {
              FloatingActionButton(
                  onClick = { showCreateDialog = true },
                  containerColor = MaterialTheme.colorScheme.primary
              ) {
                  Icon(Icons.Default.Add, "Create Set")
              }
          }
      ) { padding ->
          Column(
              modifier = Modifier
                  .fillMaxSize()
                  .padding(padding)
          ) {
              // Search bar
              OutlinedTextField(
                  value = searchQuery,
                  onValueChange = { viewModel.search(it) },
                  modifier = Modifier
                      .fillMaxWidth()
                      .padding(horizontal = 16.dp, vertical = 8.dp),
                  placeholder = { Text("Search sets...") },
                  leadingIcon = { Icon(Icons.Default.Search, null) },
                  singleLine = true,
                  shape = RoundedCornerShape(12.dp)
              )

              if (sets.isEmpty() && !isLoading) {
                  EmptyLibraryState(onCreateClick = { showCreateDialog = true })
              } else {
                  LazyVerticalGrid(
                      columns = GridCells.Fixed(2),
                      contentPadding = PaddingValues(16.dp),
                      horizontalArrangement = Arrangement.spacedBy(12.dp),
                      verticalArrangement = Arrangement.spacedBy(12.dp)
                  ) {
                      items(sets, key = { it.id }) { set ->
                          SetCard(
                              set = set,
                              onClick = { onNavigateToSetDetail(set.id) }
                          )
                      }
                  }
              }
          }
      }
  }
  ```

- [ ] **SetCard (Quizlet-style):**
  ```kotlin
  @Composable
  fun SetCard(
      set: FlashcardSet,
      onClick: () -> Unit,
      modifier: Modifier = Modifier
  ) {
      Card(
          modifier = modifier
              .fillMaxWidth()
              .aspectRatio(0.85f)
              .clickable(onClick = onClick),
          colors = CardDefaults.cardColors(
              containerColor = getRandomSetColor(set.id) // Quizlet-style colors
          ),
          shape = RoundedCornerShape(12.dp)
      ) {
          Column(
              modifier = Modifier
                  .fillMaxSize()
                  .padding(16.dp)
          ) {
              Text(
                  text = set.title,
                  style = MaterialTheme.typography.titleMedium,
                  color = Color.White,
                  maxLines = 2,
                  overflow = TextOverflow.Ellipsis
              )
              Spacer(modifier = Modifier.weight(1f))
              Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween
              ) {
                  Text(
                      text = "${set.cardCount} cards",
                      style = MaterialTheme.typography.bodySmall,
                      color = Color.White.copy(alpha = 0.8f)
                  )
                  Text(
                      text = set.language,
                      style = MaterialTheme.typography.bodySmall,
                      color = Color.White.copy(alpha = 0.8f)
                  )
              }
          }
  }
  ```

- [ ] **CreateSetDialog (Simple):**
  ```kotlin
  @Composable
  fun CreateSetDialog(
      onDismiss: () -> Unit,
      onCreated: (String) -> Unit
  ) {
      var title by remember { mutableStateOf("") }
      var description by remember { mutableStateOf("") }
      var isLoading by remember { mutableStateOf(false) }

      AlertDialog(
          onDismissRequest = onDismiss,
          title = { Text("Create New Set") },
          text = {
              Column {
                  OutlinedTextField(
                      value = title,
                      onValueChange = { title = it },
                      label = { Text("Title") },
                      singleLine = true,
                      modifier = Modifier.fillMaxWidth()
                  )
                  Spacer(modifier = Modifier.height(8.dp))
                  OutlinedTextField(
                      value = description,
                      onValueChange = { description = it },
                      label = { Text("Description (optional)") },
                      maxLines = 3,
                      modifier = Modifier.fillMaxWidth()
                  )
              }
          },
          confirmButton = {
              TextButton(
                  onClick = { /* Create set */ },
                  enabled = title.length >= 3 && !isLoading
              ) {
                  Text("Create")
              }
          },
          dismissButton = {
              TextButton(onClick = onDismiss) {
                  Text("Cancel")
              }
          }
      )
  }
  ```

- [ ] **Empty Library State:**
  ```kotlin
  @Composable
  fun EmptyLibraryState(onCreateClick: () -> Unit) {
      Column(
          modifier = Modifier
              .fillMaxSize()
              .padding(32.dp),
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.Center
      ) {
          Text("📚", style = MaterialTheme.typography.displayLarge)
          Spacer(modifier = Modifier.height(16.dp))
          Text("No sets yet", style = MaterialTheme.typography.titleLarge)
          Text("Create your first set to start learning")
          Spacer(modifier = Modifier.height(24.dp))
          Button(onClick = onCreateClick) {
              Icon(Icons.Default.Add, null)
              Spacer(modifier = Modifier.width(8.dp))
              Text("Create Set")
          }
      }
  }
  ```

### ✅ Deliverable
Library screen với grid layout Quizlet-style + Create set dialog.

---

## 📆 NGÀY 3 — Set Detail Screen

### Tasks

- [ ] **SetDetailScreen:**
  ```kotlin
  @Composable
  fun SetDetailScreen(
      setId: String,
      onNavigateBack: () -> Unit,
      onNavigateToStudy: (String) -> Unit,
      onNavigateToCards: (String) -> Unit,
      viewModel: SetDetailViewModel = hiltViewModel()
  ) {
      val set by viewModel.set.collectAsState()
      val cards by viewModel.cards.collectAsState()

      Scaffold(
          topBar = {
              TopAppBar(
                  title = { Text(set?.title ?: "Set") },
                  navigationIcon = {
                      IconButton(onClick = onNavigateBack) {
                          Icon(Icons.Default.ArrowBack, "Back")
                      }
                  },
                  actions = {
                      IconButton(onClick = { /* Edit */ }) {
                          Icon(Icons.Default.Edit, "Edit")
                      }
                  }
              )
          }
      ) { padding ->
          Column(
              modifier = Modifier
                  .fillMaxSize()
                  .padding(padding)
          ) {
              // Set info card
              Card(
                  modifier = Modifier
                      .fillMaxWidth()
                      .padding(16.dp),
                  colors = CardDefaults.cardColors(
                      containerColor = MaterialTheme.colorScheme.primaryContainer
                  )
              ) {
                  Column(modifier = Modifier.padding(16.dp)) {
                      set?.let {
                          Text(it.title, style = MaterialTheme.typography.titleLarge)
                          if (!it.description.isNullOrEmpty()) {
                              Text(it.description, style = MaterialTheme.typography.bodyMedium)
                          }
                          Spacer(modifier = Modifier.height(8.dp))
                          Text("${it.cardCount} cards • ${it.language}")
                      }
                  }
              }

              // Study button
              Button(
                  onClick = { onNavigateToStudy(setId) },
                  modifier = Modifier
                      .fillMaxWidth()
                      .padding(horizontal = 16.dp),
                  enabled = (cards.isNotEmpty())
              ) {
                  Icon(Icons.Default.PlayArrow, null)
                  Spacer(modifier = Modifier.width(8.dp))
                  Text("Study")
              }

              Spacer(modifier = Modifier.height(16.dp))

              // Cards section header
              Row(
                  modifier = Modifier
                      .fillMaxWidth()
                      .padding(horizontal = 16.dp),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically
              ) {
                  Text("Cards", style = MaterialTheme.typography.titleMedium)
                  TextButton(onClick = { onNavigateToCards(setId) }) {
                      Text("See All")
                  }
              }

              // Cards list
              LazyColumn(
                  modifier = Modifier.fillMaxSize(),
                  contentPadding = PaddingValues(16.dp),
                  verticalArrangement = Arrangement.spacedBy(8.dp)
              ) {
                  items(cards.take(5)) { card ->
                      CardItem(card)
                  }
              }
          }
      }
  }
  ```

- [ ] **CardItem:**
  ```kotlin
  @Composable
  fun CardItem(card: Flashcard) {
      Card(
          modifier = Modifier.fillMaxWidth()
      ) {
          Row(
              modifier = Modifier
                  .fillMaxWidth()
                  .padding(16.dp),
              horizontalArrangement = Arrangement.SpaceBetween
          ) {
              Column(modifier = Modifier.weight(1f)) {
                  Text(card.front, style = MaterialTheme.typography.bodyLarge)
                  Spacer(modifier = Modifier.height(4.dp))
                  Text(
                      card.back,
                      style = MaterialTheme.typography.bodyMedium,
                      color = MaterialTheme.colorScheme.onSurfaceVariant
                  )
              }
              Icon(
                  Icons.Default.ChevronRight,
                  contentDescription = null,
                  tint = MaterialTheme.colorScheme.onSurfaceVariant
              )
          }
      }
  }
  ```

### ✅ Deliverable
Set detail screen hiển thị set info và cards list.

---

## 📆 NGÀY 4 — Study Mode (Card Flip)

### Tasks

- [ ] **StudyViewModel:**
  ```kotlin
  @HiltViewModel
  class StudyViewModel @Inject constructor(
      private val cardRepository: CardRepository,
      private val studyRepository: StudyRepository
  ) : ViewModel() {

      private val _cards = MutableStateFlow<List<Flashcard>>(emptyList())
      private val _currentIndex = MutableStateFlow(0)
      private val _isFlipped = MutableStateFlow(false)
      private val _knownCards = MutableStateFlow<Set<String>>(emptySet())
      private val _unknownCards = MutableStateFlow<Set<String>>(emptySet())

      val progress: Float get() = (_currentIndex.value.toFloat() / _cards.value.size)
      val currentCard: Flashcard? get() = _cards.value.getOrNull(_currentIndex.value)
  }
  ```

- [ ] **FlashcardStudyScreen (Quizlet-style flip):**
  ```kotlin
  @Composable
  fun FlashcardStudyScreen(
      setId: String,
      onNavigateBack: () -> Unit,
      viewModel: StudyViewModel = hiltViewModel()
  ) {
      val cards by viewModel.cards.collectAsState()
      val currentIndex by viewModel.currentIndex.collectAsState()
      val isFlipped by viewModel.isFlipped.collectAsState()
      val knownCards by viewModel.knownCards.collectAsState()
      val unknownCards by viewModel.unknownCards.collectAsState()

      if (cards.isEmpty()) {
          EmptyStudyState(onBack = onNavigateBack)
          return
      }

      Column(
          modifier = Modifier.fillMaxSize()
      ) {
          // Progress bar
          LinearProgressIndicator(
              progress = { (currentIndex.toFloat() / cards.size) },
              modifier = Modifier.fillMaxWidth()
          )

          // Card counter
          Text(
              text = "${currentIndex + 1} / ${cards.size}",
              modifier = Modifier.padding(16.dp),
              style = MaterialTheme.typography.bodyMedium
          )

          // Flashcard
          Box(
              modifier = Modifier
                  .weight(1f)
                  .fillMaxWidth()
                  .padding(16.dp),
              contentAlignment = Alignment.Center
          ) {
              FlashcardView(
                  card = cards[currentIndex],
                  isFlipped = isFlipped,
                  onFlip = { viewModel.flipCard() }
              )
          }

          // Action buttons
          Row(
              modifier = Modifier
                  .fillMaxWidth()
                  .padding(16.dp),
              horizontalArrangement = Arrangement.spacedBy(16.dp)
          ) {
              Button(
                  onClick = { viewModel.markUnknown() },
                  modifier = Modifier.weight(1f),
                  colors = ButtonDefaults.buttonColors(
                      containerColor = Color(0xFFFF6B6B)
                  )
              ) {
                  Text("Still learning")
              }
              Button(
                  onClick = { viewModel.markKnown() },
                  modifier = Modifier.weight(1f),
                  colors = ButtonDefaults.buttonColors(
                      containerColor = Color(0xFF00C853)
                  )
              ) {
                  Text("Got it!")
              }
          }
      }
  }
  ```

- [ ] **FlashcardView (Flip animation):**
  ```kotlin
  @Composable
  fun FlashcardView(
      card: Flashcard,
      isFlipped: Boolean,
      onFlip: () -> Unit
  ) {
      Card(
          modifier = Modifier
              .fillMaxWidth()
              .aspectRatio(0.7f)
              .clickable(onClick = onFlip),
          elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
          shape = RoundedCornerShape(16.dp)
      ) {
          Box(
              modifier = Modifier.fillMaxSize(),
              contentAlignment = Alignment.Center
          ) {
              AnimatedContent(
                  targetState = isFlipped,
                  transitionSpec = {
                      fadeIn(animationDurationMs = 300) + slideInHorizontally { it / 2 } togetherWith
                              fadeOut(animationDurationMs = 300) + slideOutHorizontally { -it / 2 }
                  }
              ) { flipped ->
                  Column(
                      horizontalAlignment = Alignment.CenterHorizontally,
                      verticalArrangement = Arrangement.Center,
                      modifier = Modifier.padding(24.dp)
                  ) {
                      if (!flipped) {
                          Text(
                              text = card.front,
                              style = MaterialTheme.typography.headlineMedium,
                              textAlign = TextAlign.Center
                          )
                          Spacer(modifier = Modifier.height(16.dp))
                          Text(
                              "Tap to flip",
                              style = MaterialTheme.typography.bodySmall,
                              color = MaterialTheme.colorScheme.onSurfaceVariant
                          )
                      } else {
                          Text(
                              text = card.back,
                              style = MaterialTheme.typography.headlineMedium,
                              textAlign = TextAlign.Center
                          )
                          card.example?.let {
                              Spacer(modifier = Modifier.height(16.dp))
                              Text(
                                  "Example: $it",
                                  style = MaterialTheme.typography.bodyMedium,
                                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                                  textAlign = TextAlign.Center
                              )
                          }
                      }
                  }
              }
          }
      }
  }
  ```

- [ ] **Study Results:**
  ```kotlin
  @Composable
  fun StudyResultsScreen(
      knownCount: Int,
      unknownCount: Int,
      onStudyAgain: () -> Unit,
      onBack: () -> Unit
  ) {
      Column(
          modifier = Modifier
              .fillMaxSize()
              .padding(32.dp),
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.Center
      ) {
          Text("🎉", style = MaterialTheme.typography.displayLarge)
          Spacer(modifier = Modifier.height(24.dp))
          Text("Session Complete!", style = MaterialTheme.typography.headlineMedium)

          Spacer(modifier = Modifier.height(32.dp))

          Row(
              horizontalArrangement = Arrangement.spacedBy(24.dp)
          ) {
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                  Text("$knownCount", style = MaterialTheme.typography.displaySmall, color = Color(0xFF00C853))
                  Text("Got it")
              }
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                  Text("$unknownCount", style = MaterialTheme.typography.displaySmall, color = Color(0xFFFF6B6B))
                  Text("Learning")
              }
          }

          Spacer(modifier = Modifier.height(48.dp))

          Button(onClick = onStudyAgain, modifier = Modifier.fillMaxWidth()) {
              Text("Study Again")
          }
          TextButton(onClick = onBack) {
              Text("Back to Set")
          }
      }
  }
  ```

### ✅ Deliverable
Study mode với card flip animation Quizlet-style.

---

## 📆 NGÀY 5 — Browse/Search

### Tasks

- [ ] **BrowseScreen (Quizlet-style):**
  ```kotlin
  @Composable
  fun BrowseScreen(
      onNavigateToSetDetail: (String) -> Unit,
      viewModel: BrowseViewModel = hiltViewModel()
  ) {
      Column(modifier = Modifier.fillMaxSize()) {
          // Search bar
          OutlinedTextField(
              value = searchQuery,
              onValueChange = { viewModel.search(it) },
              modifier = Modifier
                  .fillMaxWidth()
                  .padding(16.dp),
              placeholder = { Text("Search public sets...") },
              leadingIcon = { Icon(Icons.Default.Search, null) },
              shape = RoundedCornerShape(12.dp)
          )

          // Sort options
          Row(
              modifier = Modifier
                  .fillMaxWidth()
                  .padding(horizontal = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
              FilterChip("Newest", selected = sort == "newest")
              FilterChip("Most Cards", selected = sort == "mostCards")
              FilterChip("Popular", selected = sort == "popular")
          }

          Spacer(modifier = Modifier.height(8.dp))

          // Results
          if (isLoading) {
              Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                  CircularProgressIndicator()
              }
          } else if (sets.isEmpty()) {
              EmptyBrowseState()
          } else {
              LazyVerticalGrid(
                  columns = GridCells.Fixed(2),
                  contentPadding = PaddingValues(16.dp),
                  horizontalArrangement = Arrangement.spacedBy(12.dp),
                  verticalArrangement = Arrangement.spacedBy(12.dp)
              ) {
                  items(sets) { set ->
                      BrowseSetCard(set, onClick = { onNavigateToSetDetail(set.id) })
                  }
              }
          }
      }
  }
  ```

- [ ] **BrowseSetCard:**
  ```kotlin
  @Composable
  fun BrowseSetCard(set: FlashcardSet, onClick: () -> Unit) {
      Card(
          modifier = Modifier
              .fillMaxWidth()
              .aspectRatio(0.85f)
              .clickable(onClick = onClick),
          shape = RoundedCornerShape(12.dp)
      ) {
          Column(modifier = Modifier.padding(16.dp)) {
              Text(
                  set.title,
                  style = MaterialTheme.typography.titleMedium,
                  maxLines = 2
              )
              Spacer(modifier = Modifier.height(4.dp))
              set.userName?.let {
                  Text(
                      "by $it",
                      style = MaterialTheme.typography.bodySmall,
                      color = MaterialTheme.colorScheme.onSurfaceVariant
                  )
              }
              Spacer(modifier = Modifier.weight(1f))
              Row {
                  Text("${set.cardCount} cards", style = MaterialTheme.typography.bodySmall)
                  Spacer(modifier = Modifier.weight(1f))
                  Icon(Icons.Default.Star, null, modifier = Modifier.size(14.dp))
              }
          }
      }
  }
  ```

### ✅ Deliverable
Browse screen với search và filter.

---

## 📆 NGÀY 6 — Polish + Share

### Tasks

- [ ] **Share Bottom Sheet:**
  ```kotlin
  @Composable
  fun ShareBottomSheet(
      setId: String,
      onDismiss: () -> Unit
  ) {
      val shareCode by viewModel.shareCode.collectAsState()

      Column(
          modifier = Modifier.padding(24.dp),
          horizontalAlignment = Alignment.CenterHorizontally
      ) {
          Text("Share Set", style = MaterialTheme.typography.titleLarge)
          Spacer(modifier = Modifier.height(16.dp))

          if (shareCode != null) {
              Card(
                  colors = CardDefaults.cardColors(
                      containerColor = MaterialTheme.colorScheme.surfaceVariant
                  )
              ) {
                  Row(
                      modifier = Modifier.padding(16.dp),
                      verticalAlignment = Alignment.CenterVertically
                  ) {
                      Text(shareCode!!, style = MaterialTheme.typography.headlineSmall)
                      IconButton(onClick = { /* Copy */ }) {
                          Icon(Icons.Default.ContentCopy, "Copy")
                      }
                  }
              }
          } else {
              Button(onClick = { viewModel.createShareLink(setId) }) {
                  Text("Generate Share Link")
              }
          }

          Spacer(modifier = Modifier.height(16.dp))
          TextButton(onClick = onDismiss) {
              Text("Close")
          }
      }
  }
  ```

- [ ] **Polish:**
  - Loading states với shimmer
  - Error handling với retry
  - Pull to refresh
  - Empty states với illustrations

### ✅ Deliverable
Share functionality + Polish UI.

---

## 📆 NGÀY 7 — Integration + Testing

### Tasks

- [ ] **Full E2E Test:**
  - [ ] Home → Library → Create Set
  - [ ] Set Detail → Add Cards
  - [ ] Study Mode → Card Flip
  - [ ] Browse → Search Sets
  - [ ] Share Set
  - [ ] Logout

- [ ] **Cross-check:**
  - [ ] Data đồng bộ với web
  - [ ] Login → data hiển thị đúng

### ✅ Deliverable
App hoàn chỉnh, sẵn sàng deploy.

---

## 📋 Week 2 Checklist

| # | Checkpoint | Status |
|---|-----------|--------|
| 1 | Bottom Nav (4 tabs) | :white_check_mark: Done |
| 2 | Home Screen | :white_check_mark: Done (StatCards added Day 4) |
| 3 | Library Screen (Grid) | :white_check_mark: Done |
| 4 | SetCard Component | :white_check_mark: Done |
| 5 | Create Set Dialog | :white_check_mark: Done |
| 6 | Set Detail Screen | :warning: Partial (missing cards preview) |
| 7 | Card Item Component | :warning: In cards/CardListScreen |
| 8 | Study Mode | :white_check_mark: Done (polished Day 4) |
| 9 | Card Flip Animation | :white_check_mark: Done |
| 10 | Study Results | :white_check_mark: Done |
| 11 | Browse Screen | :white_check_mark: Done |
| 12 | Search/Filter | :white_check_mark: Done |
| 13 | Share Bottom Sheet | :warning: Partial (clipboard not implemented) |
| 14 | Polish UI | :warning: In progress |
| 15 | E2E Test | :black_square_button: Not done |
## 🎨 Quizlet Color Palette

```kotlin
// Primary colors
val QuizletBlue = Color(0xFF4255FF)
val QuizletCoral = Color(0xFFFF6B6B)
val QuizletGreen = Color(0xFF00C853)
val QuizletYellow = Color(0xFFFFD93D)

// Card colors for sets (random rotation)
val SetColors = listOf(
    Color(0xFF4255FF), // Blue
    Color(0xFFFF6B6B), // Coral
    Color(0xFF00C853), // Green
    Color(0xFFFFD93D), // Yellow
    Color(0xFF9C27B0), // Purple
    Color(0xFFFF9800), // Orange
    Color(0xFF00BCD4), // Cyan
    Color(0xFFE91E63), // Pink
)
```

---

## 📱 Quicklet App Structure

```
Quicklet/
├── presentation/
│   ├── home/
│   │   └── HomeScreen.kt
│   ├── library/
│   │   ├── LibraryScreen.kt
│   │   ├── LibraryViewModel.kt
│   │   ├── SetCard.kt
│   │   └── CreateSetDialog.kt
│   ├── detail/
│   │   ├── SetDetailScreen.kt
│   │   └── CardItem.kt
│   ├── study/
│   │   ├── FlashcardStudyScreen.kt
│   │   ├── FlashcardView.kt
│   │   └── StudyResultsScreen.kt
│   ├── browse/
│   │   ├── BrowseScreen.kt
│   │   └── BrowseSetCard.kt
│   └── components/
│       ├── StatCard.kt
│       └── EmptyState.kt
└── navigation/
    └── Screen.kt (4 tabs)
```

---

## 📌 Reminders

1. **Keep it simple** - chỉ cần ngang Quicklet
2. **Quizlet-style** - không cần design quá phức tạp
3. **Bottom nav** - 4 tabs: Home, Library, Study, Profile
4. **Grid layout** - Library hiển thị 2 columns
5. **Card flip** - animation mượt cho study mode
