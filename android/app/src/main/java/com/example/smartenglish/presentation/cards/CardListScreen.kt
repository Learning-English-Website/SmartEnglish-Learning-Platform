package com.example.smartenglish.presentation.cards

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.Flashcard

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)
private val QuizletCoral = Color(0xFFFF6B6B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CardListScreen(
    onNavigateBack: () -> Unit,
    onNavigateToStudy: (String) -> Unit,
    onNavigateToEditCard: (String, String) -> Unit,
    onNavigateToAddCard: (String) -> Unit,
    viewModel: CardListViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var cardToDelete by remember { mutableStateOf<Flashcard?>(null) }
    val isDark = true

    // Dynamic colors based on system theme
    val bgColor1 = if (isDark) DeepDarkNavy else Color(0xFFF8FAFC)
    val bgColor2 = if (isDark) DarkBackground else Color(0xFFF1F5F9)
    val textColorPrimary = if (isDark) Color.White else Color(0xFF0F172A)
    val textColorSecondary = if (isDark) TextGray else Color(0xFF475569)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(bgColor1, bgColor2)
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = "Danh sách thẻ",
                            color = textColorPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = textColorPrimary
                            )
                        }
                    },
                    actions = {
                        // Rounded icon chip for Add
                        IconButton(
                            onClick = { onNavigateToAddCard(viewModel.setId) },
                            modifier = Modifier
                                .padding(end = 8.dp)
                                .size(40.dp)
                                .background(
                                    color = QuizletBlue,
                                    shape = RoundedCornerShape(12.dp)
                                )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Add Card",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = textColorPrimary,
                        navigationIconContentColor = textColorPrimary,
                        actionIconContentColor = textColorPrimary
                    )
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Search bar
                val searchBg = if (isDark) IconBg.copy(alpha = 0.5f) else Color.White
                val searchBorderFocused = QuizletBlue
                val searchBorderUnfocused = if (isDark) Color.White.copy(alpha = 0.08f) else Color.Black.copy(alpha = 0.08f)

                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = { viewModel.onEvent(CardListEvent.SearchCards(it)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    placeholder = { Text("Tìm kiếm thuật ngữ...", color = if (isDark) TextWhite.copy(alpha = 0.4f) else Color(0xFF94A3B8), fontSize = 14.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = if (isDark) IconCyan else QuizletBlue,
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    trailingIcon = {
                        if (state.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.onEvent(CardListEvent.SearchCards("")) }) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear",
                                    tint = textColorSecondary
                                )
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(24.dp), // modern pill shape
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColorPrimary,
                        unfocusedTextColor = textColorPrimary,
                        focusedBorderColor = searchBorderFocused,
                        unfocusedBorderColor = searchBorderUnfocused,
                        cursorColor = QuizletBlue,
                        focusedContainerColor = searchBg,
                        unfocusedContainerColor = searchBg
                    )
                )

                // Stats bar
                if (state.cards.isNotEmpty()) {
                    Text(
                        text = "${state.cards.size} thuật ngữ",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = textColorSecondary,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                    )
                }

                // Cards list
                if (state.cards.isEmpty() && !state.isLoading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.Style,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = textColorSecondary.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Chưa có thuật ngữ nào",
                                style = MaterialTheme.typography.titleMedium,
                                color = textColorSecondary,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(
                                onClick = { onNavigateToAddCard(viewModel.setId) },
                                colors = ButtonDefaults.textButtonColors(contentColor = QuizletBlue)
                            ) {
                                Text("Thêm thuật ngữ đầu tiên", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        itemsIndexed(state.cards, key = { _, card -> card.id }) { index, card ->
                            CardItem(
                                card = card,
                                index = index + 1,
                                onClick = { onNavigateToEditCard(viewModel.setId, card.id) },
                                onDelete = { cardToDelete = card }
                            )
                        }
                    }
                }

                // Loading indicator
                if (state.isLoading) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = QuizletBlue,
                        trackColor = QuizletBlue.copy(alpha = 0.1f)
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    cardToDelete?.let { card ->
        AlertDialog(
            onDismissRequest = { cardToDelete = null },
            title = { Text("Xóa thuật ngữ") },
            text = { Text("Bạn có chắc chắn muốn xóa thuật ngữ này không?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.onEvent(CardListEvent.DeleteCard(card.id))
                        cardToDelete = null
                    }
                ) {
                    Text("Xóa", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { cardToDelete = null }) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
fun CardItem(
    card: Flashcard,
    index: Int,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }
    val isDark = true

    // Dynamic colors
    val textColorPrimary = if (isDark) Color.White else Color(0xFF0F172A)
    val textColorSecondary = if (isDark) TextGray else Color(0xFF475569)
    val cardBgStart = if (isDark) CardBg.copy(alpha = 0.7f) else Color.White
    val cardBgEnd = if (isDark) CardBg.copy(alpha = 0.4f) else Color.White
    val cardBorderStart = if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.05f)
    val cardBorderEnd = if (isDark) Color.White.copy(alpha = 0.02f) else Color.Black.copy(alpha = 0.02f)
    val badgeBg = if (isDark) IconBg else Color(0xFFEBF2FE)
    val badgeText = if (isDark) IconCyan else QuizletBlue
    val badgeBorder = if (isDark) IconCyan.copy(alpha = 0.3f) else Color(0xFF4255FF).copy(alpha = 0.1f)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(cardBgStart, cardBgEnd)
                ),
                shape = RoundedCornerShape(20.dp)
            )
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    colors = listOf(cardBorderStart, cardBorderEnd)
                ),
                shape = RoundedCornerShape(20.dp)
            )
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Index badge
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(badgeBg, shape = RoundedCornerShape(10.dp))
                    .border(1.dp, badgeBorder, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$index",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = badgeText
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Card content
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = card.front,
                    style = MaterialTheme.typography.titleMedium,
                    color = textColorPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = card.back,
                    style = MaterialTheme.typography.bodyMedium,
                    color = textColorSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 20.sp
                )
                if (!card.pronunciation.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.VolumeUp,
                            contentDescription = null,
                            tint = if (isDark) IconCyan.copy(alpha = 0.7f) else QuizletBlue.copy(alpha = 0.7f),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = card.pronunciation,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isDark) IconCyan.copy(alpha = 0.7f) else QuizletBlue.copy(alpha = 0.7f),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Menu
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "More options",
                        tint = textColorSecondary
                    )
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Chỉnh sửa") },
                        onClick = {
                            showMenu = false
                            onClick()
                        },
                        leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Xóa", color = MaterialTheme.colorScheme.error) },
                        onClick = {
                            showMenu = false
                            onDelete()
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    )
                }
            }
        }
    }
}
