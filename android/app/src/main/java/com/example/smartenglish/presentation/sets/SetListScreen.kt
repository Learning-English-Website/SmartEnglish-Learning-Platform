package com.example.smartenglish.presentation.sets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.Folder
import com.example.smartenglish.presentation.components.EmptyState
import com.example.smartenglish.presentation.components.ShimmerGrid

// Premium Dark Theme Colors
private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val QuizletBlue = Color(0xFF4255FF)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

enum class LibraryTabSelection {
    SET, FOLDER
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetListScreen(
    onNavigateToSetDetail: (String) -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToBrowse: () -> Unit,
    onNavigateToFolderDetail: (String) -> Unit,
    viewModel: SetListViewModel = hiltViewModel(),
    folderViewModel: FolderViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val folderState by folderViewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.onEvent(SetListEvent.Refresh)
        folderViewModel.onEvent(FolderEvent.LoadFolders)
    }

    var activeTab by remember { mutableStateOf(LibraryTabSelection.SET) }
    var showCreateSetDialog by remember { mutableStateOf(false) }
    var showCreateFolderDialog by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }
    var showDeleteFolderDialog by remember { mutableStateOf<Folder?>(null) }
    var showDeleteSetDialog by remember { mutableStateOf<FlashcardSet?>(null) }

    // Filter sets and folders based on searchQuery locally
    val filteredSets = remember(state.displayedSets, searchQuery) {
        if (searchQuery.isBlank()) state.displayedSets
        else state.displayedSets.filter {
            it.title.contains(searchQuery, ignoreCase = true) ||
                    it.description?.contains(searchQuery, ignoreCase = true) == true
        }
    }

    val filteredFolders = remember(folderState.folders, searchQuery) {
        if (searchQuery.isBlank()) folderState.folders
        else folderState.folders.filter {
            it.name.contains(searchQuery, ignoreCase = true)
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
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // 1. HEADER (Thư viện + Plus Button)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Thư viện",
                    color = Color.White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = {
                        if (activeTab == LibraryTabSelection.SET) {
                            showCreateSetDialog = true
                        } else {
                            showCreateFolderDialog = true
                        }
                    },
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color.White.copy(alpha = 0.08f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Create new",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 2. HORIZONTAL CHIPS ROW (Học phần / Thư mục)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Học phần chip
                val setTabSelected = activeTab == LibraryTabSelection.SET
                Box(
                    modifier = Modifier
                        .background(
                            color = if (setTabSelected) Color.White else Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(50.dp)
                        )
                        .clickable { activeTab = LibraryTabSelection.SET }
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "Học phần",
                        color = if (setTabSelected) DeepDarkNavy else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }

                // Thư mục chip
                val folderTabSelected = activeTab == LibraryTabSelection.FOLDER
                Box(
                    modifier = Modifier
                        .background(
                            color = if (folderTabSelected) Color.White else Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(50.dp)
                        )
                        .clickable { activeTab = LibraryTabSelection.FOLDER }
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "Thư mục",
                        color = if (folderTabSelected) DeepDarkNavy else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. DROPDOWN CHIP "Tất cả" & SEARCH BAR
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Dropdown category
                Row(
                    modifier = Modifier
                        .background(Color.White.copy(alpha = 0.08f), shape = RoundedCornerShape(50.dp))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Tất cả",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowDropDown,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // Translucent Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = {
                        Text(
                            text = "Tìm kiếm",
                            color = TextWhite.copy(alpha = 0.5f),
                            fontSize = 14.sp
                        )
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = TextWhite.copy(alpha = 0.5f),
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .background(Color.White.copy(alpha = 0.08f), shape = RoundedCornerShape(50.dp)),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        cursorColor = QuizletBlue
                    ),
                    shape = RoundedCornerShape(50.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 4. LIST CONTENT
            Box(modifier = Modifier.weight(1f)) {
                if (activeTab == LibraryTabSelection.SET) {
                    if (state.isLoading && filteredSets.isEmpty()) {
                        ShimmerGrid(columns = 1, itemCount = 5)
                    } else if (filteredSets.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.LibraryBooks,
                            title = "Không tìm thấy học phần nào",
                            subtitle = "Hãy tạo học phần đầu tiên của bạn!",
                            actionLabel = "Tạo học phần",
                            onAction = { showCreateSetDialog = true }
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            items(filteredSets, key = { it.id }) { set ->
                                LibrarySetRow(
                                    set = set,
                                    onClick = { onNavigateToSetDetail(set.id) },
                                    onDelete = { showDeleteSetDialog = set }
                                )
                            }
                        }
                    }
                } else {
                    if (folderState.isLoading && filteredFolders.isEmpty()) {
                        ShimmerGrid(columns = 1, itemCount = 5)
                    } else if (filteredFolders.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.Folder,
                            title = "Không tìm thấy thư mục nào",
                            subtitle = "Hãy tạo thư mục đầu tiên để gom nhóm học phần!",
                            actionLabel = "Tạo thư mục",
                            onAction = { showCreateFolderDialog = true }
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            items(filteredFolders, key = { it.id }) { folder ->
                                LibraryFolderRow(
                                    folder = folder,
                                    onClick = { onNavigateToFolderDetail(folder.id) },
                                    onDelete = { showDeleteFolderDialog = folder }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // dialogs
    if (showCreateSetDialog) {
        CreateSetDialog(
            onDismiss = { showCreateSetDialog = false },
            onCreated = { showCreateSetDialog = false }
        )
    }

    if (showCreateFolderDialog) {
        CreateFolderDialog(
            onDismiss = { showCreateFolderDialog = false },
            onCreated = { showCreateFolderDialog = false }
        )
    }

    showDeleteFolderDialog?.let { folder ->
        AlertDialog(
            onDismissRequest = { showDeleteFolderDialog = null },
            title = { Text("Xóa thư mục", color = Color.White) },
            text = { Text("Bạn có chắc chắn muốn xóa thư mục \"${folder.name}\"? Các học phần bên trong sẽ không bị xóa.", color = Color.White.copy(alpha = 0.7f)) },
            containerColor = Color(0xFF161A3F),
            confirmButton = {
                TextButton(
                    onClick = {
                        folderViewModel.onEvent(FolderEvent.DeleteFolder(folder.id))
                        showDeleteFolderDialog = null
                    }
                ) {
                    Text("Xóa", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteFolderDialog = null }) {
                    Text("Hủy", color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    }

    showDeleteSetDialog?.let { set ->
        AlertDialog(
            onDismissRequest = { showDeleteSetDialog = null },
            title = { Text("Xóa học phần", color = Color.White) },
            text = { Text("Bạn có chắc chắn muốn xóa học phần \"${set.title}\"? Hành động này không thể hoàn tác.", color = Color.White.copy(alpha = 0.7f)) },
            containerColor = Color(0xFF161A3F),
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.onEvent(SetListEvent.DeleteSet(set.id))
                        showDeleteSetDialog = null
                    }
                ) {
                    Text("Xóa", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteSetDialog = null }) {
                    Text("Hủy", color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    }
}

@Composable
fun LibrarySetRow(
    set: FlashcardSet,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
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
                imageVector = Icons.Default.Style,
                contentDescription = null,
                tint = IconCyan,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Text details column
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

        Spacer(modifier = Modifier.width(8.dp))

        // Actions
        Box {
            IconButton(onClick = { showMenu = true }) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "Options",
                    tint = TextGray
                )
            }
            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                modifier = Modifier.background(CardBg)
            ) {
                DropdownMenuItem(
                    text = { Text("Chi tiết học phần", color = Color.White) },
                    onClick = {
                        showMenu = false
                        onClick()
                    },
                    leadingIcon = { Icon(Icons.Default.Visibility, null, tint = Color.White) }
                )
                DropdownMenuItem(
                    text = { Text("Xóa học phần", color = MaterialTheme.colorScheme.error) },
                    onClick = {
                        showMenu = false
                        onDelete()
                    },
                    leadingIcon = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) }
                )
            }
        }
    }
}

@Composable
fun LibraryFolderRow(
    folder: Folder,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon container: rounded square box with folder icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(IconBg, shape = RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Folder,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Text details column
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = folder.name,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Thư mục",
                color = TextGray,
                fontSize = 12.sp,
                fontWeight = FontWeight.Normal
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Actions
        Box {
            IconButton(onClick = { showMenu = true }) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "Options",
                    tint = TextGray
                )
            }
            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                modifier = Modifier.background(CardBg)
            ) {
                DropdownMenuItem(
                    text = { Text("Mở thư mục", color = Color.White) },
                    onClick = {
                        showMenu = false
                        onClick()
                    },
                    leadingIcon = { Icon(Icons.Default.FolderOpen, null, tint = Color.White) }
                )
                DropdownMenuItem(
                    text = { Text("Xóa thư mục", color = MaterialTheme.colorScheme.error) },
                    onClick = {
                        showMenu = false
                        onDelete()
                    },
                    leadingIcon = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) }
                )
            }
        }
    }
}
