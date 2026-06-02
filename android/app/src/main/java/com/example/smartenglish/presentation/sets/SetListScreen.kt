package com.example.smartenglish.presentation.sets

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.Folder
import com.example.smartenglish.presentation.components.EmptyState
import com.example.smartenglish.presentation.components.ShimmerGrid
import com.example.smartenglish.presentation.downloaded.DownloadViewModel
import com.example.smartenglish.util.TimeFormatter
import com.example.smartenglish.data.sync.SyncManager

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

enum class LibraryTabSelection {
    SET, FOLDER, DOWNLOADED
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetListScreen(
    onNavigateToSetDetail: (String) -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToBrowse: () -> Unit,
    onNavigateToFolderDetail: (String) -> Unit,
    viewModel: SetListViewModel = hiltViewModel(),
    folderViewModel: FolderViewModel = hiltViewModel(),
    downloadViewModel: DownloadViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val folderState by folderViewModel.state.collectAsState()

    val downloadedContent by downloadViewModel.downloadedContent.collectAsStateWithLifecycle()
    val totalSize by downloadViewModel.totalSize.collectAsStateWithLifecycle()
    val pendingCount by downloadViewModel.pendingCount.collectAsStateWithLifecycle()
    val isOnline by downloadViewModel.isOnline.collectAsStateWithLifecycle()
    val syncState by downloadViewModel.syncState.collectAsStateWithLifecycle()
    val lastSyncTime by downloadViewModel.lastSyncTime.collectAsStateWithLifecycle()
    val wifiOnly by downloadViewModel.wifiOnlyEnabled.collectAsStateWithLifecycle()

    var currentTime by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(30_000)
            currentTime = System.currentTimeMillis()
        }
    }

    val syncStateText = remember(syncState, lastSyncTime, currentTime) {
        when (syncState) {
            is SyncManager.SyncState.Syncing -> "Đang đồng bộ..."
            is SyncManager.SyncState.Downloading -> "Đang tải..."
            is SyncManager.SyncState.Error -> "Lỗi: ${(syncState as SyncManager.SyncState.Error).message}"
            else -> {
                if (lastSyncTime > 0) {
                    "Đã đồng bộ ${TimeFormatter.formatRelativeTime(lastSyncTime, currentTime)}"
                } else {
                    "Chưa đồng bộ"
                }
            }
        }
    }

    val context = androidx.compose.ui.platform.LocalContext.current
    val downloadedSetIds = remember(downloadedContent) { 
        downloadedContent.filter { it.contentType == "set" }.map { it.contentId }.toSet() 
    }
    val downloadedFolderIds = remember(downloadedContent) { 
        downloadedContent.filter { it.contentType == "folder" }.map { it.contentId }.toSet() 
    }

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

            // 2. HORIZONTAL CHIPS ROW (Học phần / Thư mục / Đã tải xuống)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Học phần",
                        color = if (setTabSelected) DeepDarkNavy else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        softWrap = false
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
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Thư mục",
                        color = if (folderTabSelected) DeepDarkNavy else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        softWrap = false
                    )
                }

                // Đã tải xuống chip
                val downloadedTabSelected = activeTab == LibraryTabSelection.DOWNLOADED
                Box(
                    modifier = Modifier
                        .background(
                            color = if (downloadedTabSelected) Color.White else Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(50.dp)
                        )
                        .clickable { activeTab = LibraryTabSelection.DOWNLOADED }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Đã tải xuống",
                        color = if (downloadedTabSelected) DeepDarkNavy else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }

            if (activeTab != LibraryTabSelection.DOWNLOADED) {
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
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .background(Color.White.copy(alpha = 0.08f), shape = RoundedCornerShape(50.dp)),
                        singleLine = true,
                        textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                        cursorBrush = SolidColor(QuizletBlue),
                        decorationBox = { innerTextField ->
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = null,
                                    tint = TextWhite.copy(alpha = 0.5f),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier.weight(1f),
                                    contentAlignment = Alignment.CenterStart
                                ) {
                                    if (searchQuery.isEmpty()) {
                                        Text(
                                            text = "Tìm kiếm",
                                            color = TextWhite.copy(alpha = 0.5f),
                                            fontSize = 14.sp
                                        )
                                    }
                                    innerTextField()
                                }
                            }
                        }
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))
            } else {
                Spacer(modifier = Modifier.height(16.dp))
            }

            // 4. LIST CONTENT
            Box(modifier = Modifier.weight(1f)) {
                when (activeTab) {
                    LibraryTabSelection.SET -> {
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
                                        onClick = {
                                            if (!isOnline && set.id !in downloadedSetIds) {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Học phần này chưa được tải xuống để học ngoại tuyến.",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            } else {
                                                onNavigateToSetDetail(set.id)
                                            }
                                        },
                                        onDelete = { showDeleteSetDialog = set }
                                    )
                                }
                            }
                        }
                    }
                    LibraryTabSelection.FOLDER -> {
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
                                        onClick = {
                                            if (!isOnline && folder.id !in downloadedFolderIds) {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Thư mục này chưa được tải xuống để học ngoại tuyến.",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            } else {
                                                onNavigateToFolderDetail(folder.id)
                                            }
                                        },
                                        onDelete = { showDeleteFolderDialog = folder }
                                    )
                                }
                            }
                        }
                    }
                    LibraryTabSelection.DOWNLOADED -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            // 1. Sleek Translucent Settings and Metadata Card
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = CardBg.copy(alpha = 0.65f))
                                ) {
                                    Column(
                                        modifier = Modifier.padding(20.dp),
                                        verticalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        // Wi-Fi Only Switch Row
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(36.dp)
                                                    .background(IconBg, shape = RoundedCornerShape(10.dp)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Wifi,
                                                    contentDescription = null,
                                                    tint = IconCyan,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Chỉ tải qua Wi-Fi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                Text("Tiết kiệm dữ liệu di động", color = TextGray, fontSize = 12.sp)
                                            }
                                            Switch(
                                                checked = wifiOnly,
                                                onCheckedChange = { downloadViewModel.setWifiOnly(it) },
                                                colors = SwitchDefaults.colors(
                                                    checkedThumbColor = Color.White,
                                                    checkedTrackColor = QuizletBlue,
                                                    uncheckedThumbColor = TextGray,
                                                    uncheckedTrackColor = Color.White.copy(alpha = 0.08f)
                                                )
                                            )
                                        }

                                        HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                                        // Storage Size Row
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(36.dp)
                                                    .background(IconBg, shape = RoundedCornerShape(10.dp)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Storage,
                                                    contentDescription = null,
                                                    tint = IconCyan,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Text("Tổng dung lượng offline", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                            Text(formatBytes(totalSize), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        }

                                        if (syncStateText.isNotEmpty()) {
                                            HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(36.dp)
                                                        .background(IconBg, shape = RoundedCornerShape(10.dp)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Sync,
                                                        contentDescription = null,
                                                        tint = QuizletBlue,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Text("Trạng thái đồng bộ", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                                Text(syncStateText, color = QuizletBlue, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            }
                                        }
                                    }
                                }
                            }

                            // 2. Downloaded List Items or EmptyState
                            if (downloadedContent.isEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        EmptyState(
                                            icon = Icons.Default.CloudDownload,
                                            title = "Chưa có nội dung tải xuống",
                                            subtitle = "Vào chi tiết học phần hoặc thư mục rồi nhấn nút tải xuống nhé!",
                                            actionLabel = "Khám phá học phần",
                                            onAction = { activeTab = LibraryTabSelection.SET }
                                        )
                                    }
                                }
                            } else {
                                items(downloadedContent, key = { it.contentId }) { item ->
                                    LibraryDownloadedRow(
                                        item = item,
                                        onClick = {
                                            if (item.contentType == "folder") {
                                                onNavigateToFolderDetail(item.contentId)
                                            } else {
                                                onNavigateToSetDetail(item.contentId)
                                            }
                                        },
                                        onRemove = {
                                            downloadViewModel.removeDownload(item.contentId, item.contentType)
                                        }
                                    )
                                }
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

@Composable
fun LibraryDownloadedRow(
    item: com.example.smartenglish.domain.model.DownloadedContent,
    onClick: () -> Unit,
    onRemove: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Xóa bản offline?", color = Color.White) },
            text = { Text("Xóa \"${item.title}\" khỏi bộ nhớ? Bạn vẫn có thể tải lại sau.", color = Color.White.copy(alpha = 0.7f)) },
            containerColor = Color(0xFF161A3F),
            confirmButton = {
                TextButton(onClick = { onRemove(); showDeleteDialog = false }) {
                    Text("Xóa", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Hủy", color = Color.White.copy(alpha = 0.7f))
                }
            }
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon container: rounded square box with double-card or folder icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(IconBg, shape = RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (item.contentType == "folder") Icons.Default.Folder else Icons.Default.Style,
                contentDescription = null,
                tint = if (item.contentType == "folder") Color.White else IconCyan,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Text details column
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            val typeText = if (item.contentType == "folder") "Thư mục" else "Học phần"
            Text(
                text = "$typeText • ${item.cardCount} thuật ngữ • ${formatBytes(item.sizeBytes)}",
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
                    text = { Text("Mở offline", color = Color.White) },
                    onClick = {
                        showMenu = false
                        onClick()
                    },
                    leadingIcon = { Icon(if (item.contentType == "folder") Icons.Default.FolderOpen else Icons.Default.Visibility, null, tint = Color.White) }
                )
                DropdownMenuItem(
                    text = { Text("Xóa bản offline", color = MaterialTheme.colorScheme.error) },
                    onClick = {
                        showMenu = false
                        showDeleteDialog = true
                    },
                    leadingIcon = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) }
                )
            }
        }
    }
}

private fun formatBytes(bytes: Long): String {
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
    }
}
