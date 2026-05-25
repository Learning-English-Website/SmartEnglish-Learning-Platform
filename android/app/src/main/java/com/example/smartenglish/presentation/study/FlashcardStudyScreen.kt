package com.example.smartenglish.presentation.study

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.smartenglish.domain.model.Flashcard
import kotlin.random.Random

private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val QuizletGreen = Color(0xFF00C853)
private val QuizletAmber = Color(0xFFF59E0B)

enum class StudyModeType { FLASHCARDS, LEARN, TEST, MATCH }

enum class LearnModeStyle { MULTIPLE_CHOICE, TYPE_ANSWER }

enum class TestQuestionType { MULTIPLE_CHOICE, TRUE_FALSE, TYPE_ANSWER }

private data class TestQuestion(
    val id: String,
    val cardId: String,
    val type: TestQuestionType,
    val question: String,
    val answer: String,
    val options: List<String> = emptyList()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlashcardStudyScreen(
    setId: String,
    onNavigateBack: () -> Unit,
    viewModel: StudyViewModel = hiltViewModel(key = "study_$setId")
) {
    val state by viewModel.state.collectAsState()
    var currentMode by remember { mutableStateOf(StudyModeType.FLASHCARDS) }
    var learnStyle by remember { mutableStateOf(LearnModeStyle.MULTIPLE_CHOICE) }

    var testStarted by remember { mutableStateOf(false) }
    var testQuestions by remember { mutableStateOf<List<TestQuestion>>(emptyList()) }
    var testAnswers by remember { mutableStateOf<Map<Int, Any>>(emptyMap()) }
    var testCurrentIndex by remember { mutableIntStateOf(0) }
    var testAnswered by remember { mutableStateOf(false) }
    var testAllDone by remember { mutableStateOf(false) }
    var testResults by remember { mutableStateOf<Map<String, Pair<Int, Int>>>(emptyMap()) }

    var matchPairs by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var matchTerms by remember { mutableStateOf<List<Pair<Int, String>>>(emptyList()) }
    var matchDefs by remember { mutableStateOf<List<Pair<Int, String>>>(emptyList()) }
    var matchSelected by remember { mutableStateOf<List<Int>>(emptyList()) }
    var matchMatched by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var matchTimer by remember { mutableIntStateOf(0) }
    var matchDone by remember { mutableStateOf(false) }

    LaunchedEffect(setId) {
        viewModel.setSetId(setId)
    }

    LaunchedEffect(state.isFinished) {
        if (state.isFinished) {
            viewModel.onEvent(StudyEvent.FinishSession)
        }
    }

    fun buildTestQuestions(cards: List<Flashcard>) {
        val qs = mutableListOf<TestQuestion>()
        val shuffled = cards.shuffled()
        shuffled.take(10).forEachIndexed { idx, card ->
            val others = cards.filter { it.id != card.id }.shuffled().take(3).map { it.back }
            qs.add(
                TestQuestion(
                    id = "${idx}-mc-term",
                    cardId = card.id,
                    type = TestQuestionType.MULTIPLE_CHOICE,
                    question = card.front,
                    answer = card.back,
                    options = (others + card.back).shuffled()
                )
            )
            qs.add(
                TestQuestion(
                    id = "${idx}-mc-def",
                    cardId = card.id,
                    type = TestQuestionType.MULTIPLE_CHOICE,
                    question = card.back,
                    answer = card.front,
                    options = (cards.filter { it.id != card.id }.shuffled().take(3).map { it.front } + card.front).shuffled()
                )
            )
        }
        testQuestions = qs.shuffled().take(10)
    }

    LaunchedEffect(testStarted, state.cards) {
        if (testStarted && state.cards.isNotEmpty()) {
            buildTestQuestions(state.cards)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(state.set?.title ?: "Study", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    ModeSelector(
                        currentMode = currentMode,
                        onModeChange = { currentMode = it }
                    )
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
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = QuizletBlue)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Loading cards...")
                    }
                }
            }
            state.cards.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No cards to study", style = MaterialTheme.typography.titleLarge)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Add some cards to this set first", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = onNavigateBack) { Text("Go Back") }
                    }
                }
            }
            else -> {
                when (currentMode) {
                    StudyModeType.FLASHCARDS -> FlashcardsModeView(
                        cards = state.cards,
                        currentIndex = state.currentIndex,
                        isFlipped = state.isFlipped,
                        onFlip = { viewModel.onEvent(StudyEvent.FlipCard) },
                        onPrev = {
                            if (state.currentIndex > 0) {
                                viewModel.onEvent(StudyEvent.FlipCard)
                                viewModel.onEvent(StudyEvent.Restart)
                            }
                        },
                        onNext = {
                            if (state.isLastCard) {
                                viewModel.onEvent(StudyEvent.FinishSession)
                            } else {
                                viewModel.onEvent(StudyEvent.NextCard)
                            }
                        },
                        modifier = Modifier.padding(paddingValues)
                    )
                    StudyModeType.LEARN -> LearnModeView(
                        cards = state.cards,
                        learnStyle = learnStyle,
                        onLearnStyleChange = { learnStyle = it },
                        onAnswer = { correct ->
                            viewModel.onEvent(StudyEvent.AnswerCard(if (correct) StudyAnswer.GOOD else StudyAnswer.AGAIN))
                        },
                        modifier = Modifier.padding(paddingValues)
                    )
                    StudyModeType.TEST -> {
                        if (!testStarted) {
                            TestSetupView(
                                cardCount = state.cards.size,
                                onStart = { testStarted = true }
                            )
                        } else if (testAllDone) {
                            TestResultsView(
                                questions = testQuestions,
                                answers = testAnswers,
                                cards = state.cards,
                                results = testResults,
                                onRestart = {
                                    testStarted = false
                                    testAllDone = false
                                    testAnswers = emptyMap()
                                    testCurrentIndex = 0
                                    testAnswered = false
                                    testResults = emptyMap()
                                },
                                onClose = onNavigateBack,
                                modifier = Modifier.padding(paddingValues)
                            )
                        } else {
                            TestModeView(
                                questions = testQuestions,
                                answers = testAnswers,
                                currentIndex = testCurrentIndex,
                                isAnswered = testAnswered,
                                onAnswer = { answer ->
                                    val q = testQuestions[testCurrentIndex]
                                    val isCorrect = when (q.type) {
                                        TestQuestionType.MULTIPLE_CHOICE -> answer == q.answer
                                        TestQuestionType.TRUE_FALSE -> answer == (q.answer == "true")
                                        TestQuestionType.TYPE_ANSWER -> (answer as String).trim().equals(q.answer.trim(), ignoreCase = true)
                                    }
                                    testAnswers = testAnswers + (testCurrentIndex to answer)
                                    testAnswered = true
                                    val prev = testResults[q.cardId] ?: (0 to 0)
                                    testResults = testResults + (q.cardId to Pair(prev.first + 1, prev.second + if (isCorrect) 1 else 0))
                                },
                                onNext = {
                                    if (testCurrentIndex < testQuestions.size - 1) {
                                        testCurrentIndex++
                                        testAnswered = testAnswers.containsKey(testCurrentIndex)
                                    } else {
                                        testAllDone = true
                                    }
                                },
                                modifier = Modifier.padding(paddingValues)
                            )
                        }
                    }
                    StudyModeType.MATCH -> {
                        if (!matchDone && matchPairs.isEmpty()) {
                            LaunchedEffect(state.cards) {
                                if (state.cards.isNotEmpty()) {
                                    val pairs = state.cards.take(6)
                                    val termList = pairs.mapIndexed { idx, card -> idx to card.front }
                                    val defList = pairs.shuffled().mapIndexed { idx, card -> idx + 100 to card.back }
                                    matchTerms = termList
                                    matchDefs = defList
                                    matchPairs = pairs.map { it.id to it.front }
                                }
                            }
                        }
                        MatchModeView(
                            terms = matchTerms,
                            defs = matchDefs,
                            selected = matchSelected,
                            matched = matchMatched,
                            timer = matchTimer,
                            done = matchDone,
                            onTileClick = { tileId ->
                                if (matchMatched.contains(tileId)) return@MatchModeView
                                if (matchSelected.size == 2) return@MatchModeView
                                if (matchSelected.contains(tileId)) return@MatchModeView

                                val newSelected = matchSelected + tileId
                                matchSelected = newSelected

                                if (newSelected.size == 2) {
                                    val (a, b) = newSelected
                                    val isTermA = matchTerms.any { it.first == a }
                                    val isTermB = matchTerms.any { it.first == b }
                                    val isDefA = matchDefs.any { it.first == a }
                                    val isDefB = matchDefs.any { it.first == b }

                                    if ((isTermA && isDefB) || (isDefA && isTermB)) {
                                        val termPair = if (isTermA) matchTerms.find { it.first == a } else matchTerms.find { it.first == b }
                                        val defPair = if (isDefA) matchDefs.find { it.first == a } else matchDefs.find { it.first == b }
                                        if (termPair != null && defPair != null) {
                                            val termCard = state.cards.find { it.front == termPair.second }
                                            val defCard = state.cards.find { it.back == defPair.second }
                                            if (termCard != null && defCard != null && termCard.id == defCard.id) {
                                                matchMatched = matchMatched + a + b
                                                matchSelected = emptyList()
                                                if (matchMatched.size == matchTerms.size + matchDefs.size) {
                                                    matchDone = true
                                                }
                                            } else {
                                                matchSelected = emptyList()
                                            }
                                        } else {
                                            matchSelected = emptyList()
                                        }
                                    } else {
                                        matchSelected = emptyList()
                                    }
                                }
                            },
                            onRestart = {
                                val pairs = state.cards.take(6)
                                val termList = pairs.mapIndexed { idx, card -> idx to card.front }
                                val defList = pairs.shuffled().mapIndexed { idx, card -> idx + 100 to card.back }
                                matchTerms = termList
                                matchDefs = defList
                                matchSelected = emptyList()
                                matchMatched = emptySet()
                                matchDone = false
                                matchTimer = 0
                            },
                            modifier = Modifier.padding(paddingValues)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ModeSelector(
    currentMode: StudyModeType,
    onModeChange: (StudyModeType) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val modes = listOf(
        Triple(StudyModeType.FLASHCARDS, "Cards", Icons.Default.Style),
        Triple(StudyModeType.LEARN, "Learn", Icons.Default.School),
        Triple(StudyModeType.TEST, "Test", Icons.AutoMirrored.Filled.Assignment),
        Triple(StudyModeType.MATCH, "Match", Icons.Default.GridOn)
    )

    val current = modes.find { it.first == currentMode } ?: modes[0]

    Box {
        FilledTonalButton(
            onClick = { expanded = true },
            colors = ButtonDefaults.filledTonalButtonColors(containerColor = QuizletBlue.copy(alpha = 0.1f))
        ) {
            Icon(current.third, contentDescription = null, modifier = Modifier.size(18.dp), tint = QuizletBlue)
            Spacer(modifier = Modifier.width(6.dp))
            Text(current.second, color = QuizletBlue, fontWeight = FontWeight.SemiBold)
            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = QuizletBlue)
        }

        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            modes.forEach { (mode, label, icon) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = { onModeChange(mode); expanded = false },
                    leadingIcon = { Icon(icon, contentDescription = null) },
                    trailingIcon = { if (mode == currentMode) Icon(Icons.Default.Check, contentDescription = null, tint = QuizletBlue) }
                )
            }
        }
    }
}

@Composable
private fun FlashcardsModeView(
    cards: List<Flashcard>,
    currentIndex: Int,
    isFlipped: Boolean,
    onFlip: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    val rotation by animateFloatAsState(
        targetValue = if (isFlipped) 180f else 0f,
        animationSpec = tween(400, easing = FastOutSlowInEasing),
        label = "flip"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        LinearProgressIndicator(
            progress = { if (cards.isNotEmpty()) (currentIndex + 1).toFloat() / cards.size else 0f },
            modifier = Modifier.fillMaxWidth(),
            color = QuizletBlue,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "${currentIndex + 1} / ${cards.size}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.outline
        )

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .graphicsLayer { rotationY = rotation; cameraDistance = 12f * density }
                .clickable { onFlip() },
            shape = RoundedCornerShape(20.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isFlipped) MaterialTheme.colorScheme.secondaryContainer
                else MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationY = if (rotation > 90f) 180f else 0f },
                contentAlignment = Alignment.Center
            ) {
                if (rotation <= 90f) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                "Thuật ngữ",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            cards[currentIndex].front,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                "Định nghĩa",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            cards[currentIndex].back,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center
                        )
                        cards[currentIndex].pronunciation?.let {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.outline, textAlign = TextAlign.Center)
                        }
                        cards[currentIndex].example?.let {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text("Tap card to flip", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            FilledTonalButton(onClick = onPrev, enabled = currentIndex > 0) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                Spacer(Modifier.width(4.dp))
                Text("Prev")
            }
            Button(
                onClick = onNext,
                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
            ) {
                Text(if (currentIndex >= cards.size - 1) "Done" else "Next")
                Spacer(Modifier.width(4.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            itemsIndexed(cards) { idx, _ ->
                Box(
                    modifier = Modifier
                        .size(if (idx == currentIndex) 24.dp else 8.dp, 8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            when {
                                idx < currentIndex -> QuizletGreen
                                idx == currentIndex -> QuizletBlue
                                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                            }
                        )
                        .clickable { }
                )
            }
        }
    }
}

@Composable
private fun LearnModeView(
    cards: List<Flashcard>,
    learnStyle: LearnModeStyle,
    onLearnStyleChange: (LearnModeStyle) -> Unit,
    onAnswer: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentIndex by remember { mutableIntStateOf(0) }
    var answered by remember { mutableStateOf(false) }
    var selectedOption by remember { mutableStateOf<String?>(null) }
    var typedAnswer by remember { mutableStateOf("") }
    var correctCount by remember { mutableIntStateOf(0) }
    var wrongCount by remember { mutableIntStateOf(0) }

    val currentCard = cards.getOrNull(currentIndex) ?: return

    val options = remember(currentCard, cards) {
        cards.filter { it.id != currentCard.id }.shuffled().take(3).map { it.back } + currentCard.back
    }.shuffled()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = learnStyle == LearnModeStyle.MULTIPLE_CHOICE,
                onClick = { onLearnStyleChange(LearnModeStyle.MULTIPLE_CHOICE) },
                label = { Text("Trắc nghiệm") },
                leadingIcon = { if (learnStyle == LearnModeStyle.MULTIPLE_CHOICE) Icon(Icons.Default.Check, null, Modifier.size(16.dp)) }
            )
            FilterChip(
                selected = learnStyle == LearnModeStyle.TYPE_ANSWER,
                onClick = { onLearnStyleChange(LearnModeStyle.TYPE_ANSWER) },
                label = { Text("Tự luận") },
                leadingIcon = { if (learnStyle == LearnModeStyle.TYPE_ANSWER) Icon(Icons.Default.Check, null, Modifier.size(16.dp)) }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(color = QuizletGreen.copy(alpha = 0.1f), shape = RoundedCornerShape(20.dp)) {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Check, null, Modifier.size(14.dp), tint = QuizletGreen)
                    Spacer(Modifier.width(4.dp))
                    Text("$correctCount", fontWeight = FontWeight.Bold, color = QuizletGreen)
                }
            }
            Surface(color = QuizletCoral.copy(alpha = 0.1f), shape = RoundedCornerShape(20.dp)) {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Close, null, Modifier.size(14.dp), tint = QuizletCoral)
                    Spacer(Modifier.width(4.dp))
                    Text("$wrongCount", fontWeight = FontWeight.Bold, color = QuizletCoral)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LinearProgressIndicator(
            progress = { (currentIndex + 1).toFloat() / cards.size },
            modifier = Modifier.fillMaxWidth(),
            color = QuizletBlue,
        )

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f), shape = RoundedCornerShape(20.dp)) {
                    Text("Thuật ngữ", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                }
                Spacer(Modifier.height(16.dp))
                Text(currentCard.front, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        if (learnStyle == LearnModeStyle.MULTIPLE_CHOICE) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                options.forEach { option ->
                    val isCorrect = option == currentCard.back
                    val isSelected = selectedOption == option
                    val bgColor = when {
                        !answered && isSelected -> QuizletBlue.copy(alpha = 0.1f)
                        answered && isCorrect -> QuizletGreen.copy(alpha = 0.1f)
                        answered && isSelected && !isCorrect -> QuizletCoral.copy(alpha = 0.1f)
                        else -> MaterialTheme.colorScheme.surface
                    }
                    val borderColor = when {
                        !answered && isSelected -> QuizletBlue
                        answered && isCorrect -> QuizletGreen
                        answered && isSelected && !isCorrect -> QuizletCoral
                        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                    }

                    OutlinedCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !answered) { selectedOption = option },
                        colors = CardDefaults.outlinedCardColors(containerColor = bgColor),
                        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(borderColor))
                    ) {
                        Row(
                            Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(option, Modifier.weight(1f))
                            if (answered && isCorrect) Icon(Icons.Default.Check, null, tint = QuizletGreen)
                            if (answered && isSelected && !isCorrect) Icon(Icons.Default.Close, null, tint = QuizletCoral)
                        }
                    }
                }
            }
        } else {
            OutlinedTextField(
                value = typedAnswer,
                onValueChange = { typedAnswer = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Nhập đáp án...") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { if (!answered && typedAnswer.isNotBlank()) { val correct = typedAnswer.trim().equals(currentCard.back.trim(), ignoreCase = true); onAnswer(correct); if (correct) correctCount++ else wrongCount++; answered = true } }),
                enabled = !answered
            )
        }

        Spacer(Modifier.height(24.dp))

        if (learnStyle == LearnModeStyle.MULTIPLE_CHOICE) {
            Button(
                onClick = {
                    if (!answered && selectedOption != null) {
                        val correct = selectedOption == currentCard.back
                        onAnswer(correct)
                        if (correct) correctCount++ else wrongCount++
                        answered = true
                    } else if (answered) {
                        if (currentIndex < cards.size - 1) {
                            currentIndex++; answered = false; selectedOption = null; typedAnswer = ""
                        }
                    }
                },
                enabled = !answered && selectedOption != null || answered,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
            ) {
                Text(if (!answered) "Kiểm tra" else if (currentIndex < cards.size - 1) "Tiếp" else "Xong")
            }
        } else {
            Button(
                onClick = {
                    if (!answered && typedAnswer.isNotBlank()) {
                        val correct = typedAnswer.trim().equals(currentCard.back.trim(), ignoreCase = true)
                        onAnswer(correct)
                        if (correct) correctCount++ else wrongCount++
                        answered = true
                    } else if (answered) {
                        if (currentIndex < cards.size - 1) {
                            currentIndex++; answered = false; selectedOption = null; typedAnswer = ""
                        }
                    }
                },
                enabled = !answered && typedAnswer.isNotBlank() || answered,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
            ) {
                Text(if (!answered) "Kiểm tra" else if (currentIndex < cards.size - 1) "Tiếp" else "Xong")
            }
        }
    }
}

