package com.example.smartenglish.presentation.sets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.example.smartenglish.domain.model.FlashcardSet

// Premium Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderDetailScreen(
    folderId: String,
    onNavigateBack: () -> Unit,
    onNavigateToSetDetail: (String) -> Unit,
    viewModel: FolderViewModel = hiltViewModel(),
    setListViewModel: SetListViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val setListState by setListViewModel.state.collectAsState()

    var showAddSetsDialog by remember { mutableStateOf(false) }
    var selectedSetsToAdd by remember { mutableStateOf(setOf<String>()) }
    var showMenuForSet by remember { mutableStateOf<FlashcardSet?>(null) }

    // Load folder details and sets
    LaunchedEffect(folderId) {
        viewModel.onEvent(FolderEvent.LoadFolderSets(folderId))
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // 1. TOP HEADER APP BAR
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        selectedSetsToAdd = emptySet()
                        showAddSetsDialog = true
                    }) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add set to folder",
                            tint = Color.White
                        )
                    }

                    IconButton(onClick = { /* Search action */ }) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Color.White
                        )
                    }

                    IconButton(onClick = { /* Menu action */ }) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "More",
                            tint = Color.White
                        )
                    }
                }
            }

            // 2. MAIN FOLDER METADATA CARD (Ảnh 4)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Large Folder Icon
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(IconBg, shape = RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(44.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Folder Title
                Text(
                    text = state.currentFolder?.name ?: "Đang tải...",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 3. HORIZONTAL CATEGORIES ROW
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // "Tất cả" chip
                Box(
                    modifier = Modifier
                        .background(Color.White, shape = RoundedCornerShape(50.dp))
                        .padding(horizontal = 20.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Tất cả",
                        color = DeepDarkNavy,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                // "Buổi 1" chip
                Box(
                    modifier = Modifier
                        .background(Color.White.copy(alpha = 0.08f), shape = RoundedCornerShape(50.dp))
                        .padding(horizontal = 20.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Buổi 1",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }

                // Plus chip
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White.copy(alpha = 0.08f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add category",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. "Gần đây" Header and Sets list
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Gần đây",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        imageVector = Icons.Default.UnfoldMore,
                        contentDescription = "Sort",
                        tint = TextGray,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (state.isLoading && state.folderSets.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = QuizletBlue)
                }
            } else if (state.folderSets.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LibraryBooks,
                            contentDescription = null,
                            tint = TextGray,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Thư mục trống",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Ấn nút + ở góc trên để thêm học phần vào thư mục",
                            color = TextGray,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    items(state.folderSets, key = { it.id }) { set ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onNavigateToSetDetail(set.id) }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Rounded box style icon
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(IconBg, shape = RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Style,
                                    contentDescription = null,
                                    tint = IconCyan,
                                    modifier = Modifier.size(24.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(16.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = set.title,
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                val author = set.userName ?: "bạn"
                                Text(
                                    text = "Học phần • ${set.cardCount} thuật ngữ • Tác giả: $author",
                                    color = TextGray,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Normal
                                )
                            }

                            IconButton(onClick = { showMenuForSet = set }) {
                                Icon(
                                    imageVector = Icons.Default.MoreHoriz,
                                    contentDescription = "Options",
                                    tint = Color.White.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Set Option Dropdown menu
    showMenuForSet?.let { set ->
        AlertDialog(
            onDismissRequest = { showMenuForSet = null },
            title = { Text("Quản lý học phần", color = Color.White) },
            text = { Text("Bạn có muốn xóa học phần \"${set.title}\" ra khỏi thư mục này không?", color = Color.White.copy(alpha = 0.7f)) },
            containerColor = Color(0xFF161A3F),
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.onEvent(FolderEvent.RemoveSetFromFolder(folderId, set.id))
                        showMenuForSet = null
                    }
                ) {
                    Text("Xoá khỏi thư mục", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showMenuForSet = null }) {
                    Text("Hủy", color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    }

    // dialog to add study sets to the folder
    if (showAddSetsDialog) {
        val availableSets = setListState.mySets.filter { set ->
            state.folderSets.none { it.id == set.id }
        }

        AlertDialog(
            onDismissRequest = { showAddSetsDialog = false },
            title = { Text("Thêm học phần vào thư mục", color = Color.White) },
            containerColor = Color(0xFF161A3F),
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 350.dp)
                ) {
                    if (availableSets.isEmpty()) {
                        Text(
                            text = "Tất cả học phần của bạn đã được thêm vào thư mục này.",
                            color = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.padding(vertical = 16.dp)
                        )
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(availableSets) { set ->
                                val isChecked = selectedSetsToAdd.contains(set.id)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedSetsToAdd = if (isChecked) {
                                                selectedSetsToAdd - set.id
                                            } else {
                                                selectedSetsToAdd + set.id
                                            }
                                        }
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = isChecked,
                                        onCheckedChange = { checked ->
                                            selectedSetsToAdd = if (checked == true) {
                                                selectedSetsToAdd + set.id
                                            } else {
                                                selectedSetsToAdd - set.id
                                            }
                                        },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = QuizletBlue,
                                            uncheckedColor = Color.White.copy(alpha = 0.5f)
                                        )
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = set.title,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        selectedSetsToAdd.forEach { setId ->
                            viewModel.onEvent(FolderEvent.AddSetToFolder(folderId, setId))
                        }
                        showAddSetsDialog = false
                    },
                    enabled = selectedSetsToAdd.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Text("Lưu", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddSetsDialog = false }) {
                    Text("Đóng", color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    }
}
