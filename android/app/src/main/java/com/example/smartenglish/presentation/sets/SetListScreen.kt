package com.example.smartenglish.presentation.sets

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.LibraryBooks
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.presentation.components.EmptyState
import com.example.smartenglish.presentation.components.ShimmerGrid

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
fun SetListScreen(
    onNavigateToSetDetail: (String) -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToBrowse: () -> Unit,
    viewModel: SetListViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }
    var setToDelete by remember { mutableStateOf<FlashcardSet?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Library", fontWeight = FontWeight.Bold)
                },
                actions = {
                    if (state.selectedTab == LibraryTab.MY_SETS) {
                        IconButton(onClick = { showCreateDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Create Set")
                        }
                    }
                    IconButton(onClick = onNavigateToBrowse) {
                        Icon(Icons.Default.Search, contentDescription = "Browse")
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
            // Tab Row — My Sets / Community Sets
            TabRow(
                selectedTabIndex = if (state.selectedTab == LibraryTab.MY_SETS) 0 else 1,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                Tab(
                    selected = state.selectedTab == LibraryTab.MY_SETS,
                    onClick = { viewModel.onEvent(SetListEvent.SelectTab(LibraryTab.MY_SETS)) },
                    text = { Text("My Sets", fontWeight = if (state.selectedTab == LibraryTab.MY_SETS) FontWeight.Bold else FontWeight.Normal) },
                    icon = { Icon(Icons.Default.LibraryBooks, contentDescription = null) }
                )
                Tab(
                    selected = state.selectedTab == LibraryTab.COMMUNITY,
                    onClick = { viewModel.onEvent(SetListEvent.SelectTab(LibraryTab.COMMUNITY)) },
                    text = { Text("Community", fontWeight = if (state.selectedTab == LibraryTab.COMMUNITY) FontWeight.Bold else FontWeight.Normal) },
                    icon = { Icon(Icons.Default.Groups, contentDescription = null) }
                )
            }

            // Filter chips — All / Public / Private (only for My Sets)
            if (state.selectedTab == LibraryTab.MY_SETS) {
                FilterChipsRow(
                    selectedFilter = state.selectedFilter,
                    onFilterChange = { viewModel.onEvent(SetListEvent.SelectFilter(it)) }
                )
            }

            // Search bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.onEvent(SetListEvent.SearchSets(it)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = {
                    Text(
                        if (state.selectedTab == LibraryTab.MY_SETS) "Search your sets..."
                        else "Search community sets..."
                    )
                },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.onEvent(SetListEvent.SearchSets("")) }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Error snackbar
            state.error?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.onEvent(SetListEvent.ClearError) }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(error)
                }
            }

            // Main content
            Box(modifier = Modifier.weight(1f)) {
                if (state.isLoading && state.displayedSets.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp)
                    ) {
                        ShimmerGrid(columns = 2, itemCount = 6)
                    }
                } else if (state.displayedSets.isEmpty()) {
                    EmptyState(
                        icon = if (state.selectedTab == LibraryTab.MY_SETS)
                            Icons.AutoMirrored.Filled.LibraryBooks
                        else Icons.Default.Groups,
                        title = when {
                            state.searchQuery.isNotEmpty() -> "No sets found"
                            state.selectedTab == LibraryTab.MY_SETS -> "No sets yet"
                            else -> "No community sets"
                        },
                        subtitle = when {
                            state.searchQuery.isNotEmpty() -> "Try a different search term"
                            state.selectedTab == LibraryTab.MY_SETS -> "Create your first set to get started"
                            else -> "Be the first to share a set!"
                        },
                        actionLabel = if (state.selectedTab == LibraryTab.MY_SETS && state.searchQuery.isEmpty())
                            "Create Set" else null,
                        onAction = if (state.selectedTab == LibraryTab.MY_SETS && state.searchQuery.isEmpty()) {
                            { showCreateDialog = true }
                        } else null
                    )
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.displayedSets, key = { it.id }) { set ->
                            SetGridItem(
                                set = set,
                                onClick = { onNavigateToSetDetail(set.id) },
                                onDelete = if (state.selectedTab == LibraryTab.MY_SETS) {
                                    { setToDelete = set }
                                } else null
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

    if (showCreateDialog) {
        CreateSetDialog(
            onDismiss = { showCreateDialog = false },
            onCreated = { showCreateDialog = false }
        )
    }

    setToDelete?.let { set ->
        AlertDialog(
            onDismissRequest = { setToDelete = null },
            title = { Text("Delete Set") },
            text = { Text("Are you sure you want to delete \"${set.title}\"? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.onEvent(SetListEvent.DeleteSet(set.id))
                        setToDelete = null
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { setToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun FilterChipsRow(
    selectedFilter: SetFilter,
    onFilterChange: (SetFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = selectedFilter == SetFilter.ALL,
            onClick = { onFilterChange(SetFilter.ALL) },
            label = { Text("All") },
            leadingIcon = if (selectedFilter == SetFilter.ALL) {
                { Icon(Icons.Default.Check, null, Modifier.size(16.dp)) }
            } else null
        )
        FilterChip(
            selected = selectedFilter == SetFilter.PUBLIC,
            onClick = { onFilterChange(SetFilter.PUBLIC) },
            label = { Text("Public") },
            leadingIcon = if (selectedFilter == SetFilter.PUBLIC) {
                { Icon(Icons.Default.Check, null, Modifier.size(16.dp)) }
            } else {
                { Icon(Icons.Default.Public, null, Modifier.size(16.dp)) }
            }
        )
        FilterChip(
            selected = selectedFilter == SetFilter.PRIVATE,
            onClick = { onFilterChange(SetFilter.PRIVATE) },
            label = { Text("Private") },
            leadingIcon = if (selectedFilter == SetFilter.PRIVATE) {
                { Icon(Icons.Default.Check, null, Modifier.size(16.dp)) }
            } else {
                { Icon(Icons.Default.Lock, null, Modifier.size(16.dp)) }
            }
        )
    }
}

@Composable
fun SetGridItem(
    set: FlashcardSet,
    onClick: () -> Unit,
    onDelete: (() -> Unit)? = null
) {
    var showMenu by remember { mutableStateOf(false) }

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
            containerColor = cardColor.copy(alpha = 0.15f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Public/Private badge
                    if (set.isPublic) {
                        Surface(
                            color = Color(0xFF4CAF50).copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Public,
                                    null,
                                    modifier = Modifier.size(10.dp),
                                    tint = Color(0xFF4CAF50)
                                )
                                Spacer(Modifier.width(2.dp))
                                Text(
                                    "Public",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF4CAF50),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    } else {
                        Surface(
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Lock,
                                    null,
                                    modifier = Modifier.size(10.dp),
                                    tint = MaterialTheme.colorScheme.outline
                                )
                                Spacer(Modifier.width(2.dp))
                                Text(
                                    "Private",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.outline,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    text = set.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = cardColor
                )
                if (!set.description.isNullOrBlank()) {
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

                if (onDelete != null) {
                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More",
                                modifier = Modifier.size(18.dp),
                                tint = cardColor
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                onClick = {
                                    showMenu = false
                                    onClick()
                                },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Share") },
                                onClick = { showMenu = false },
                                leadingIcon = { Icon(Icons.Default.Share, contentDescription = null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                onClick = {
                                    showMenu = false
                                    onDelete()
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
