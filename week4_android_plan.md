# :chart_with_upwards_trend: WEEK 4: ANALYTICS + NOTIFICATIONS + LEADERBOARD

> **Tech Stack:** Kotlin + Jetpack Compose + Hilt + Retrofit + WorkManager
> **Architecture:** MVVM + Clean Architecture
> **Backend:** Node.js + Express + MongoDB
> **Muc tiêu:** Analytics charts, Notification reminders, Leaderboard

---

## :notebook: Ghi chu quan trong

- **Charts**: Thien Vico (Compose-native, MIT license)
- **Notifications**: WorkManager (local notifications)
- **Leaderboard**: Backend co API tai `/api/leaderboard`
- **Backend**: Can them Analytics API endpoints

---

## :wrench: Dependencies can them

### Android (build.gradle.kts)
```kotlin
// Vico Charts (Compose-native)
implementation("com.patrykandpatrick.vico:compose-m3:1.13.1")
implementation("com.patrykandpatrick.vico:core:1.13.1")
implementation("com.patrykandpatrick.vico:compose:1.13.1")
implementation("com.patrykandpatrick.vico:chart:1.13.1")
implementation("com.patrykandpatrick.vico:axes:1.13.1")
implementation("com.patrykandpatrick.vico:lines:1.13.1")

// WorkManager
implementation("androidx.hilt:hilt-work:1.2.0")
implementation("androidx.work:work-runtime-ktx:2.9.0")
```

---

## :art: Quizlet Color Palette

```kotlin
val QuizletBlue = Color(0xFF4255FF)
val QuizletCoral = Color(0xFFFF6B6B)
val QuizletGreen = Color(0xFF00C853)
val QuizletYellow = Color(0xFFFFD93D)
```

---

## :star: THU TU UU TIEN — Lam theo thu tu nay

| # | Task | Kho |
|---|------|-----|
| 1 | Leaderboard Screen | Dễ |
| 2 | Leaderboard Backend API | Dễ |
| 3 | Analytics Charts | Trung bình |
| 4 | Analytics Backend API | Trung bình |
| 5 | Notification System (WorkManager) | Khó |
| 6 | Settings Screen | Trung bình |

---

## :calendar: TASK 1 — Leaderboard Screen (DỄ NHẤT)

### Muc tieu
Leaderboard screen hien thi xep hang nguoi dung theo XP.

#### LeaderboardDto

```kotlin
// data/remote/dto/LeaderboardDto.kt
@JsonClass(generateAdapter = true)
data class LeaderboardEntryDto(
    @Json(name = "rank") val rank: Int,
    @Json(name = "userId") val userId: String,
    @Json(name = "username") val username: String,
    @Json(name = "avatar") val avatar: String?,
    @Json(name = "xp") val xp: Int,
    @Json(name = "level") val level: Int,
    @Json(name = "streak") val streak: Int,
    @Json(name = "isCurrentUser") val isCurrentUser: Boolean
)
```

#### LeaderboardApi

```kotlin
// data/remote/api/LeaderboardApi.kt
interface LeaderboardApi {
    @GET("leaderboard")
    suspend fun getLeaderboard(
        @Query("period") period: String = "all",
        @Query("limit") limit: Int = 20
    ): ApiResponse<List<LeaderboardEntryDto>>
}
```

#### LeaderboardRepository

```kotlin
// data/repository/LeaderboardRepository.kt
interface LeaderboardRepository {
    suspend fun getLeaderboard(period: String): List<LeaderboardEntryDto>
}
class LeaderboardRepositoryImpl @Inject constructor(
    private val leaderboardApi: LeaderboardApi
) : LeaderboardRepository {
    override suspend fun getLeaderboard(period: String) = leaderboardApi.getLeaderboard(period).data
}
```

#### LeaderboardViewModel

```kotlin
// presentation/leaderboard/LeaderboardViewModel.kt
@HiltViewModel
class LeaderboardViewModel @Inject constructor(
    private val leaderboardRepository: LeaderboardRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(LeaderboardUiState())
    val uiState: StateFlow<LeaderboardUiState> = _uiState.asStateFlow()

    init { loadLeaderboard() }

    fun loadLeaderboard(period: String = "all") {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val entries = leaderboardRepository.getLeaderboard(period)
                _uiState.value = LeaderboardUiState(entries = entries, currentPeriod = period, isLoading = false)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }
}

data class LeaderboardUiState(
    val entries: List<LeaderboardEntryDto> = emptyList(),
    val currentPeriod: String = "all",
    val isLoading: Boolean = true,
    val error: String? = null
)
```

