package com.example.smartenglish.presentation.downloaded

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.smartenglish.util.TimeFormatter
import com.example.smartenglish.data.sync.SyncManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadedContentScreen(
    onNavigateBack: () -> Unit,
    viewModel: DownloadViewModel = hiltViewModel()
) {
    val downloadedContent by viewModel.downloadedContent.collectAsStateWithLifecycle()
    val totalSize by viewModel.totalSize.collectAsStateWithLifecycle()
    val pendingCount by viewModel.pendingCount.collectAsStateWithLifecycle()
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()
    val syncState by viewModel.syncState.collectAsStateWithLifecycle()
    val lastSyncTime by viewModel.lastSyncTime.collectAsStateWithLifecycle()
    val wifiOnly by viewModel.wifiOnlyEnabled.collectAsStateWithLifecycle()

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tải xuống") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại")
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
            HorizontalDivider()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Chỉ tải qua Wi-Fi", style = MaterialTheme.typography.bodyLarge)
                    Text("Tiết kiệm dữ liệu di động", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(
                    checked = wifiOnly,
                    onCheckedChange = { viewModel.setWifiOnly(it) }
                )
            }

            HorizontalDivider()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Tổng dung lượng:")
                Text(formatBytes(totalSize))
            }

            if (syncStateText.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Trạng thái:")
                    Text(syncStateText)
                }
            }

            HorizontalDivider()

            if (downloadedContent.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CloudDownload,
                            null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(16.dp))
                        Text("Chưa tải nội dung nào")
                        Text(
                            "Tải bộ thẻ để học offline",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    items(downloadedContent, key = { it.contentId }) { item ->
                        DownloadedItemRow(
                            item = item,
                            onRemove = { viewModel.removeDownload(item.contentId, item.contentType) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DownloadedItemRow(
    item: com.example.smartenglish.domain.model.DownloadedContent,
    onRemove: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Xóa bản offline?") },
            text = { Text("Xóa \"${item.title}\" khỏi bộ nhớ? Bạn vẫn có thể tải lại sau.") },
            confirmButton = {
                TextButton(onClick = { onRemove(); showDeleteDialog = false }) {
                    Text("Xóa")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }

    ListItem(
        headlineContent = { Text(item.title) },
        supportingContent = {
            Text("${item.cardCount} thẻ - ${formatBytes(item.sizeBytes)}")
        },
        leadingContent = {
            Icon(
                if (item.contentType == "folder") Icons.Default.Folder else Icons.Default.Style,
                null
            )
        },
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (item.mediaIncluded) {
                    Icon(
                        Icons.Default.Image,
                        "Có media",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.width(4.dp))
                }
                Box {
                    IconButton(onClick = { showMenu = true }) {
                        Icon(Icons.Default.MoreVert, "Menu")
                    }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                        DropdownMenuItem(
                            text = { Text("Xóa bản offline") },
                            onClick = { showMenu = false; showDeleteDialog = true },
                            leadingIcon = { Icon(Icons.Default.Delete, null) }
                        )
                    }
                }
            }
        }
    )
}

private fun formatBytes(bytes: Long): String {
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
    }
}
