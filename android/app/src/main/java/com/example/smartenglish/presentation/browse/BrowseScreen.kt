package com.example.smartenglish.presentation.browse

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.presentation.components.EmptyState
import com.example.smartenglish.presentation.components.ShimmerGrid

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
fun BrowseScreen(
    onNavigateBack: () -> Unit,
    onNavigateToSetDetail: (String) -> Unit,
    viewModel: BrowseViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val focusManager = LocalFocusManager.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Browse", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
            // Search bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.onSearch(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search public sets...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.onSearch("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() })
            )

            // Sort chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SortChip(
                    label = "Newest",
                    selected = state.sortOption == SortOption.NEWEST,
                    onClick = { viewModel.onSortChange(SortOption.NEWEST) }
                )
                SortChip(
                    label = "Most Cards",
                    selected = state.sortOption == SortOption.MOST_CARDS,
                    onClick = { viewModel.onSortChange(SortOption.MOST_CARDS) }
                )
                SortChip(
                    label = "Popular",
                    selected = state.sortOption == SortOption.POPULAR,
                    onClick = { viewModel.onSortChange(SortOption.POPULAR) }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Results count
            if (state.sets.isNotEmpty() && !state.isLoading) {
                Text(
                    text = "${state.sets.size} sets found",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Error snackbar
            state.error?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(error)
                }
            }

            // Main content
            Box(modifier = Modifier.weight(1f)) {
                // Loading state
                if (state.isLoading && state.sets.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp)
                    ) {
                        ShimmerGrid(columns = 2, itemCount = 6)
                    }
                }
                // Empty state
                else if (state.sets.isEmpty() && !state.isLoading) {
                    EmptyState(
                        icon = Icons.Default.Search,
                        title = if (state.searchQuery.isNotEmpty()) "No sets found" else "Explore public sets",
                        subtitle = if (state.searchQuery.isNotEmpty())
                            "Try a different search term"
                        else
                            "Search for sets created by the community"
                    )
                }
                // Results grid
                else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(
                            items = state.sets,
                            key = { item: FlashcardSet -> item.id }
                        ) { set: FlashcardSet ->
                            BrowseSetCard(
                                set = set,
                                onClick = { onNavigateToSetDetail(set.id) }
                            )
                        }
                    }
                }
            }

            if (state.isLoading && state.sets.isNotEmpty()) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun SortChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = QuizletBlue.copy(alpha = 0.15f),
            selectedLabelColor = QuizletBlue
        )
    )
}

@Composable
private fun BrowseSetCard(
    set: FlashcardSet,
    onClick: () -> Unit
) {
    val colorIndex = set.title.hashCode().let {
        kotlin.math.abs(it) % QuizletColors.size
    }
    val cardColor = QuizletColors[colorIndex]

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(150.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = cardColor.copy(alpha = 0.12f)
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
                    color = cardColor
                )
                if (!set.description.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = set.description,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Style,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = cardColor
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = "${set.cardCount} cards",
                        style = MaterialTheme.typography.labelMedium,
                        color = cardColor
                    )
                }

                if (set.userId != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(Modifier.width(2.dp))
                        Text(
                            text = "by user",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            }
        }
    }
}