#### LeaderboardScreen

```kotlin
// presentation/leaderboard/LeaderboardScreen.kt
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    onNavigateBack: () -> Unit,
    viewModel: LeaderboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val periods = listOf("weekly" to "Weekly", "monthly" to "Monthly", "all" to "All-time")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Leaderboard", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") }
                }
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            ScrollableTabRow(
                selectedTabIndex = periods.indexOfFirst { it.first == uiState.currentPeriod },
                modifier = Modifier.fillMaxWidth(), edgePadding = 16.dp
            ) {
                periods.forEach { (key, label) ->
                    Tab(selected = uiState.currentPeriod == key, onClick = { viewModel.loadLeaderboard(key) }, text = { Text(label) })
                }
            }

            when {
                uiState.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                uiState.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(uiState.error!!, color = MaterialTheme.colorScheme.error) }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (uiState.entries.size >= 3) {
                        item { PodiumSection(entries = uiState.entries.take(3)); Spacer(Modifier.height(16.dp)) }
                    }
                    items(uiState.entries.drop(3)) { entry -> LeaderboardRow(entry = entry) }
                }
            }
        }
    }
}

@Composable
fun PodiumSection(entries: List<LeaderboardEntryDto>) {
    Row(Modifier.fillMaxWidth().height(200.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
        if (entries.size > 1) PodiumItem(entries[1], 140.dp, "🥈")
        PodiumItem(entries[0], 180.dp, "🥇")
        if (entries.size > 2) PodiumItem(entries[2], 100.dp, "🥉")
    }
}

@Composable
fun PodiumItem(entry: LeaderboardEntryDto, height: Dp, medal: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(medal, style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(4.dp))
        Text(entry.username, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, maxLines = 1)
        Text("${entry.xp} XP", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        Surface(Modifier.width(80.dp).height(height),
            color = when (medal) { "🥇" -> Color(0xFFFFD700).copy(alpha = 0.2f); "🥈" -> Color(0xFFC0C0C0).copy(alpha = 0.2f); else -> Color(0xFFCD7F32).copy(alpha = 0.2f) },
            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("#${entry.rank}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
                    color = when (medal) { "🥇" -> Color(0xFFFFD700); "🥈" -> Color(0xFFC0C0C0); else -> Color(0xFFCD7F32) })
            }
        }
    }
}

@Composable
fun LeaderboardRow(entry: LeaderboardEntryDto) {
    Card(modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = if (entry.isCurrentUser) QuizletBlue.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface)
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("#${entry.rank}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.width(40.dp))

            AsyncImage(model = entry.avatar ?: Icons.Default.Person, contentDescription = null,
                modifier = Modifier.size(40.dp).clip(CircleShape), contentScale = ContentScale.Crop)

            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(entry.username, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text("Level ${entry.level}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${entry.xp}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = QuizletBlue)
                Text("XP", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
```

### Deliverable
Leaderboard screen voi podium top 3, danh sach, loc Weekly/Monthly/All-time.

---

## :calendar: TASK 2 — Leaderboard Backend API

### Muc tieu
Backend tra ve danh sach xep hang.

#### Leaderboard Controller

```javascript
// server/src/modules/leaderboard/leaderboard.controller.js (NEW)
const User = require('../../models/user.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');

const getLeaderboard = async (req, res) => {
    const period = req.query.period || 'all';
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user._id;

    let dateFilter = {};
    if (period === 'weekly') {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { updatedAt: { $gte: weekAgo } };
    } else if (period === 'monthly') {
        const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { updatedAt: { $gte: monthAgo } };
    }

    const leaders = await User.find({ ...dateFilter, role: 'user' })
        .select('username email avatar gamification streak')
        .sort({ 'gamification.xp': -1 })
        .limit(limit)
        .lean();

    const ranked = leaders.map((user, idx) => ({
        rank: idx + 1,
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        xp: user.gamification?.xp || 0,
        level: user.gamification?.level || 1,
        streak: user.streak?.current || 0,
        isCurrentUser: user._id.toString() === userId.toString()
    }));

    res.json(ApiResponse.success(ranked));
};

module.exports = { getLeaderboard };
```

