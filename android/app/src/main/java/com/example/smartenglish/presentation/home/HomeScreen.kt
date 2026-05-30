package com.example.smartenglish.presentation.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.presentation.components.StatCard

private val QuizletBlue   = Color(0xFF4255FF)
private val QuizletCoral  = Color(0xFFFF6B6B)
private val QuizletGreen  = Color(0xFF00C853)
private val QuizletYellow = Color(0xFFFFB300)
private val QuizletPurple = Color(0xFF9C27B0)

private val QuizletColors = listOf(
    Color(0xFF4255FF), Color(0xFFFF6B6B), Color(0xFF00C853),
    Color(0xFFFFB300), Color(0xFF9C27B0), Color(0xFF00BCD4),
    Color(0xFFE91E63), Color(0xFF795548)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToProfile: () -> Unit,
    onNavigateToLibrary: () -> Unit,
    onNavigateToStudy: () -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToSearch: () -> Unit,
    onNavigateToSetDetail: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isRefreshing = uiState is HomeUiState.Loading
    val pullToRefreshState = rememberPullToRefreshState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "SmartEnglish",
                        fontWeight = FontWeight.Bold,
                        color = QuizletBlue
                    )
                },
                actions = {
                    IconButton(onClick = onNavigateToSearch) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Person, contentDescription = "Profile")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.loadData() },
            state = pullToRefreshState,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = uiState) {
                is HomeUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = QuizletBlue)
                    }
                }
                is HomeUiState.Success -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        // Welcome Banner
                        WelcomeBanner(
                            username = state.user.username,
                            dueToday = state.stats.dueToday
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        // Stats 2x2
                        StatsSection(stats = state.stats)

                        Spacer(modifier = Modifier.height(16.dp))

                        // Due Today Banner — chỉ hiện khi có thẻ cần ôn
                        if (state.stats.dueToday > 0) {
                            DueTodayBanner(
                                dueCount = state.stats.dueToday,
                                onStudyClick = onNavigateToStudy
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        // Continue Learning
                        ContinueLearningSection(
                            sets = state.recentSets,
                            onSetClick = onNavigateToSetDetail,
                            onSeeAllClick = onNavigateToLibrary
                        )
                    }
                }
                is HomeUiState.Error -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.WifiOff,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.outline
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Không tải được dữ liệu",
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { viewModel.loadData() }) {
                                Text("Thử lại")
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Streak Flame Animation ─────────────────────────────────────────────────
@Composable
private fun StreakFlame(streak: Int, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "flame")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (streak > 0) 1.18f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "flameScale"
    )
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Text(
            text = "🔥",
            fontSize = 22.sp,
            modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale }
        )
    }
}

// ── Welcome Banner ─────────────────────────────────────────────────────────
@Composable
private fun WelcomeBanner(username: String, dueToday: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = QuizletBlue)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = "Hello, $username! 👋",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (dueToday > 0) "$dueToday thẻ cần ôn hôm nay!"
                       else "Bạn đã ôn đủ hôm nay! 🎉",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.9f)
            )
        }
    }
}

// ── Stats Section ──────────────────────────────────────────────────────────
@Composable
private fun StatsSection(stats: HomeStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Streak — dùng animated flame thay cho icon thường
        Card(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = QuizletCoral.copy(alpha = 0.08f)
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                StreakFlame(streak = stats.streak)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${stats.streak}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = QuizletCoral
                )
                Text(
                    text = "Ngày liên tiếp",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        StatCard(
            icon = Icons.Default.Star,
            iconTint = QuizletYellow,
            value = "${stats.xp}",
            label = "XP",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletYellow.copy(alpha = 0.08f)
        )
    }

    Spacer(modifier = Modifier.height(12.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            icon = Icons.Default.MenuBook,
            iconTint = QuizletBlue,
            value = "${stats.totalSets}",
            label = "Bộ thẻ",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletBlue.copy(alpha = 0.08f)
        )
        StatCard(
            icon = Icons.Default.CheckCircle,
            iconTint = QuizletGreen,
            value = "${stats.masteredCards}",
            label = "Đã thành thạo",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletGreen.copy(alpha = 0.08f)
        )
    }
}

// ── Due Today Banner ───────────────────────────────────────────────────────
@Composable
private fun DueTodayBanner(dueCount: Int, onStudyClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = QuizletBlue.copy(alpha = 0.10f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "📅 $dueCount thẻ cần ôn hôm nay",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = QuizletBlue
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Duy trì streak của bạn nhé!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = onStudyClick,
                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
            ) {
                Text("Ôn ngay", color = Color.White)
            }
        }
    }
}

// ── Continue Learning Section ──────────────────────────────────────────────
@Composable
private fun ContinueLearningSection(
    sets: List<com.example.smartenglish.domain.model.FlashcardSet>,
    onSetClick: (String) -> Unit,
    onSeeAllClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Tiếp tục học",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        if (sets.isNotEmpty()) {
            TextButton(onClick = onSeeAllClick) { Text("Xem tất cả") }
        }
    }

    Spacer(modifier = Modifier.height(8.dp))

    if (sets.isEmpty()) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.MenuBook,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Chưa có bộ thẻ nào",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Tạo bộ thẻ đầu tiên của bạn!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    } else {
        sets.forEach { set ->
            RecentSetItem(
                title = set.title,
                cardCount = set.cardCount,
                onClick = { onSetClick(set.id) }
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

// ── Recent Set Item ────────────────────────────────────────────────────────
@Composable
private fun RecentSetItem(title: String, cardCount: Int, onClick: () -> Unit) {
    val colorIndex = kotlin.math.abs(title.hashCode()) % QuizletColors.size
    val cardColor = QuizletColors[colorIndex]

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor.copy(alpha = 0.1f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = cardColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Style,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "$cardCount thẻ",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = cardColor.copy(alpha = 0.5f)
            )
        }
    }
}