@Composable
private fun TestSetupView(
    cardCount: Int,
    onStart: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.AutoMirrored.Filled.Assignment, null, modifier = Modifier.size(64.dp), tint = QuizletBlue)
        Spacer(Modifier.height(16.dp))
        Text("Kiểm tra", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("$cardCount thẻ trong bộ này", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onStart,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
        ) {
            Text("Bắt đầu kiểm tra")
        }
    }
}

@Composable
private fun TestModeView(
    questions: List<TestQuestion>,
    answers: Map<Int, Any>,
    currentIndex: Int,
    isAnswered: Boolean,
    onAnswer: (Any) -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (questions.isEmpty()) return
    val q = questions[currentIndex]
    val selectedAnswer = answers[currentIndex]
    val focusManager = LocalFocusManager.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        LinearProgressIndicator(
            progress = { (currentIndex + 1).toFloat() / questions.size },
            modifier = Modifier.fillMaxWidth(),
            color = QuizletBlue,
        )
        Spacer(Modifier.height(4.dp))
        Text("Câu ${currentIndex + 1} / ${questions.size}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)

        Spacer(Modifier.height(24.dp))

        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f), shape = RoundedCornerShape(20.dp)) {
                    Text(
                        when (q.type) {
                            TestQuestionType.MULTIPLE_CHOICE -> "Chọn đáp án đúng"
                            TestQuestionType.TRUE_FALSE -> "Đúng hay sai?"
                            TestQuestionType.TYPE_ANSWER -> "Nhập đáp án"
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
                Spacer(Modifier.height(16.dp))
                Text(q.question, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            }
        }

        Spacer(Modifier.height(24.dp))

        when (q.type) {
            TestQuestionType.MULTIPLE_CHOICE -> {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    q.options.forEach { option ->
                        val isCorrect = option == q.answer
                        val isSelected = selectedAnswer == option
                        val bgColor = when {
                            !isAnswered && isSelected -> QuizletBlue.copy(alpha = 0.1f)
                            isAnswered && isCorrect -> QuizletGreen.copy(alpha = 0.1f)
                            isAnswered && isSelected && !isCorrect -> QuizletCoral.copy(alpha = 0.1f)
                            else -> MaterialTheme.colorScheme.surface
                        }
                        val borderColor = when {
                            !isAnswered && isSelected -> QuizletBlue
                            isAnswered && isCorrect -> QuizletGreen
                            isAnswered && isSelected && !isCorrect -> QuizletCoral
                            else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        }
                        OutlinedCard(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = !isAnswered) { onAnswer(option) },
                            colors = CardDefaults.outlinedCardColors(containerColor = bgColor),
                            border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(borderColor))
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(option, Modifier.weight(1f))
                                if (isAnswered && isCorrect) Icon(Icons.Default.Check, null, tint = QuizletGreen)
                                if (isAnswered && isSelected && !isCorrect) Icon(Icons.Default.Close, null, tint = QuizletCoral)
                            }
                        }
                    }
                }
            }
            TestQuestionType.TRUE_FALSE -> {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    listOf(true to "Đúng", false to "Sai").forEach { (value, label) ->
                        val isSelected = selectedAnswer == value
                        val bgColor = when {
                            !isAnswered && isSelected -> QuizletBlue.copy(alpha = 0.1f)
                            isAnswered && value == (q.answer == "true") -> QuizletGreen.copy(alpha = 0.1f)
                            isAnswered && isSelected && value != (q.answer == "true") -> QuizletCoral.copy(alpha = 0.1f)
                            else -> MaterialTheme.colorScheme.surface
                        }
                        OutlinedCard(
                            modifier = Modifier.weight(1f).clickable(enabled = !isAnswered) { onAnswer(value) },
                            colors = CardDefaults.outlinedCardColors(containerColor = bgColor)
                        ) {
                            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(if (value) Icons.Default.Check else Icons.Default.Close, null, modifier = Modifier.size(32.dp))
                                Text(label)
                            }
                        }
                    }
                }
            }
            TestQuestionType.TYPE_ANSWER -> {
                var typed by remember { mutableStateOf("") }
                OutlinedTextField(
                    value = typed,
                    onValueChange = { typed = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Nhập đáp án...") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = {
                        if (typed.isNotBlank()) onAnswer(typed)
                    })
                )
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { if (typed.isNotBlank()) onAnswer(typed) },
                    enabled = typed.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
                ) { Text("Kiểm tra") }
            }
        }

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
        ) {
            Text(if (currentIndex < questions.size - 1) "Tiếp" else "Xong")
        }
    }
}

