package com.example.smartenglish.presentation.cards

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CardEditorScreen(
    onNavigateBack: () -> Unit,
    viewModel: CardEditorViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (state.isNewCard) "New Card" else "Edit Card") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.onEvent(CardEditorEvent.Save) },
                        enabled = !state.isSaving && state.card?.front?.isNotBlank() == true && state.card?.back?.isNotBlank() == true
                    ) {
                        if (state.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save")
                        }
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
                    CircularProgressIndicator()
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // ── Bắt buộc ──────────────────────────────────────────
                    // Term + nút ⚡ Auto-fill
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = state.card?.front ?: "",
                            onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateFront(it)) },
                            label = { Text("Term *") },
                            placeholder = { Text("Enter term") },
                            modifier = Modifier.weight(1f)
                        )
                        // ⚡ Auto-fill button
                        FilledTonalIconButton(
                            onClick = { viewModel.onEvent(CardEditorEvent.AutoFill) },
                            enabled = (state.card?.front?.isNotBlank() == true) && !state.isAutoFilling,
                            modifier = Modifier.size(56.dp)
                        ) {
                            if (state.isAutoFilling) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = "Auto-fill fields",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = state.card?.back ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateBack(it)) },
                        label = { Text("Definition *") },
                        placeholder = { Text("Enter definition") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    HorizontalDivider()

                    // ── Tuỳ chọn ──────────────────────────────────────────
                    OutlinedTextField(
                        value = state.card?.pronunciation ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdatePronunciation(it.ifBlank { null })) },
                        label = { Text("Pronunciation") },
                        placeholder = { Text("/prəˌnʌnsiˈeɪʃən/") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = state.card?.example ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateExample(it.ifBlank { null })) },
                        label = { Text("Example Sentence") },
                        placeholder = { Text("e.g. She made a decision quickly.") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    OutlinedTextField(
                        value = state.card?.collocation ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateCollocation(it.ifBlank { null })) },
                        label = { Text("Collocation") },
                        placeholder = { Text("e.g. make a decision, take a photo") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = state.card?.relatedWords ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateRelatedWords(it.ifBlank { null })) },
                        label = { Text("Related Words") },
                        placeholder = { Text("e.g. quick, fast, rapid") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = state.card?.note ?: "",
                        onValueChange = { viewModel.onEvent(CardEditorEvent.UpdateNote(it.ifBlank { null })) },
                        label = { Text("Note") },
                        placeholder = { Text("Personal note or memory tip") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    state.error?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}
