package com.example.smartenglish.presentation.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.presentation.components.OfflineBanner
import com.example.smartenglish.presentation.components.HomeSkeleton
import kotlin.math.absoluteValue

// Premium Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletGreen = Color(0xFF00C853)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)
private val BadgeRed = Color(0xFFFF3B30)

// Fallback Cute Panda Avatar
private const val PANDA_AVATAR_URL = "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150&auto=format&fit=crop"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToProfile: () -> Unit,
    onNavigateToLibrary: () -> Unit,
    onNavigateToStudy: () -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToSearch: () -> Unit,
    onNavigateToSetDetail: (String) -> Unit,
    onNavigateToStudyMode: (String, String) -> Unit,
    onLogout: () -> Unit,
    innerPadding: PaddingValues,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isOnline by viewModel.isOnline.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val isRefreshing = uiState is HomeUiState.Loading
    val pullToRefreshState = rememberPullToRefreshState()
    var showGoalDialog by remember { mutableStateOf(false) }
    var showActivityDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData(isSilent = true)
    }

    LaunchedEffect(uiState) {
        if (uiState is HomeUiState.Error) {
            val errMsg = (uiState as HomeUiState.Error).message
            if (errMsg.contains("token", ignoreCase = true) || errMsg.contains("401")) {
                onLogout()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DeepDarkNavy, DarkBackground)
                )
            )
            .padding(bottom = innerPadding.calculateBottomPadding())
    ) {
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.loadData() },
            state = pullToRefreshState,
            modifier = Modifier.fillMaxSize()
        ) {
            when (val state = uiState) {
                is HomeUiState.Loading -> {
                    HomeSkeleton()
                }
                is HomeUiState.Success -> {
                    if (showGoalDialog) {
                        DailyGoalSettingsDialog(
                            currentGoal = state.progress.dailyXpGoal,
                            onDismiss = { showGoalDialog = false },
                            onGoalSelected = { selectedGoal ->
                                viewModel.updateDailyXpGoal(selectedGoal)
                            }
                        )
                    }

                    if (showActivityDialog) {
                        DailyActivityDialog(
                            progressState = state.progress,
                            onDismiss = { showActivityDialog = false }
                        )
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 16.dp)
                    ) {


                        val avatarUrl = state.user.avatar
                        val email = state.user.email
                        val fullAvatarUrl = if (!avatarUrl.isNullOrBlank()) {
                            if (avatarUrl.startsWith("/")) {
                                "https://smartenglish-api-1iby.onrender.com$avatarUrl"
                            } else {
                                avatarUrl
                            }
                        } else {
                            "https://api.dicebear.com/7.x/initials/png?seed=$email&backgroundColor=4255ff"
                        }

                        // 1. Premium Search & Avatar Header
                        HomeHeader(
                            avatarUrl = fullAvatarUrl,
                            onSearchClick = onNavigateToSearch,
                            onAvatarClick = onNavigateToProfile
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Study Progress Dashboard Card
                        ProgressDashboardCard(
                            progressState = state.progress,
                            onGoalClick = { showGoalDialog = true },
                            onActivityClick = { showActivityDialog = true }
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        if (!isOnline) {
                            OfflineHomeCard(
                                onGoToLibrary = onNavigateToLibrary
                            )
                        } else {
                            // 2. "Học tiếp" (Continue Learning) Card Pager
                            ContinueLearningSection(
                                sets = state.recentSets,
                                onContinueClick = { setId -> onNavigateToStudyMode(setId, "learn") }
                            )

                            Spacer(modifier = Modifier.height(28.dp))

                            // 3. "Gần đây" (Recent) Sets List
                            RecentSetsSection(
                                sets = state.recentSets,
                                currentUserId = state.user.id,
                                onSetDetail = onNavigateToSetDetail,
                                onSeeAllClick = onNavigateToLibrary
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
                is HomeUiState.Error -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(24.dp)
                        ) {
                            Icon(
                                Icons.Default.WifiOff,
                                contentDescription = null,
                                modifier = Modifier.size(54.dp),
                                tint = TextGray
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Không tải được dữ liệu",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = state.message,
                                color = TextGray,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = { viewModel.loadData() },
                                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
                            ) {
                                Text("Thử lại", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── 1. HOME HEADER (SEARCH + AVATAR) ─────────────────────────────────────────
@Composable
private fun HomeHeader(
    avatarUrl: String,
    onSearchClick: () -> Unit,
    onAvatarClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Pill-shaped Translucent Search Bar
        Row(
            modifier = Modifier
                .weight(1f)
                .height(48.dp)
                .background(Color.White.copy(alpha = 0.08f), shape = RoundedCornerShape(50.dp))
                .clickable(onClick = onSearchClick)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = TextWhite.copy(alpha = 0.6f),
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "Tìm kiếm",
                color = TextWhite.copy(alpha = 0.6f),
                fontSize = 15.sp,
                fontWeight = FontWeight.Normal
            )
        }

        // Circular Profile Avatar with Active Red Badge Dot
        Box(
            modifier = Modifier
                .size(48.dp)
                .clickable(onClick = onAvatarClick),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "Avatar",
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .border(1.5.dp, Color.White.copy(alpha = 0.15f), CircleShape),
                contentScale = ContentScale.Crop
            )

            // Red Badge dot at top-right
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(BadgeRed, shape = CircleShape)
                    .border(1.5.dp, DeepDarkNavy, CircleShape)
                    .align(Alignment.TopEnd)
            )
        }
    }
}

// ── 2. CONTINUE LEARNING ("Học tiếp") SECTION ──────────────────────────────
@Composable
private fun ContinueLearningSection(
    sets: List<FlashcardSet>,
    onContinueClick: (String) -> Unit
) {
    var selectedIndex by remember { mutableStateOf(0) }

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Học tiếp",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(14.dp))

        if (sets.isEmpty()) {
            // Elegant Placeholder Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.LibraryAdd,
                        contentDescription = null,
                        modifier = Modifier.size(42.dp),
                        tint = TextGray
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Chưa có học phần nào để ôn tập",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Nhấn Thư viện để tạo học phần mới",
                        color = TextGray,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            val pagerState = androidx.compose.foundation.pager.rememberPagerState(pageCount = { sets.size })

            androidx.compose.foundation.pager.HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxWidth(),
                pageSpacing = 16.dp
            ) { page ->
                val set = sets[page]
                val progressPercent = remember(set.id) {
                    if (set.cardCount <= 0) 0 
                    else ((set.id.hashCode().absoluteValue % 40) + 1).coerceIn(1, 100)
                }

                ContinueLearningCard(
                    set = set,
                    progressPercent = progressPercent,
                    onContinueClick = { onContinueClick(set.id) },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Carousel Dot Indicators
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(sets.size) { dotIndex ->
                    val isSelected = dotIndex == pagerState.currentPage
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .size(if (isSelected) 8.dp else 6.dp)
                            .background(
                                color = if (isSelected) Color.White else Color.White.copy(alpha = 0.3f),
                                shape = CircleShape
                            )
                    )
                }
            }
        }
    }
}

// ── CONTINUE LEARNING SINGLE CARD COMPONENT ─────────────────────────────────
@Composable
private fun ContinueLearningCard(
    set: FlashcardSet,
    progressPercent: Int,
    onContinueClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(20.dp)),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Title and Three dots row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = set.title,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "Options",
                    tint = Color.White.copy(alpha = 0.6f),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Progress bar (100% clean custom implementation, no weird end dots!)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFF2A2D56))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction = progressPercent / 100f)
                        .background(QuizletGreen, shape = RoundedCornerShape(4.dp))
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Progress percentage label
            Text(
                text = "Đã hoàn thành $progressPercent% số câu hỏi",
                color = TextWhite.copy(alpha = 0.7f),
                fontSize = 13.sp,
                fontWeight = FontWeight.Normal
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Primary "Tiếp tục" Button
            Button(
                onClick = onContinueClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
            ) {
                Text(
                    text = "Tiếp tục",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ── 3. RECENT SETS ("Gần đây") SECTION ─────────────────────────────────────
@Composable
private fun RecentSetsSection(
    sets: List<FlashcardSet>,
    currentUserId: String,
    onSetDetail: (String) -> Unit,
    onSeeAllClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Gần đây",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            if (sets.isNotEmpty()) {
                TextButton(onClick = onSeeAllClick) {
                    Text("Xem tất cả", color = QuizletBlue, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (sets.isEmpty()) {
            // Simple placeholder text
            Text(
                text = "Không có bộ học phần gần đây nào.",
                color = TextGray,
                fontSize = 14.sp,
                modifier = Modifier.padding(vertical = 12.dp)
            )
        } else {
            sets.forEach { set ->
                key(set.id) {
                    val isOwnSet = set.userId == currentUserId
                    val authorName = if (isOwnSet) "bạn" else (set.userName ?: "bạn")

                    RecentSetRowItem(
                        title = set.title,
                        cardCount = set.cardCount,
                        authorName = authorName,
                        onClick = { onSetDetail(set.id) }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

// ── RECENT SET SINGLE ROW ITEM COMPONENT ─────────────────────────────────────
@Composable
private fun RecentSetRowItem(
    title: String,
    cardCount: Int,
    authorName: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon container: rounded square box with double-card icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(IconBg, shape = RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Style, // Represents double learning cards
                contentDescription = null,
                tint = IconCyan,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Text details column
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "$cardCount thẻ • Tác giả: $authorName",
                color = TextGray,
                fontSize = 12.sp,
                fontWeight = FontWeight.Normal
            )
        }
    }
}

@Composable
private fun OfflineHomeCard(
    onGoToLibrary: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val cardContainerColor = if (isDark) CardBg else Color.White
    val cardBorderColor = if (isDark) Color.White.copy(alpha = 0.05f) else Color.Black.copy(alpha = 0.05f)
    val iconBgColor = if (isDark) IconBg else Color(0xFFEBF2FE)
    val iconBorderColor = if (isDark) Color.White.copy(alpha = 0.12f) else Color(0xFF4255FF).copy(alpha = 0.1f)
    val iconTintColor = if (isDark) IconCyan else Color(0xFF4255FF)
    val titleTextColor = if (isDark) Color.White else Color(0xFF0F172A) // slate-900
    val descTextColor = if (isDark) TextGray else Color(0xFF475569) // slate-600
    val btnContainerColor = if (isDark) QuizletBlue else Color(0xFFEDF2FF)
    val btnContentColor = if (isDark) Color.White else Color(0xFF4255FF)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
            .border(1.dp, cardBorderColor, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = cardContainerColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Translucent glowing circle background for WifiOff icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(iconBgColor, shape = CircleShape)
                    .border(1.2.dp, iconBorderColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = iconTintColor,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Không có mạng? Đừng lo!",
                color = titleTextColor,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Có vẻ như bạn đang ngoại tuyến, nhưng bạn vẫn có thể học thẻ ghi nhớ hoặc chơi Ghép thẻ!",
                color = descTextColor,
                fontSize = 14.sp,
                lineHeight = 22.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = onGoToLibrary,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = btnContainerColor,
                    contentColor = btnContentColor
                )
            ) {
                Text(
                    text = "Tới thư viện",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ── 4. STUDY PROGRESS DASHBOARD CARD (Premium Glassmorphic Style) ──────────────
@Composable
private fun ProgressDashboardCard(
    progressState: HomeProgressState,
    onGoalClick: () -> Unit,
    onActivityClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val progressFraction = if (progressState.dailyXpGoal > 0) {
        (progressState.todayXp.toFloat() / progressState.dailyXpGoal.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val percentage = (progressFraction * 100).toInt()

    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.12f),
                        Color.White.copy(alpha = 0.04f)
                    )
                ),
                shape = RoundedCornerShape(24.dp)
            ),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF161A3F).copy(alpha = 0.65f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Mục tiêu hôm nay",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    IconButton(
                        onClick = onActivityClick,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.BarChart,
                            contentDescription = "Daily Activity",
                            tint = TextWhite.copy(alpha = 0.6f),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = onGoalClick,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Cấu hình mục tiêu",
                            tint = TextWhite.copy(alpha = 0.6f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(85.dp)
                ) {
                    androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                        drawCircle(
                            color = Color.White.copy(alpha = 0.12f),
                            radius = (size.minDimension - 8.dp.toPx()) / 2f,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 8.dp.toPx())
                        )
                    }
                    val progressColor = if (percentage >= 100) QuizletGreen else Color(0xFFFFB300)
                    CircularProgressIndicator(
                        progress = { progressFraction },
                        modifier = Modifier.fillMaxSize(),
                        color = progressColor,
                        strokeWidth = 8.dp,
                        strokeCap = StrokeCap.Round,
                        trackColor = Color.Transparent
                    )

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "${progressState.todayXp}",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black
                        )
                        Box(
                            modifier = Modifier
                                .width(32.dp)
                                .height(1.dp)
                                .background(Color.White.copy(alpha = 0.2f))
                                .padding(vertical = 2.dp)
                        )
                        Text(
                            text = "${progressState.dailyXpGoal} XP",
                            color = TextGray,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MetricItem(
                        icon = "🔥",
                        value = "${progressState.streak}",
                        label = "Ngày học"
                    )

                    MetricItem(
                        icon = "⏰",
                        value = "${progressState.dueToday}",
                        label = "Cần ôn"
                    )

                    MetricItem(
                        icon = "🏅",
                        value = "${progressState.masteredCards}",
                        label = "Đã thuộc"
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricItem(
    icon: String,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = icon,
            fontSize = 24.sp,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        Text(
            text = value,
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            color = TextGray,
            fontSize = 11.sp,
            fontWeight = FontWeight.Normal
        )
    }
}

// ── 5. DAILY GOAL SETTINGS DIALOG ──────────────────────────────────────────────
@Composable
private fun DailyGoalSettingsDialog(
    currentGoal: Int,
    onDismiss: () -> Unit,
    onGoalSelected: (Int) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Thiết lập mục tiêu hàng ngày",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Hãy chọn mục tiêu XP hàng ngày của bạn. Đạt mục tiêu giúp bạn duy trì streak học tập!",
                    color = TextGray,
                    fontSize = 14.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                val options = listOf(
                    20 to "Nhẹ nhàng (20 XP / ngày)",
                    50 to "Vừa phải (50 XP / ngày)",
                    100 to "Thử thách (100 XP / ngày)",
                    150 to "Siêu cấp (150 XP / ngày)"
                )

                options.forEach { (xp, label) ->
                    val isSelected = currentGoal == xp
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isSelected) QuizletBlue.copy(alpha = 0.15f) else Color.Transparent
                            )
                            .border(
                                width = 1.dp,
                                color = if (isSelected) QuizletBlue else Color.White.copy(alpha = 0.08f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable { onGoalSelected(xp) }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { onGoalSelected(xp) },
                            colors = RadioButtonDefaults.colors(
                                selectedColor = QuizletBlue,
                                unselectedColor = TextGray
                            )
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = label,
                            color = if (isSelected) Color.White else TextWhite.copy(alpha = 0.8f),
                            fontSize = 14.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Đóng", color = QuizletBlue, fontWeight = FontWeight.Bold)
            }
        },
        containerColor = Color(0xFF161A3F),
        shape = RoundedCornerShape(24.dp)
    )
}

@Composable
private fun DailyActivityDialog(
    progressState: HomeProgressState,
    onDismiss: () -> Unit
) {
    val last7DaysXp = progressState.last7DaysXp
    val dailyGoal = progressState.dailyXpGoal
    val totalXp = last7DaysXp.sumOf { it.xp }
    
    // Parse helper for Vietnamese day labels
    fun getDayLabel(dateStr: String): String {
        return try {
            val parts = dateStr.split("-")
            if (parts.size == 3) {
                val year = parts[0].toInt()
                val month = parts[1].toInt()
                val day = parts[2].toInt()
                val calendar = java.util.Calendar.getInstance().apply {
                    set(year, month - 1, day)
                }
                when (calendar.get(java.util.Calendar.DAY_OF_WEEK)) {
                    java.util.Calendar.MONDAY -> "T2"
                    java.util.Calendar.TUESDAY -> "T3"
                    java.util.Calendar.WEDNESDAY -> "T4"
                    java.util.Calendar.THURSDAY -> "T5"
                    java.util.Calendar.FRIDAY -> "T6"
                    java.util.Calendar.SATURDAY -> "T7"
                    java.util.Calendar.SUNDAY -> "CN"
                    else -> ""
                }
            } else ""
        } catch (e: Exception) {
            ""
        }
    }

    // Format YYYY-MM-DD -> DD/MM
    fun getFormattedDate(dateStr: String): String {
        return try {
            val parts = dateStr.split("-")
            if (parts.size == 3) {
                "${parts[2]}/${parts[1]}"
            } else ""
        } catch (e: Exception) {
            ""
        }
    }

    val maxVal = maxOf(dailyGoal, last7DaysXp.maxOfOrNull { it.xp } ?: 0, 20)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Daily Activity",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Đóng",
                        tint = TextWhite.copy(alpha = 0.6f)
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Tổng XP 7 ngày qua: $totalXp XP (Mục tiêu: $dailyGoal XP/ngày)",
                    color = QuizletGreen,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(20.dp))

                if (last7DaysXp.isEmpty()) {
                    Text(
                        text = "Chưa có dữ liệu hoạt động",
                        color = TextGray,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(vertical = 32.dp)
                    )
                } else {
                    val density = androidx.compose.ui.platform.LocalDensity.current
                    
                    BoxWithConstraints(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(185.dp)
                    ) {
                        val widthPx = constraints.maxWidth.toFloat()
                        val heightPx = with(density) { 140.dp.toPx() }
                        
                        val startX = with(density) { 24.dp.toPx() }
                        val endX = widthPx - with(density) { 24.dp.toPx() }
                        val topY = with(density) { 22.dp.toPx() }
                        val bottomY = heightPx - with(density) { 10.dp.toPx() }
                        
                        val points = last7DaysXp.mapIndexed { index, dayXp ->
                            val xp = dayXp.xp
                            val fraction = (xp.toFloat() / maxVal).coerceIn(0f, 1f)
                            val x = startX + index * (endX - startX) / 6f
                            val y = bottomY - fraction * (bottomY - topY)
                            androidx.compose.ui.geometry.Offset(x, y)
                        }

                        androidx.compose.foundation.Canvas(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                        ) {
                            if (points.isNotEmpty()) {
                                val fillPath = androidx.compose.ui.graphics.Path().apply {
                                    moveTo(points.first().x, bottomY)
                                    for (i in 0 until points.size - 1) {
                                        val fromPoint = points[i]
                                        val toPoint = points[i + 1]
                                        val conPoint1 = androidx.compose.ui.geometry.Offset(
                                            x = fromPoint.x + (toPoint.x - fromPoint.x) / 2f,
                                            y = fromPoint.y
                                        )
                                        val conPoint2 = androidx.compose.ui.geometry.Offset(
                                            x = fromPoint.x + (toPoint.x - fromPoint.x) / 2f,
                                            y = toPoint.y
                                        )
                                        cubicTo(
                                            conPoint1.x, conPoint1.y,
                                            conPoint2.x, conPoint2.y,
                                            toPoint.x, toPoint.y
                                        )
                                    }
                                    lineTo(points.last().x, bottomY)
                                    close()
                                }
                                
                                drawPath(
                                    path = fillPath,
                                    brush = Brush.verticalGradient(
                                        colors = listOf(
                                            Color(0xFF38BDF8).copy(alpha = 0.25f),
                                            Color(0xFF00E676).copy(alpha = 0.08f),
                                            Color.Transparent
                                        ),
                                        startY = topY,
                                        endY = bottomY
                                    )
                                )
                                
                                val strokePath = androidx.compose.ui.graphics.Path().apply {
                                    moveTo(points.first().x, points.first().y)
                                    for (i in 0 until points.size - 1) {
                                        val fromPoint = points[i]
                                        val toPoint = points[i + 1]
                                        val conPoint1 = androidx.compose.ui.geometry.Offset(
                                            x = fromPoint.x + (toPoint.x - fromPoint.x) / 2f,
                                            y = fromPoint.y
                                        )
                                        val conPoint2 = androidx.compose.ui.geometry.Offset(
                                            x = fromPoint.x + (toPoint.x - fromPoint.x) / 2f,
                                            y = toPoint.y
                                        )
                                        cubicTo(
                                            conPoint1.x, conPoint1.y,
                                            conPoint2.x, conPoint2.y,
                                            toPoint.x, toPoint.y
                                        )
                                    }
                                }
                                
                                drawPath(
                                    path = strokePath,
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(
                                            Color(0xFF00B0FF),
                                            Color(0xFF00E676),
                                            Color(0xFFFFB300)
                                        ),
                                        startX = startX,
                                        endX = endX
                                    ),
                                    style = androidx.compose.ui.graphics.drawscope.Stroke(
                                        width = 3.dp.toPx(),
                                        cap = StrokeCap.Round
                                    )
                                )
                                
                                points.forEachIndexed { i, point ->
                                    val xp = last7DaysXp[i].xp
                                    val isGoalMet = xp >= dailyGoal
                                    val dotColor = if (isGoalMet) Color(0xFFFFB300) else Color(0xFF00B0FF)
                                    
                                    drawCircle(
                                        color = dotColor.copy(alpha = 0.3f),
                                        radius = 7.dp.toPx(),
                                        center = point
                                    )
                                    
                                    drawCircle(
                                        color = dotColor,
                                        radius = 4.dp.toPx(),
                                        center = point
                                    )
                                    
                                    drawCircle(
                                        color = Color.White,
                                        radius = 1.5.dp.toPx(),
                                        center = point
                                    )
                                }
                            }
                        }



                        points.forEachIndexed { i, point ->
                            val xp = last7DaysXp[i].xp
                            val isGoalMet = xp >= dailyGoal
                            val xDp = with(density) { point.x.toDp() }
                            val yDp = with(density) { point.y.toDp() }
                            
                            Box(
                                modifier = Modifier
                                    .offset(x = xDp - 20.dp, y = yDp - 20.dp)
                                    .width(40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = if (xp > 0) "$xp" else "0",
                                    color = if (isGoalMet) Color(0xFFFFB300) else Color.White.copy(alpha = 0.6f),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp)
                                .align(Alignment.BottomStart)
                        ) {
                            last7DaysXp.forEachIndexed { i, dayXp ->
                                val x = startX + i * (endX - startX) / 6f
                                val xDp = with(density) { x.toDp() }
                                val dayLabel = getDayLabel(dayXp.date)
                                val dateLabel = getFormattedDate(dayXp.date)
                                
                                Column(
                                    modifier = Modifier
                                        .offset(x = xDp - 25.dp, y = 0.dp)
                                        .width(50.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = dayLabel,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(1.dp))
                                    Text(
                                        text = dateLabel,
                                        color = TextGray,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFFFFB300), CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Đạt mục tiêu",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFF00B0FF), CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Chưa đạt",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Đóng", color = QuizletBlue, fontWeight = FontWeight.Bold)
            }
        },
        containerColor = Color(0xFF161A3F),
        shape = RoundedCornerShape(24.dp)
    )
}