@Composable
private fun TestResultsView(
    questions: List<TestQuestion>,
    answers: Map<Int, Any>,
    cards: List<com.example.smartenglish.domain.model.Flashcard>,
    results: Map<String, Pair<Int, Int>>,
    onRestart: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val correct = questions.countIndexed { idx, q ->
        val a = answers[idx]
        when (q.type) {
            TestQuestionType.MULTIPLE_CHOICE -> a == q.answer
            TestQuestionType.TRUE_FALSE -> a == (q.answer == "true")
            TestQuestionType.TYPE_ANSWER -> (a as? String)?.trim()?.equals(q.answer.trim(), ignoreCase = true) == true
        }
    }
    val accuracy = if (questions.isNotEmpty()) (correct * 100) / questions.size else 0

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            when {
                accuracy >= 80 -> "Xuất sắc!"
                accuracy >= 50 -> "Khá tốt!"
                else -> "Cần cố gắng thêm!"
            },
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(8.dp))
        Text("$accuracy%", style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold, color = QuizletBlue)
        Text("Đúng $correct / ${questions.size} câu", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)

        Spacer(Modifier.height(24.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Check, null, tint = QuizletGreen, modifier = Modifier.size(24.dp))
                    Text("$correct", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = QuizletGreen)
                    Text("Đúng", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                }
            }
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Close, null, tint = QuizletCoral, modifier = Modifier.size(24.dp))
                    Text("${questions.size - correct}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = QuizletCoral)
                    Text("Sai", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onRestart,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)
        ) {
            Icon(Icons.Default.Refresh, null)
            Spacer(Modifier.width(8.dp))
            Text("Làm lại")
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onClose,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Đóng")
        }
    }
}