#### Leaderboard Routes

```javascript
// server/src/modules/leaderboard/leaderboard.routes.js (NEW)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authenticate');
const { getLeaderboard } = require('./leaderboard.controller');

router.get('/', authenticate, getLeaderboard);
module.exports = router;
```

#### Register Route

```javascript
// server/src/app.js
const leaderboardRoutes = require('./modules/leaderboard/leaderboard.routes');
app.use('/api/leaderboard', leaderboardRoutes);
```

### Deliverable
Backend tra ve leaderboard data.

---

## :calendar: TASK 3 — Analytics Charts

### Muc tieu
Analytics screen voi 3 charts: Daily Activity, Retention Rate, Accuracy.

#### AnalyticsDto

```kotlin
// data/remote/dto/AnalyticsDto.kt
@JsonClass(generateAdapter = true)
data class DailyActivityDto(@Json(name = "date") val date: String, @Json(name = "count") val count: Int)

@JsonClass(generateAdapter = true)
data class RetentionDto(@Json(name = "week") val week: String, @Json(name = "retention") val retention: Int)

@JsonClass(generateAdapter = true)
data class AccuracyStatsDto(
    @Json(name = "overall") val overall: AccuracyOverall,
    @Json(name = "recent") val recent: List<AccuracyRecent>
)

@JsonClass(generateAdapter = true)
data class AccuracyOverall(
    @Json(name = "totalCards") val totalCards: Int,
    @Json(name = "correctCount") val correctCount: Int,
    @Json(name = "accuracy") val accuracy: Int
)

@JsonClass(generateAdapter = true)
data class AccuracyRecent(@Json(name = "session") val session: Int, @Json(name = "accuracy") val accuracy: Int)
```

#### AnalyticsApi

```kotlin
// data/remote/api/AnalyticsApi.kt
interface AnalyticsApi {
    @GET("analytics/daily-activity")
    suspend fun getDailyActivity(@Query("days") days: Int = 30): ApiResponse<List<DailyActivityDto>>

    @GET("analytics/retention")
    suspend fun getRetentionRate(@Query("days") days: Int = 30): ApiResponse<List<RetentionDto>>

    @GET("analytics/accuracy")
    suspend fun getAccuracyStats(): ApiResponse<AccuracyStatsDto>
}
```

#### AnalyticsRepository

```kotlin
// data/repository/AnalyticsRepository.kt
interface AnalyticsRepository {
    suspend fun getDailyActivity(days: Int = 30): List<DailyActivityDto>
    suspend fun getRetentionRate(days: Int = 30): List<RetentionDto>
    suspend fun getAccuracyStats(): AccuracyStatsDto
}
class AnalyticsRepositoryImpl @Inject constructor(private val analyticsApi: AnalyticsApi) : AnalyticsRepository {
    override suspend fun getDailyActivity(days) = analyticsApi.getDailyActivity(days).data
    override suspend fun getRetentionRate(days) = analyticsApi.getRetentionRate(days).data
    override suspend fun getAccuracyStats() = analyticsApi.getAccuracyStats().data
}
```

#### AnalyticsViewModel

```kotlin
// presentation/analytics/AnalyticsViewModel.kt
@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init { loadAnalytics() }

    fun loadAnalytics() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val activity = analyticsRepository.getDailyActivity(30)
                val retention = analyticsRepository.getRetentionRate(30)
                val accuracy = analyticsRepository.getAccuracyStats()
                _uiState.value = AnalyticsUiState(dailyActivity = activity, retentionData = retention, accuracyStats = accuracy, isLoading = false)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }
}

data class AnalyticsUiState(
    val dailyActivity: List<DailyActivityDto> = emptyList(),
    val retentionData: List<RetentionDto> = emptyList(),
    val accuracyStats: AccuracyStatsDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)
```

#### AnalyticsScreen

