package com.example.smartenglish.presentation.sets

import com.example.smartenglish.domain.model.Flashcard
import kotlinx.coroutines.launch

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val QuizletGreen = Color(0xFF00C853)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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

    Scaffold(
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(state.set?.title ?: "Set Details", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showImportModal = true }) {
                        Icon(Icons.Default.CloudUpload, contentDescription = "Import")
                    }
                    IconButton(onClick = { showExportSheet = true }) {
                        Icon(Icons.Default.Download, contentDescription = "Export")
                    }
                    IconButton(onClick = { showEditDialog = true }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit")
                    }
                    IconButton(onClick = { showShareSheet = true }) {
                        Icon(Icons.Default.Share, contentDescription = "Share")
                    }
                }
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
                        Text(state.error ?: "Unknown error")
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
                        .padding(16.dp)
                ) {
                    // Set header banner
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(QuizletBlue, QuizletBlue.copy(alpha = 0.7f))
                                )
                            )
                            .padding(20.dp)
                    ) {
                        Column {
                            Text(
                                text = set.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            if (!set.description.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = set.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.White.copy(alpha = 0.9f)
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!set.language.isNullOrBlank()) {
                                    AssistChip(
                                        onClick = {},
                                        label = { Text(set.language, color = QuizletBlue) },
                                        colors = AssistChipDefaults.assistChipColors(
                                            containerColor = Color.White
                                        )
                                    )
                                }
                                if (set.isPublic) {
                                    AssistChip(
                                        onClick = {},
                                        label = { Text("Public", color = QuizletBlue) },
                                        leadingIcon = {
                                            Icon(
                                                Icons.Default.Public,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = QuizletBlue
                                            )
                                        },
                                        colors = AssistChipDefaults.assistChipColors(
                                            containerColor = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { onNavigateToStudy(set.id) },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = QuizletBlue
                            )
                        ) {
                            Icon(Icons.Default.School, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Study", fontWeight = FontWeight.SemiBold)
                        }
                        OutlinedButton(
                            onClick = { onNavigateToAddCards(set.id) },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Add Cards")
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Stats
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Default.Style,
                                    contentDescription = null,
                                    tint = QuizletBlue,
                                    modifier = Modifier.size(28.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${set.cardCount}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Cards",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Default.Public,
                                    contentDescription = null,
                                    tint = if (set.isPublic) QuizletGreen else MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.size(28.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (set.isPublic) "Public" else "Private",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (set.isPublic) QuizletGreen else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = "Visibility",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // Tags
                    if (set.tags.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Tags",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            set.tags.forEach { tag ->
                                SuggestionChip(
                                    onClick = {},
                                    label = { Text(tag) }
                                )
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
                // reload cards for export
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
