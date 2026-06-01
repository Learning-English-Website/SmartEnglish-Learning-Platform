package com.example.smartenglish.presentation.sets

import com.example.smartenglish.domain.model.Flashcard
import kotlinx.coroutines.launch

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetDetailScreen(
    onNavigateBack: () -> Unit,
    onNavigateToStudy: (String) -> Unit,
    onNavigateToAddCards: (String) -> Unit,
    viewModel: SetDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showEditDialog by remember { mutableStateOf(false) }
    var showShareSheet by remember { mutableStateOf(false) }
    var showExportSheet by remember { mutableStateOf(false) }
    var showImportModal by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val setId = state.set?.id
    var cards by remember(setId) { mutableStateOf<List<Flashcard>>(emptyList()) }

    LaunchedEffect(setId) {
        if (setId != null) {
            cards = viewModel.getCardsForSet(setId)
        }
    }

    suspend fun showSnack(message: String) {
        snackbarHostState.showSnackbar(message = message, withDismissAction = true)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DeepDarkNavy, DarkBackground)
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("", color = Color.White) }, // Empty title to let header title shine
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = { showImportModal = true }) {
                            Icon(Icons.Default.CloudUpload, contentDescription = "Import", tint = Color.White)
                        }
                        IconButton(onClick = { showExportSheet = true }) {
                            Icon(Icons.Default.Download, contentDescription = "Export", tint = Color.White)
                        }
                        IconButton(onClick = { showEditDialog = true }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color.White)
                        }
                        IconButton(onClick = { showShareSheet = true }) {
                            Icon(Icons.Default.Share, contentDescription = "Share", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    )
                )
            }
        ) { paddingValues ->
            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = QuizletBlue)
                    }
                }
                state.error != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = QuizletCoral
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(text = state.error ?: "Unknown error", color = Color.White)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.refresh() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                state.set != null -> {
                    val set = state.set!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 16.dp)
                    ) {
                        // 1. TITLE (Large, White, Bold)
                        Text(
                            text = set.title,
                            color = Color.White,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 38.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // 2. CREATOR & TERM COUNT ROW
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Avatar Box with Initials
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(Color.White.copy(alpha = 0.08f), CircleShape)
                                    .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                val userName = set.userName ?: "Bạn"
                                val initials = if (userName.isNotEmpty()) userName.take(1).uppercase() else "?"
                                Text(
                                    text = initials,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            // Creator Name
                            Text(
                                text = set.userName ?: "bạn",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )

                            // Vertical Separator
                            Box(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(14.dp)
                                    .background(Color.White.copy(alpha = 0.2f))
                            )

                            // Term count
                            Text(
                                text = "${set.cardCount} thuật ngữ",
                                color = TextGray,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Normal
                            )
                        }

                        Spacer(modifier = Modifier.height(28.dp))

                        // 3. STUDY MODE OPTIONS (FOUR CARDS MATCHING THE SCREENSHOT)
                        Column(
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Card 1: Thẻ ghi nhớ (Flashcards)
                            StudyModeCard(
                                title = "Thẻ ghi nhớ",
                                icon = Icons.Default.Style,
                                iconColor = IconCyan,
                                onClick = { onNavigateToStudy(set.id) }
                            )

                            // Card 2: Học (Learn)
                            StudyModeCard(
                                title = "Học",
                                icon = Icons.Default.Autorenew,
                                iconColor = QuizletBlue,
                                onClick = { onNavigateToStudy(set.id) }
                            )

                            // Card 3: Kiểm tra (Test)
                            StudyModeCard(
                                title = "Kiểm tra",
                                icon = Icons.Default.Assignment,
                                iconColor = Color(0xFFC77DFF),
                                onClick = { onNavigateToStudy(set.id) }
                            )

                            // Card 4: Ghép thẻ (Match)
                            StudyModeCard(
                                title = "Ghép thẻ",
                                icon = Icons.Default.Dashboard,
                                iconColor = Color(0xFFFF9F1C),
                                onClick = { onNavigateToStudy(set.id) }
                            )
                        }

                        Spacer(modifier = Modifier.height(32.dp))

                        // 4. ADD/EDIT TERMS BUTTON
                        Button(
                            onClick = { onNavigateToAddCards(set.id) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(50.dp)),
                            shape = RoundedCornerShape(50.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White.copy(alpha = 0.08f)
                            )
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Thêm hoặc sửa thuật ngữ",
                                color = Color.White,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(28.dp))

                        // 5. LIST OF TERMS (CARDS) IN SET
                        Text(
                            text = "Thuật ngữ trong học phần (${cards.size})",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        if (cards.isEmpty()) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                colors = CardDefaults.cardColors(containerColor = CardBg),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text(
                                    text = "Chưa có thuật ngữ nào. Nhấn nút phía trên để bắt đầu thêm thuật ngữ!",
                                    color = TextGray,
                                    fontSize = 14.sp,
                                    modifier = Modifier.padding(20.dp),
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            cards.forEach { card ->
                                TermCardItem(card = card)
                                Spacer(modifier = Modifier.height(12.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showExportSheet && state.set != null) {
        ExportBottomSheet(
            set = state.set!!,
            cards = cards,
            onDismiss = { showExportSheet = false }
        )
    }

    if (showImportModal && state.set != null) {
        com.example.smartenglish.presentation.components.ImportModal(
            setId = state.set!!.id,
            onDismiss = { showImportModal = false },
            onImportSuccess = { importedCount ->
                scope.launch {
                    showSnack("Imported $importedCount cards")
                }
                scope.launch {
                    cards = viewModel.getCardsForSet(state.set!!.id)
                }
            }
        )
    }

    if (showEditDialog && state.set != null) {
        EditSetDialog(
            set = state.set!!,
            onDismiss = { showEditDialog = false },
            onSave = { title, description, language, isPublic ->
                viewModel.updateSet(title, description, language, isPublic, null)
                showEditDialog = false
            }
        )
    }

    if (showShareSheet && state.set != null) {
        ShareBottomSheet(
            set = state.set!!,
            shareCode = state.shareCode,
            isCreatingShare = state.isCreatingShare,
            onDismiss = { showShareSheet = false },
            onTogglePublic = { isPublic ->
                viewModel.updateSet(null, null, null, isPublic, null)
            },
            onGenerateShare = {
                viewModel.createShareCode()
            }
        )
    }
}

@Composable
private fun StudyModeCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(IconBg, shape = RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Text(
                text = title,
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun TermCardItem(card: com.example.smartenglish.domain.model.Flashcard) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = card.front,
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.08f))
            )

            Text(
                text = card.back,
                color = TextGray,
                fontSize = 15.sp,
                fontWeight = FontWeight.Normal
            )
        }
    }
}