```kotlin
// presentation/analytics/AnalyticsScreen.kt
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(onNavigateBack: () -> Unit, viewModel: AnalyticsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Analytics", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") } }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            uiState.error != null -> Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) { Text(uiState.error!!, color = MaterialTheme.colorScheme.error) }
            else -> Column(
                modifier = Modifier.fillMaxSize().padding(paddingValues).verticalScroll(rememberScrollState()).padding(16.dp)
            ) {
                // Overall stats
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard("📊", "${uiState.accuracyStats?.overall?.accuracy ?: 0}%", "Accuracy", Modifier.weight(1f))
                    StatCard("📚", "${uiState.accuracyStats?.overall?.totalCards ?: 0}", "Cards Studied", Modifier.weight(1f))
                }

                Spacer(Modifier.height(24.dp))

                ChartCard("Daily Activity", "Study sessions per day") {
                    DailyLineChart(data = uiState.dailyActivity.map { it.date to it.count.toFloat() })
                }

                Spacer(Modifier.height(16.dp))

                ChartCard("Retention Rate", "Accuracy per week") {
                    RetentionBarChart(data = uiState.retentionData.map { it.week to it.retention.toFloat() })
                }

                Spacer(Modifier.height(16.dp))

                ChartCard("Accuracy Trend", "Recent sessions") {
                    AccuracyLineChart(data = uiState.accuracyStats?.recent?.map { it.session.toFloat() to it.accuracy.toFloat() } ?: emptyList())
                }

                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun StatCard(emoji: String, value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(emoji, style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun ChartCard(title: String, subtitle: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
fun DailyLineChart(data: List<Pair<String, Float>>) {
    if (data.isEmpty()) { Text("No data yet", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); return }

    val entries = remember(data) { data.mapIndexed { idx, (_, v) -> floatType(idx.toFloat()) to v } }
    val chartModel = remember { ChartModelProducer() }
    LaunchedEffect(entries) { chartModel.plot { series(entries) { y = { it.second } } } }

    Chart(model = chartModel.getModel(), modifier = Modifier.fillMaxWidth().height(200.dp))
}

@Composable fun RetentionBarChart(data: List<Pair<String, Float>>) {
    if (data.isEmpty()) { Text("No data yet", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); return }

    val entries = remember(data) { data.mapIndexed { idx, (_, v) -> floatType(idx.toFloat()) to v } }
    val chartModel = remember { ChartModelProducer() }
    LaunchedEffect(entries) { chartModel.plot { series(entries) { y = { it.second } } } }

    Chart(model = chartModel.getModel(), modifier = Modifier.fillMaxWidth().height(200.dp))
}

@Composable fun AccuracyLineChart(data: List<Pair<Float, Float>>) {
    if (data.isEmpty()) { Text("No data yet", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); return }

    val chartModel = remember { ChartModelProducer() }
    LaunchedEffect(data) { chartModel.plot { series(data) { x = { it.first }; y = { it.second } } } }

    Chart(model = chartModel.getModel(), modifier = Modifier.fillMaxWidth().height(150.dp))
}

private fun floatType(value: Float) = value
```

### Deliverable
Analytics screen voi 3 charts: Daily Activity, Retention, Accuracy Trend.

---

## :calendar: TASK 4 — Analytics Backend API

### Muc tieu
Backend tra ve analytics data tu StudySession + CardProgress.

#### Analytics Controller

