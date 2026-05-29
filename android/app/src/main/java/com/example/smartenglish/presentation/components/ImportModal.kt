package com.example.smartenglish.presentation.components

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.util.ColumnMapper
import com.example.smartenglish.util.FileImportHelper
import com.example.smartenglish.util.XlsxImporter

private val QuizletBlue = Color(0xFF4255FF)
private val QuizletGreen = Color(0xFF00C853)
private val QuizletCoral = Color(0xFFFF6B6B)
private val QuizletAmber = Color(0xFFF59E0B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportModal(
    setId: String,
    onDismiss: () -> Unit,
    onImportSuccess: (Int) -> Unit,
    viewModel: ImportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showMapping by remember { mutableStateOf(false) }
    var selectedMapping by remember { mutableStateOf(ColumnMapper.Mapping(-1, -1)) }
    val context = LocalContext.current

    LaunchedEffect(uiState.importSuccess) {
        if (uiState.importSuccess) {
            onImportSuccess(uiState.importedCount)
            viewModel.clearData()
            onDismiss()
        }
    }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let {
            val mime = context.contentResolver.getType(it).orEmpty()
            val name = it.lastPathSegment.orEmpty().lowercase()
            val isXlsx = mime.contains("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")

            val parsed = if (isXlsx) {
                context.contentResolver.openInputStream(it)?.use { inputStream ->
                    XlsxImporter.parseXlsx(inputStream)
                } ?: FileImportHelper.CsvParseResult(emptyList(), emptyList())
            } else {
                val content = context.contentResolver.openInputStream(it)
                    ?.bufferedReader()
                    ?.use { r -> r.readText() }
                    ?: ""
                FileImportHelper.parseCsv(content)
            }

            if (parsed.headers.isNotEmpty()) {
                selectedMapping = ColumnMapper.autoDetect(parsed.headers)
                viewModel.setParsedData(parsed, selectedMapping)
                showMapping = true
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = { BottomSheetDefaults.DragHandle(color = MaterialTheme.colorScheme.outlineVariant) },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Nhập thẻ từ file",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = MaterialTheme.colorScheme.outlineVariant)

            if (!showMapping) {
                // File Upload Section
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                        .border(
                            border = BorderStroke(2.dp, Brush.linearGradient(listOf(QuizletBlue.copy(alpha = 0.3f), QuizletBlue.copy(alpha = 0.6f)))),
                            shape = RoundedCornerShape(20.dp)
                        )
                        .clip(RoundedCornerShape(20.dp)),
                    colors = CardDefaults.cardColors(
                        containerColor = QuizletBlue.copy(alpha = 0.03f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            color = QuizletBlue.copy(alpha = 0.1f),
                            shape = CircleShape,
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.CloudUpload,
                                    contentDescription = null,
                                    modifier = Modifier.size(36.dp),
                                    tint = QuizletBlue
                                )
                            }
                        }

                        Spacer(Modifier.height(16.dp))
                        Text(
                            "Chọn file dữ liệu của bạn",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Hỗ trợ các định dạng bảng tính CSV, XLSX hoặc XLS",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(24.dp))

                        Button(
                            onClick = {
                                launcher.launch(
                                    arrayOf(
                                        "text/csv",
                                        "text/*",
                                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                        "application/vnd.ms-excel",
                                        "*/*"
                                    )
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Icon(Icons.Default.FolderOpen, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Duyệt tìm File", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                // Column Mapping UI
                ColumnMappingSection(
                    headers = uiState.headers,
                    mapping = selectedMapping,
                    previewRows = uiState.rows.take(5),
                    onMappingChange = { selectedMapping = it; viewModel.updateMapping(it) },
                    totalRows = uiState.rows.size
                )

                Spacer(Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = { showMapping = false; viewModel.clearData() },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Đổi file", fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { viewModel.importCards(setId) },
                        modifier = Modifier
                            .weight(1.2f)
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue),
                        enabled = selectedMapping.front >= 0 && selectedMapping.back >= 0 && !uiState.isImporting
                    ) {
                        if (uiState.isImporting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.5.dp
                            )
                        } else {
                            Icon(Icons.Default.Check, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Bắt đầu Import", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            uiState.error?.let { error ->
                Spacer(Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = QuizletCoral.copy(alpha = 0.08f)),
                    border = BorderStroke(1.dp, QuizletCoral.copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = QuizletCoral)
                        Spacer(Modifier.width(8.dp))
                        Text(error, color = QuizletCoral, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ColumnMappingSection(
    headers: List<String>,
    mapping: ColumnMapper.Mapping,
    previewRows: List<List<String>>,
    onMappingChange: (ColumnMapper.Mapping) -> Unit,
    totalRows: Int
) {
    Column {
        val fields = listOf(
            Triple("Front * (Thuật ngữ)", mapping.front, Icons.Default.School),
            Triple("Back * (Định nghĩa)", mapping.back, Icons.Default.Translate),
            Triple("Pronunciation (Phát âm)", mapping.pronunciation, Icons.Default.VolumeUp),
            Triple("Example (Ví dụ)", mapping.example, Icons.Default.Assignment),
            Triple("Note (Ghi chú)", mapping.note, Icons.Default.Description)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                fields.forEach { (label, selectedIdx, icon) ->
                    val isRequired = label.contains("*")
                    val isMapped = selectedIdx in headers.indices
                    val statusColor = when {
                        isMapped -> QuizletGreen
                        isRequired -> QuizletCoral
                        else -> MaterialTheme.colorScheme.outline
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = statusColor,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        
                        Column(modifier = Modifier.weight(1.2f)) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = if (isRequired) "Bắt buộc" else "Không bắt buộc",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isRequired) QuizletCoral else MaterialTheme.colorScheme.outline
                            )
                        }

                        var expanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = !expanded },
                            modifier = Modifier.weight(1.8f)
                        ) {
                            OutlinedTextField(
                                value = if (isMapped) headers[selectedIdx] else "-- Chọn cột --",
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.menuAnchor(),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                shape = RoundedCornerShape(10.dp),
                                textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (isMapped) QuizletGreen else QuizletBlue,
                                    unfocusedBorderColor = if (isMapped) QuizletGreen.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outlineVariant
                                )
                            )

                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("-- Bỏ chọn --", color = QuizletCoral, fontWeight = FontWeight.Bold) },
                                    onClick = {
                                        val updated = when {
                                            label.startsWith("Front") -> mapping.copy(front = -1)
                                            label.startsWith("Back") -> mapping.copy(back = -1)
                                            label.startsWith("Pron") -> mapping.copy(pronunciation = -1)
                                            label.startsWith("Example") -> mapping.copy(example = -1)
                                            else -> mapping.copy(note = -1)
                                        }
                                        onMappingChange(updated)
                                        expanded = false
                                    }
                                )
                                headers.forEachIndexed { idx, header ->
                                    DropdownMenuItem(
                                        text = { Text(header.ifEmpty { "Cột ${idx + 1}" }, fontWeight = FontWeight.Medium) },
                                        onClick = {
                                            val updated = when {
                                                label.startsWith("Front") -> mapping.copy(front = idx)
                                                label.startsWith("Back") -> mapping.copy(back = idx)
                                                label.startsWith("Pron") -> mapping.copy(pronunciation = idx)
                                                label.startsWith("Example") -> mapping.copy(example = idx)
                                                else -> mapping.copy(note = idx)
                                            }
                                            onMappingChange(updated)
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (previewRows.isNotEmpty()) {
            Spacer(Modifier.height(20.dp))
            Text(
                "Xem trước dữ liệu (5 hàng đầu)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(10.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                    ) {
                        Column {
                            // Headers
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                    .padding(vertical = 10.dp, horizontal = 12.dp)
                            ) {
                                headers.forEachIndexed { idx, header ->
                                    val isFront = idx == mapping.front
                                    val isBack = idx == mapping.back
                                    val headerColor = when {
                                        isFront || isBack -> QuizletGreen
                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                    Text(
                                        text = header.ifEmpty { "Col ${idx + 1}" },
                                        modifier = Modifier.width(120.dp),
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = headerColor,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            // Rows
                            previewRows.forEachIndexed { rowIdx, row ->
                                val rowBg = if (rowIdx % 2 == 0) Color.Transparent else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(rowBg, RoundedCornerShape(6.dp))
                                        .padding(vertical = 10.dp, horizontal = 12.dp)
                                ) {
                                    row.forEachIndexed { colIdx, cell ->
                                        val isTarget = colIdx == mapping.front || colIdx == mapping.back
                                        Text(
                                            text = cell,
                                            modifier = Modifier.width(120.dp),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (isTarget) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = if (isTarget) FontWeight.SemiBold else FontWeight.Normal,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
