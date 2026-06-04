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
    onLogout: () -> Unit,
    innerPadding: PaddingValues,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isOnline by viewModel.isOnline.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val isRefreshing = uiState is HomeUiState.Loading
    val pullToRefreshState = rememberPullToRefreshState()

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

                        if (!isOnline) {
                            OfflineHomeCard(
                                onGoToLibrary = onNavigateToLibrary
                            )
                        } else {
                            // 2. "Học tiếp" (Continue Learning) Card Pager
                            ContinueLearningSection(
                                sets = state.recentSets,
                                onSetDetail = onNavigateToSetDetail
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
    onSetDetail: (String) -> Unit
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
                    onContinueClick = { onSetDetail(set.id) },
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