```javascript
// server/src/modules/analytics/analytics.controller.js (NEW)
const StudySession = require('../../models/studySession.model');
const CardProgress = require('../../models/cardProgress.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// GET /api/analytics/daily-activity?days=30
const getDailyActivity = async (req, res) => {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days);

    const sessions = await StudySession.find({
        user: userId, completedAt: { $gte: startDate }
    }).sort({ completedAt: 1 });

    const byDay = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate); d.setDate(d.getDate() + i);
        byDay[d.toISOString().split('T')[0]] = 0;
    }
    sessions.forEach(s => {
        const key = s.completedAt.toISOString().split('T')[0];
        if (byDay[key] !== undefined) byDay[key]++;
    });

    const data = Object.entries(byDay).map(([date, count]) => ({ date, count }));
    res.json(ApiResponse.success(data));
};

// GET /api/analytics/retention?days=30
const getRetentionRate = async (req, res) => {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days);

    const sessions = await StudySession.find({ user: userId, completedAt: { $gte: startDate } });
    const byWeek = {};
    sessions.forEach(s => {
        const weekStart = getWeekStart(s.completedAt);
        if (!byWeek[weekStart]) byWeek[weekStart] = { total: 0, correct: 0 };
        byWeek[weekStart].total += s.totalCards || 0;
        byWeek[weekStart].correct += s.correctCount || 0;
    });

    const data = Object.entries(byWeek).map(([week, stats]) => ({
        week, retention: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }));
    res.json(ApiResponse.success(data));
};

// GET /api/analytics/accuracy
const getAccuracyStats = async (req, res) => {
    const userId = req.user._id;
    const sessions = await StudySession.find({ user: userId }).sort({ completedAt: -1 }).limit(30);

    const overall = { totalCards: 0, correctCount: 0, accuracy: 0 };
    sessions.forEach(s => {
        overall.totalCards += s.totalCards || 0;
        overall.correctCount += s.correctCount || 0;
    });
    if (overall.totalCards > 0) overall.accuracy = Math.round((overall.correctCount / overall.totalCards) * 100);

    const recent = sessions.slice(0, 7).map((s, idx) => ({
        session: idx + 1,
        accuracy: s.totalCards > 0 ? Math.round((s.correctCount / s.totalCards) * 100) : 0
    })).reverse();

    res.json(ApiResponse.success({ overall, recent }));
};

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

module.exports = { getDailyActivity, getRetentionRate, getAccuracyStats };
```

#### Analytics Routes

```javascript
// server/src/modules/analytics/analytics.routes.js (NEW)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authenticate');
const { getDailyActivity, getRetentionRate, getAccuracyStats } = require('./analytics.controller');

router.get('/daily-activity', authenticate, getDailyActivity);
router.get('/retention', authenticate, getRetentionRate);
router.get('/accuracy', authenticate, getAccuracyStats);

module.exports = router;
```

#### Register

```javascript
// server/src/app.js
const analyticsRoutes = require('./modules/analytics/analytics.routes');
app.use('/api/analytics', analyticsRoutes);
```

### Deliverable
Backend tra ve daily activity, retention, accuracy data.

---

## :calendar: TASK 5 — Notification System (WorkManager)

### Muc tieu
Notification nhac hoc hang ngay va nhac cac tu den han.

#### WorkManager Setup

```kotlin
// Application class
@HiltAndroidApp
class SmartEnglishApp : Application(), Configuration.Provider {
    @Inject lateinit var workerFactory: HiltWorkerFactory
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()
}
```

```kotlin
// AppModule.kt
@Module @InstallIn(SingletonComponent::class)
object WorkManagerModule {
    @Provides fun provideWorkManager(@ApplicationContext context: Context): WorkManager =
        WorkManager.getInstance(context)
}
```

#### DailyReminderWorker

```kotlin
// worker/DailyReminderWorker.kt
@HiltWorker
class DailyReminderWorker @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userRepository: UserRepository,
    private val cardRepository: CardRepository
) : Worker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val user = userRepository.getMe()
            val lastStudyDate = user?.streak?.lastStudyDate
            val today = LocalDate.now().toString()

            if (lastStudyDate == today) return Result.success() // Da hoc roi

            val dueCards = cardRepository.getDueCardsCount()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(CHANNEL_ID, "Study Reminders", NotificationManager.IMPORTANCE_DEFAULT)
                .apply { description = "Daily study reminders" }
            notificationManager.createNotificationChannel(channel)

            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

            val notification = Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_agenda)
                .setContentTitle("Time to study!")
                .setContentText(if (dueCards > 0) "$dueCards cards to review today" else "Start a new study session")
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(NOTIFICATION_ID, notification)
            Result.success()
        } catch (_: Exception) { Result.failure() }
    }

    companion object {
        const val CHANNEL_ID = "study_reminders"
        const val NOTIFICATION_ID = 1001
        const val WORK_NAME = "daily_reminder"
    }
}
```

#### NotificationScheduler