@Composable
private fun MatchModeView(
    terms: List<Pair<Int, String>>,
    defs: List<Pair<Int, String>>,
    selected: List<Int>,
    matched: Set<Int>,
    timer: Int,
    done: Boolean,
    onTileClick: (Int) -> Unit,
    onRestart: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(terms, defs) {
        if (terms.isEmpty()) return@LaunchedEffect
        while (true) {
            kotlinx.coroutines.delay(1000)
            if (!done) {
                // timer++
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Ghép thẻ", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        Spacer(Modifier.height(24.dp))

        if (done) {
            Icon(Icons.Default.EmojiEvents, null, modifier = Modifier.size(64.dp), tint = QuizletAmber)
            Spacer(Modifier.height(16.dp))
            Text("Hoàn thành!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp))
            Button(onClick = onRestart, colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue)) {
                Icon(Icons.Default.Refresh, null)
                Spacer(Modifier.width(8.dp))
                Text("Chơi lại")
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                    terms.forEach { (id, text) ->
                        MatchTile(id = id, text = text, isSelected = selected.contains(id), isMatched = matched.contains(id), isDef = false, onClick = { onTileClick(id) })
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                    defs.forEach { (id, text) ->
                        MatchTile(id = id, text = text, isSelected = selected.contains(id), isMatched = matched.contains(id), isDef = true, onClick = { onTileClick(id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun MatchTile(
    id: Int,
    text: String,
    isSelected: Boolean,
    isMatched: Boolean,
    isDef: Boolean,
    onClick: () -> Unit
) {
    val bgColor = when {
        isMatched -> QuizletGreen.copy(alpha = 0.2f)
        isSelected -> QuizletBlue.copy(alpha = 0.2f)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    val borderColor = when {
        isMatched -> QuizletGreen
        isSelected -> QuizletBlue
        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(if (isSelected || isMatched) 4.dp else 1.dp, RoundedCornerShape(12.dp))
            .clickable(enabled = !isMatched) { onClick() },
        shape = RoundedCornerShape(12.dp),
        color = bgColor,
        border = androidx.compose.foundation.BorderStroke(2.dp, borderColor)
    ) {
        Box(Modifier.padding(12.dp), contentAlignment = Alignment.Center) {
            if (isMatched) {
                Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp).align(Alignment.TopEnd), tint = QuizletGreen)
            }
            Text(text, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

private inline fun <T> List<T>.forEachIndexed(action: (Int, T) -> Unit) {
    for (i in indices) action(i, get(i))
}

private fun List<TestQuestion>.countIndexed(predicate: (Int, TestQuestion) -> Boolean): Int {
    var count = 0
    for (i in indices) if (predicate(i, get(i))) count++
    return count
}
