package com.example.smartenglish.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun OfflineBanner(
    pendingCount: Int,
    isOnline: Boolean,
    onSyncClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (!isOnline) {
        Surface(
            color = MaterialTheme.colorScheme.tertiaryContainer,
            modifier = modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.CloudOff,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = if (pendingCount > 0)
                        "$pendingCount thay đổi chờ đồng bộ"
                    else
                        "Không có kết nối mạng",
                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    } else if (pendingCount > 0) {
        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            onClick = onSyncClick,
            modifier = modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.CloudSync,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "$pendingCount thay đổi chờ đồng bộ",
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                TextButton(onClick = onSyncClick) {
                    Icon(Icons.Default.Sync, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Đồng bộ")
                }
            }
        }
    }
}