```kotlin
// util/NotificationScheduler.kt
object NotificationScheduler {
    fun scheduleDaily(context: Context, hour: Int = 9, minute: Int = 0) {
        val wm = WorkManager.getInstance(context)
        wm.cancelUniqueWork(DailyReminderWorker.WORK_NAME)

        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour); set(Calendar.MINUTE, minute); set(Calendar.SECOND, 0)
            if (before(now)) add(Calendar.DAY_OF_MONTH, 1)
        }
        val initialDelay = target.timeInMillis - now.timeInMillis

        val work = PeriodicWorkRequestBuilder<DailyReminderWorker>(1, TimeUnit.DAYS)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.NOT_REQUIRED).build())
            .build()

        wm.enqueueUniquePeriodicWork(DailyReminderWorker.WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, work)
    }

    fun cancelDaily(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(DailyReminderWorker.WORK_NAME)
    }
}
```

#### Android 13+ Permission

```kotlin
// util/PermissionHelper.kt
object PermissionHelper {
    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
    }
}
```

#### AndroidManifest

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Deliverable
Notification nhac hoc hang ngay luc 9:00 AM.

---

## :calendar: TASK 6 — Settings Screen

### Muc tieu
Settings screen de cau hinh notification, daily goal, dark mode.

#### SettingsViewModel

```kotlin
// presentation/settings/SettingsViewModel.kt
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val prefs: SharedPreferences
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        _uiState.value = SettingsUiState(
            dailyReminderEnabled = prefs.getBoolean("daily_reminder", false),
            dueCardsReminderEnabled = prefs.getBoolean("due_cards_reminder", true),
            reminderHour = prefs.getInt("reminder_hour", 9),
            reminderMinute = prefs.getInt("reminder_minute", 0),
            dailyGoal = prefs.getInt("daily_goal", 10),
            darkModeEnabled = prefs.getBoolean("dark_mode", false)
        )
    }

    fun toggleDailyReminder(enabled: Boolean) {
        prefs.edit().putBoolean("daily_reminder", enabled).apply()
        _uiState.value = _uiState.value.copy(dailyReminderEnabled = enabled)
    }

    fun updateReminderTime(hour: Int, minute: Int) {
        prefs.edit().putInt("reminder_hour", hour).putInt("reminder_minute", minute).apply()
        _uiState.value = _uiState.value.copy(reminderHour = hour, reminderMinute = minute)
    }

    fun updateDailyGoal(goal: Int) {
        prefs.edit().putInt("daily_goal", goal).apply()
        _uiState.value = _uiState.value.copy(dailyGoal = goal)
    }

    fun toggleDarkMode(enabled: Boolean) {
        prefs.edit().putBoolean("dark_mode", enabled).apply()
        _uiState.value = _uiState.value.copy(darkModeEnabled = enabled)
    }

    fun toggleDueCardsReminder(enabled: Boolean) {
        prefs.edit().putBoolean("due_cards_reminder", enabled).apply()
        _uiState.value = _uiState.value.copy(dueCardsReminderEnabled = enabled)
    }
}

data class SettingsUiState(
    val dailyReminderEnabled: Boolean = false,
    val dueCardsReminderEnabled: Boolean = true,
    val reminderHour: Int = 9,
    val reminderMinute: Int = 0,
    val dailyGoal: Int = 10,
    val darkModeEnabled: Boolean = false
)
```

#### SettingsScreen

