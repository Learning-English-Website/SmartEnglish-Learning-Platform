package com.example.smartenglish.presentation.sets

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.util.CsvExporter
import com.example.smartenglish.util.ExportFileHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportBottomSheet(
    set: FlashcardSet,
    cards: List<Flashcard>,
    onDismiss: () -> Unit
) {
    var isExporting by remember { mutableStateOf(false) }
    var exportedUri by remember { mutableStateOf<Uri?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Export Cards", style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "${cards.size} cards",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(20.dp))

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (exportedUri != null) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Exported successfully!", color = MaterialTheme.colorScheme.primary)

                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/csv"
                            putExtra(Intent.EXTRA_STREAM, exportedUri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share CSV"))
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Share, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Share CSV")
                }
            } else {
                OutlinedButton(
                    onClick = {
                        isExporting = true
                        error = null

                        try {
                            val safeName = set.title.trim().ifEmpty { "flashcards" }
                            val fileName = "${safeName.replace(Regex("[^a-zA-Z0-9]"), "_")}_cards.csv"

                            val csvContent = CsvExporter.generateCsv(cards)
                            val uri = ExportFileHelper.saveCsvToDownloads(context, fileName, csvContent)

                            exportedUri = uri
                        } catch (e: Exception) {
                            error = e.message ?: "Export failed"
                        } finally {
                            isExporting = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = cards.isNotEmpty() && !isExporting
                ) {
                    if (isExporting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Download, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Export as CSV")
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))
        }
    }
}
