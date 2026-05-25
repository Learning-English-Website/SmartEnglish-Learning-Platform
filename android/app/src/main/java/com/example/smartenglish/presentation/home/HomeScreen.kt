package com.example.smartenglish.presentation.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.presentation.components.StatCard

private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val QuizletGreen = Color(0xFF00C853)
private val QuizletYellow = Color(0xFFFFB300)

private val QuizletColors = listOf(
    androidx.compose.ui.graphics.Color(0xFF4255FF),
    androidx.compose.ui.graphics.Color(0xFFFF6B6B),
    androidx.compose.ui.graphics.Color(0xFF00C853),
    androidx.compose.ui.graphics.Color(0xFFFFB300),
    androidx.compose.ui.graphics.Color(0xFF9C27B0),
    androidx.compose.ui.graphics.Color(0xFF00BCD4),
    androidx.compose.ui.graphics.Color(0xFFE91E63),
    androidx.compose.ui.graphics.Color(0xFF795548)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToProfile: () -> Unit,
    onNavigateToLibrary: () -> Unit,
    onNavigateToStudy: () -> Unit,
    onNavigateToCreateSet: () -> Unit,
    onNavigateToSearch: () -> Unit,
    onNavigateToSetDetail: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "SmartEnglish",
                        fontWeight = FontWeight.Bold,
                        color = QuizletBlue
                    )
                },
                actions = {
                    IconButton(onClick = onNavigateToSearch) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Person, contentDescription = "Profile")
                    }
                }
            )
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is HomeUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = QuizletBlue)
                }
            }
            is HomeUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    WelcomeBanner(username = state.user.username)

                    Spacer(modifier = Modifier.height(20.dp))

                    StatsSection(stats = state.stats)

                    Spacer(modifier = Modifier.height(24.dp))

                    ContinueLearningSection(
                        sets = state.recentSets,
                        onSetClick = onNavigateToSetDetail,
                        onSeeAllClick = onNavigateToLibrary
                    )
                }
            }
            is HomeUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Error loading data",
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { viewModel.loadUser() }) {
                            Text("Retry")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsSection(stats: HomeStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            icon = Icons.Default.LocalFireDepartment,
            iconTint = QuizletCoral,
            value = "${stats.streak}",
            label = "Day Streak",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletCoral.copy(alpha = 0.08f)
        )
        StatCard(
            icon = Icons.Default.Star,
            iconTint = QuizletYellow,
            value = "${stats.xp}",
            label = "XP",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletYellow.copy(alpha = 0.08f)
        )
    }
    Spacer(modifier = Modifier.height(12.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            icon = Icons.Default.MenuBook,
            iconTint = QuizletBlue,
            value = "${stats.totalSets}",
            label = "Sets",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletBlue.copy(alpha = 0.08f)
        )
        StatCard(
            icon = Icons.Default.Style,
            iconTint = QuizletGreen,
            value = "${stats.masteredCards}",
            label = "Mastered",
            modifier = Modifier.weight(1f),
            backgroundColor = QuizletGreen.copy(alpha = 0.08f)
        )
    }
}

@Composable
private fun ContinueLearningSection(
    sets: List<com.example.smartenglish.domain.model.FlashcardSet>,
    onSetClick: (String) -> Unit,
    onSeeAllClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Continue Learning",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        if (sets.isNotEmpty()) {
            TextButton(onClick = onSeeAllClick) {
                Text("See all")
            }
        }
    }

    Spacer(modifier = Modifier.height(8.dp))

    if (sets.isEmpty()) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.MenuBook,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "No sets yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Go to Library to create your first set!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    } else {
        sets.forEach { set ->
            RecentSetItem(
                title = set.title,
                cardCount = set.cardCount,
                onClick = { onSetClick(set.id) }
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun WelcomeBanner(username: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = QuizletBlue
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Text(
                text = "Hello, $username!",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Ready to learn something new today?",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.9f)
            )
        }
    }
}

@Composable
private fun RecentSetItem(
    title: String,
    cardCount: Int,
    onClick: () -> Unit
) {
    val colorIndex = title.hashCode().let { kotlin.math.abs(it) } % QuizletColors.size
    val cardColor = QuizletColors[colorIndex]

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = cardColor.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = cardColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Style,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "$cardCount cards",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        }
    }
}
