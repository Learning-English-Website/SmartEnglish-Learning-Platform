package com.example.smartenglish.presentation.study

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.LibraryBooks
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.presentation.sets.LibraryTab
import com.example.smartenglish.presentation.sets.SetListEvent
import com.example.smartenglish.presentation.sets.SetListViewModel

private val QuizletBlue = Color(0xFF4255FF)

private val QuizletColors = listOf(
    Color(0xFF4255FF),
    Color(0xFFFF6B6B),
    Color(0xFF00C853),
    Color(0xFFFFB300),
    Color(0xFF9C27B0),
    Color(0xFF00BCD4),
    Color(0xFFE91E63),
    Color(0xFF795548)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyScreen(
    onNavigateToStudyMode: (String) -> Unit,
    viewModel: SetListViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showSearch by remember { mutableStateOf(false) }

    // Always show My Sets for the Study tab
    LaunchedEffect(Unit) {
        viewModel.onEvent(SetListEvent.SelectTab(LibraryTab.MY_SETS))
    }

    val searchQuery = remember { mutableStateOf("") }
    val filteredSets = remember(state.displayedSets, searchQuery.value) {
        if (searchQuery.value.isBlank()) state.displayedSets
        else state.displayedSets.filter {
            it.title.contains(searchQuery.value, ignoreCase = true) ||
                    it.description?.contains(searchQuery.value, ignoreCase = true) == true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Study", fontWeight = FontWeight.Bold)
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (showSearch) {
                OutlinedTextField(
                    value = searchQuery.value,
                    onValueChange = { searchQuery.value = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text("Search sets...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            if (filteredSets.isEmpty() && !state.isLoading) {
                EmptyStudyState()
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(
                        items = filteredSets,
                        key = { item: FlashcardSet -> item.id }
                    ) { set: FlashcardSet ->
                        StudySetCard(
                            set = set,
                            onClick = {
                                if (set.cardCount > 0) {
                                    onNavigateToStudyMode(set.id)
                                }
                            },
                            isEnabled = set.cardCount > 0
                        )
                    }
                }
            }

            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun StudySetCard(
    set: FlashcardSet,
    onClick: () -> Unit,
    isEnabled: Boolean
) {
    val colorIndex = set.title.hashCode().let {
        kotlin.math.abs(it) % QuizletColors.size
    }
    val cardColor = QuizletColors[colorIndex]

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp)
            .clickable(enabled = isEnabled, onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEnabled) cardColor.copy(alpha = 0.15f)
            else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = set.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = if (isEnabled) cardColor
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.School,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = if (isEnabled) cardColor
                        else MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${set.cardCount} cards",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (isEnabled) cardColor
                        else MaterialTheme.colorScheme.outline
                    )
                }

                if (!isEnabled) {
                    Text(
                        text = "No cards",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyStudyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.AutoMirrored.Filled.LibraryBooks,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "No sets to study",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Create a set with cards to start studying",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}