```kotlin
// presentation/settings/SettingsScreen.kt
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onNavigateBack: () -> Unit, viewModel: SettingsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        if (isGranted) { viewModel.toggleDailyReminder(true); NotificationScheduler.scheduleDaily(context) }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.Default.ArrowBack, "Back") } })
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues).verticalScroll(rememberScrollState())) {
            SettingsSection("Notifications") {
                SettingsSwitch("Daily Reminder", "Get reminded to study every day",
                    uiState.dailyReminderEnabled,
                    onCheckedChange = { enabled ->
                        if (enabled) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !PermissionHelper.hasNotificationPermission(context))
                                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            else { viewModel.toggleDailyReminder(true); NotificationScheduler.scheduleDaily(context, uiState.reminderHour, uiState.reminderMinute) }
                        } else { viewModel.toggleDailyReminder(false); NotificationScheduler.cancelDaily(context) }
                    })
                SettingsSwitch("Due Cards Reminder", "Get notified when cards are due",
                    uiState.dueCardsReminderEnabled,
                    onCheckedChange = { viewModel.toggleDueCardsReminder(it) })
            }
            HorizontalDivider()
            SettingsSection("Study") {
                SettingsSlider("Daily Goal", uiState.dailyGoal, 5f..50f, 8,
                    "${uiState.dailyGoal} cards/day",
                    onValueChange = { viewModel.updateDailyGoal(it.toInt()) })
            }
            HorizontalDivider()
            SettingsSection("App") {
                SettingsSwitch("Dark Mode", "Use dark theme",
                    uiState.darkModeEnabled,
                    onCheckedChange = { viewModel.toggleDarkMode(it) })
            }
        }
    }
}

@Composable fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = QuizletBlue, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(12.dp))
        content()
    }
}

@Composable fun SettingsSwitch(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable fun SettingsSlider(title: String, value: Int, valueRange: ClosedFloatingPointRange<Float>, steps: Int, valueLabel: String, onValueChange: (Float) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(valueLabel, style = MaterialTheme.typography.bodyMedium, color = QuizletBlue)
        }
        Slider(value = value.toFloat(), onValueChange = onValueChange, valueRange = valueRange, steps = steps)
    }
}
```

### Deliverable
Settings screen: notification prefs, daily goal, dark mode.

---

## :checklist: Week 4 Checklist

| # | Checkpoint | Status |
|---|-----------|--------|
| 1 | LeaderboardDto | :black_square_button: |
| 2 | LeaderboardApi | :black_square_button: |
| 3 | LeaderboardRepository | :black_square_button: |
| 4 | LeaderboardViewModel | :black_square_button: |
| 5 | LeaderboardScreen (podium + list + tabs) | :black_square_button: |
| 6 | Backend: Leaderboard controller + routes | :black_square_button: |
| 7 | AnalyticsDto (DailyActivity, Retention, Accuracy) | :black_square_button: |
| 8 | AnalyticsApi | :black_square_button: |
| 9 | AnalyticsRepository | :black_square_button: |
| 10 | AnalyticsViewModel | :black_square_button: |
| 11 | AnalyticsScreen (3 charts with Vico) | :black_square_button: |
| 12 | Backend: Analytics controller + routes | :black_square_button: |
| 13 | WorkManager + HiltWorkerFactory setup | :black_square_button: |
| 14 | DailyReminderWorker | :black_square_button: |
| 15 | NotificationScheduler | :black_square_button: |
| 16 | Android 13+ notification permission | :black_square_button: |
| 17 | SettingsViewModel | :black_square_button: |
| 18 | SettingsScreen | :black_square_button: |
| 19 | Integration: Home -> Analytics | :black_square_button: |
| 20 | Integration: Home -> Leaderboard | :black_square_button: |
| 21 | Integration: Profile -> Settings | :black_square_button: |

---

## :scroll: App Structure (Week 4 additions)

```
android/app/src/main/java/com/example/smartenglish/
├── presentation/
│   ├── analytics/              (NEW)
│   │   ├── AnalyticsScreen.kt
│   │   └── AnalyticsViewModel.kt
│   ├── leaderboard/           (NEW)
│   │   ├── LeaderboardScreen.kt
│   │   └── LeaderboardViewModel.kt
│   ├── settings/              (NEW)
│   │   ├── SettingsScreen.kt
│   │   └── SettingsViewModel.kt
│   └── worker/                (NEW)
│       └── DailyReminderWorker.kt
├── data/
│   ├── remote/
│   │   ├── dto/
│   │   │   ├── AnalyticsDto.kt (NEW)
│   │   │   └── LeaderboardDto.kt (NEW)
│   │   └── api/
│   │       ├── AnalyticsApi.kt (NEW)
│   │       └── LeaderboardApi.kt (NEW)
│   └── repository/
│       ├── AnalyticsRepository.kt (NEW)
│       └── LeaderboardRepository.kt (NEW)
└── util/
    ├── NotificationScheduler.kt (NEW)
    └── PermissionHelper.kt (NEW)

server/src/
├── modules/
│   ├── analytics/             (NEW)
│   │   ├── analytics.routes.js
│   │   └── analytics.controller.js
│   └── leaderboard/          (NEW)
│       ├── leaderboard.routes.js
│       └── leaderboard.controller.js
└── app.js (register new routes)
```
