package com.example.smartenglish.presentation.study

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalContext
import com.example.smartenglish.util.AudioPlayer
import java.io.File
import androidx.compose.ui.unit.sp
import com.example.smartenglish.domain.model.Flashcard
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random
 
private val QuizletBlue = Color(0xFF4255FF)
private val QuizletCoral = Color(0xFFFF6B6B)
private val QuizletGreen = Color(0xFF00C853)
private val QuizletAmber = Color(0xFFF59E0B)

private val DeepDarkNavy = Color(0xFF07091E)
private val DarkBackground = Color(0xFF0F112A)
private val TextWhite = Color(0xFFF8FAFC)
private val TextGray = Color(0xFF94A3B8)
private val CardBg = Color(0xFF161A3F)
private val IconBg = Color(0xFF1E214A)
private val IconCyan = Color(0xFF38BDF8)

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
    initialMode: String? = null,
    onNavigateBack: () -> Unit,
    viewModel: StudyViewModel = hiltViewModel(key = "study_$setId")
) {
    val state by viewModel.state.collectAsState()
    val gamificationResult by viewModel.gamificationResult.collectAsState()
    val context = LocalContext.current
    val audioPlayer = remember { AudioPlayer(context) }
    val sharedPrefs = remember(setId) {
        context.getSharedPreferences("learn_progress_prefs", android.content.Context.MODE_PRIVATE)
    }
    DisposableEffect(Unit) {
        onDispose {
            audioPlayer.release()
        }
    }
    var currentMode by remember {
        mutableStateOf(
            when (initialMode?.lowercase()) {
                "learn" -> StudyModeType.LEARN
                "test" -> StudyModeType.TEST
                "match" -> StudyModeType.MATCH
                else -> StudyModeType.FLASHCARDS
            }
        )
    }
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
    var matchMismatched by remember { mutableStateOf<List<Int>>(emptyList()) }
    var matchMatched by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var matchTimer by remember { mutableIntStateOf(0) }
    var matchDone by remember { mutableStateOf(false) }

    // Gamification overlay
    var showGamification by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(setId) {
        viewModel.setSetId(setId)
    }

    // Khi có gamification result mới → show overlay
    LaunchedEffect(gamificationResult) {
        if (gamificationResult != null) {
            showGamification = true
        }
    }

    // Navigate back khi session xong (nếu không có rewards thì navigate luôn sau delay nhỏ)
    LaunchedEffect(state.isFinished) {
        if (state.isFinished && gamificationResult == null) {
            kotlinx.coroutines.delay(600)
            if (gamificationResult == null) onNavigateBack()
        }
    }

    LaunchedEffect(currentMode) {
        if (currentMode == StudyModeType.MATCH) {
            matchTerms = emptyList()
            matchDefs = emptyList()
            matchPairs = emptyList()
            matchSelected = emptyList()
            matchMismatched = emptyList()
            matchMatched = emptySet()
            matchDone = false
            matchTimer = 0
        }
    }

    LaunchedEffect(currentMode, state.cards) {
        if (currentMode == StudyModeType.MATCH && state.cards.isNotEmpty() && matchTerms.isEmpty()) {
            val pairs = state.cards.take(6)
            val termList = pairs.mapIndexed { idx, card -> idx to card.front }
            val defList = pairs.shuffled().mapIndexed { idx, card -> idx + 100 to card.back }
            matchTerms = termList
            matchDefs = defList
            matchPairs = pairs.map { it.id to it.front }
        }
    }

    LaunchedEffect(currentMode, matchDone) {
        if (currentMode == StudyModeType.MATCH && !matchDone) {
            matchTimer = 0
            while (!matchDone) {
                delay(100)
                matchTimer++
            }
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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DeepDarkNavy, DarkBackground)
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Text(state.set?.title ?: "Học phần", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    )
                )
            }
        ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize()) {
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
                        onPlayAudio = { card ->
                            val localFile = File(context.filesDir, "offline_media/${card.setId}").listFiles()
                                ?.find { it.name.startsWith("audio_${card.id}") }
                            val path = localFile?.absolutePath ?: card.pronunciation
                            audioPlayer.playPronunciation(card.front, path)
                        },
                        modifier = Modifier.padding(paddingValues)
                    )
                    StudyModeType.LEARN -> LearnModeView(
                        setId = setId,
                        cards = state.cards,
                        onUpdateCardProgress = { cardId, correct ->
                            viewModel.onEvent(StudyEvent.UpdateCardStudyProgress(cardId, correct))
                        },
                        onResetProgress = {
                            android.util.Log.d("LearnProgress", "onResetProgress: removing learn_round_${setId}")
                            sharedPrefs.edit().remove("learn_round_${setId}").commit()
                            viewModel.onEvent(StudyEvent.ResetProgress)
                        },
                        onFinishSession = { cardsStudied, correct, incorrect, isFinal ->
                            viewModel.onEvent(StudyEvent.FinishCustomSession(cardsStudied, correct, incorrect, isFinal))
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
                                    testAnswers = testAnswers + (testCurrentIndex to answer)
                                    testAnswered = when (answer) {
                                        is String -> answer.isNotBlank()
                                        else -> true
                                    }
                                },
                                onNext = {
                                    if (testCurrentIndex < testQuestions.size - 1) {
                                        testCurrentIndex++
                                        testAnswered = testAnswers.containsKey(testCurrentIndex)
                                    } else {
                                        var resultsMap = emptyMap<String, Pair<Int, Int>>()
                                        val correct = testQuestions.countIndexed { idx, q ->
                                            val a = testAnswers[idx]
                                            val isCorrect = when (q.type) {
                                                TestQuestionType.MULTIPLE_CHOICE -> a == q.answer
                                                TestQuestionType.TRUE_FALSE -> a == (q.answer == "true")
                                                TestQuestionType.TYPE_ANSWER -> (a as? String)?.trim()?.equals(q.answer.trim(), ignoreCase = true) == true
                                            }
                                            val prev = resultsMap[q.cardId] ?: (0 to 0)
                                            resultsMap = resultsMap + (q.cardId to Pair(prev.first + 1, prev.second + if (isCorrect) 1 else 0))
                                            isCorrect
                                        }
                                        testResults = resultsMap
                                        val incorrect = testQuestions.size - correct
                                        viewModel.onEvent(StudyEvent.FinishCustomSession(
                                            cardsStudied = testQuestions.size,
                                            correctCount = correct,
                                            incorrectCount = incorrect,
                                            isFinal = true
                                        ))
                                        testAllDone = true
                                    }
                                },
                                modifier = Modifier.padding(paddingValues)
                            )
                        }
                    }
                    StudyModeType.MATCH -> {
                        MatchModeView(
                            terms = matchTerms,
                            defs = matchDefs,
                            selected = matchSelected,
                            mismatched = matchMismatched,
                            matched = matchMatched,
                            timer = matchTimer,
                            done = matchDone,
                            onTileClick = { tileId ->
                                if (matchMatched.contains(tileId)) return@MatchModeView
                                if (matchSelected.size >= 2) return@MatchModeView
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
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                matchMatched = matchMatched + a + b
                                                matchSelected = emptyList()
                                                if (matchMatched.size == matchTerms.size + matchDefs.size) {
                                                    matchDone = true
                                                }
                                            } else {
                                                matchMismatched = newSelected
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                scope.launch {
                                                    delay(400)
                                                    matchSelected = emptyList()
                                                    matchMismatched = emptyList()
                                                }
                                            }
                                        } else {
                                            matchSelected = emptyList()
                                        }
                                    } else {
                                        matchMismatched = newSelected
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        scope.launch {
                                            delay(400)
                                            matchSelected = emptyList()
                                            matchMismatched = emptyList()
                                        }
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
                                matchMismatched = emptyList()
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

        // ── Gamification Overlay ───────────────────────────────────────
        if (showGamification) {
            com.example.smartenglish.presentation.components.GamificationOverlay(
                result = gamificationResult,
                onDismiss = {
                    viewModel.clearGamificationResult()
                    showGamification = false
                    if (state.isFinished) {
                        onNavigateBack()
                    }
                }
            )
        }
    } // end inner Box
    } // end Scaffold
    } // end parent Box
}

@Composable
private fun ModeSelector(
    currentMode: StudyModeType,
    onModeChange: (StudyModeType) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val modes = listOf(
        Triple(StudyModeType.FLASHCARDS, "Thẻ ghi nhớ", Icons.Default.Style),
        Triple(StudyModeType.LEARN, "Học", Icons.Default.School),
        Triple(StudyModeType.TEST, "Kiểm tra", Icons.AutoMirrored.Filled.Assignment),
        Triple(StudyModeType.MATCH, "Ghép thẻ", Icons.Default.GridOn)
    )

    val current = modes.find { it.first == currentMode } ?: modes[0]

    Box {
        FilledTonalButton(
            onClick = { expanded = true },
            colors = ButtonDefaults.filledTonalButtonColors(
                containerColor = CardBg,
                contentColor = IconCyan
            ),
            border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.3f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(current.third, contentDescription = null, modifier = Modifier.size(18.dp), tint = IconCyan)
            Spacer(modifier = Modifier.width(6.dp))
            Text(current.second, color = Color.White, fontWeight = FontWeight.SemiBold)
            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = IconCyan)
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(CardBg)
        ) {
            modes.forEach { (mode, label, icon) ->
                DropdownMenuItem(
                    text = { Text(label, color = Color.White) },
                    onClick = { onModeChange(mode); expanded = false },
                    leadingIcon = { Icon(icon, contentDescription = null, tint = IconCyan) },
                    trailingIcon = {
                        if (mode == currentMode) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = IconCyan)
                        }
                    }
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
    onPlayAudio: (Flashcard) -> Unit,
    modifier: Modifier = Modifier
) {
    val haptic = LocalHapticFeedback.current
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
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = IconCyan,
            trackColor = CardBg
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "${currentIndex + 1} / ${cards.size}",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = IconCyan
        )

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .graphicsLayer { 
                    rotationY = rotation
                    cameraDistance = 15f * density 
                }
                .clickable { 
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onFlip() 
                },
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
            colors = CardDefaults.cardColors(
                containerColor = CardBg
            ),
            border = BorderStroke(
                width = 1.5.dp, 
                color = if (isFlipped) QuizletGreen.copy(alpha = 0.5f) else IconCyan.copy(alpha = 0.5f)
            )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationY = if (rotation > 90f) 180f else 0f }
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = if (isFlipped) {
                                    listOf(QuizletGreen, QuizletGreen.copy(alpha = 0.6f))
                                } else {
                                    listOf(IconCyan, IconCyan.copy(alpha = 0.6f))
                                }
                            )
                        )
                )

                if (rotation <= 90f) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .padding(top = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = IconCyan.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Text(
                                    "THUẬT NGỮ",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IconCyan
                                )
                            }
                            IconButton(onClick = { /* Star bookmark placeholder */ }) {
                                Icon(
                                    imageVector = Icons.Default.StarOutline,
                                    contentDescription = "Bookmark",
                                    tint = TextGray
                                )
                            }
                        }

                        val frontText = cards[currentIndex].front
                        val frontFontSize = if (frontText.length > 40) 22.sp else if (frontText.length > 15) 28.sp else 34.sp
                        Text(
                            text = frontText,
                            fontSize = frontFontSize,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )

                        IconButton(
                            onClick = { onPlayAudio(cards[currentIndex]) },
                            modifier = Modifier
                                .align(Alignment.End)
                                .background(IconCyan.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.VolumeUp,
                                contentDescription = "Listen",
                                tint = IconCyan
                            )
                        }
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .padding(top = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = QuizletGreen.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Text(
                                    "ĐỊNH NGHĨA",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = QuizletGreen
                                )
                            }
                            IconButton(onClick = { /* Star bookmark placeholder */ }) {
                                Icon(
                                    imageVector = Icons.Default.StarOutline,
                                    contentDescription = "Bookmark",
                                    tint = TextGray
                                )
                            }
                        }

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState())
                                .padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            val backText = cards[currentIndex].back
                            val backFontSize = if (backText.length > 50) 18.sp else if (backText.length > 20) 22.sp else 26.sp
                            Text(
                                text = backText,
                                fontSize = backFontSize,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                color = Color.White
                            )
                            cards[currentIndex].pronunciation?.let {
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = it,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = QuizletCoral,
                                    textAlign = TextAlign.Center
                                )
                            }
                            cards[currentIndex].example?.let {
                                Spacer(modifier = Modifier.height(16.dp))
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = IconBg),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = it,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextWhite.copy(alpha = 0.8f),
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                                    )
                                }
                            }
                        }

                        IconButton(
                            onClick = { onPlayAudio(cards[currentIndex]) },
                            modifier = Modifier
                                .align(Alignment.End)
                                .background(QuizletGreen.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.VolumeUp,
                                contentDescription = "Listen",
                                tint = QuizletGreen
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Chạm vào thẻ để lật",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = TextGray
        )

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilledTonalButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onPrev()
                },
                enabled = currentIndex > 0,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = CardBg,
                    contentColor = Color.White,
                    disabledContainerColor = CardBg.copy(alpha = 0.5f),
                    disabledContentColor = Color.White.copy(alpha = 0.3f)
                ),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                Spacer(Modifier.width(8.dp))
                Text("Quay lại", fontWeight = FontWeight.Bold)
            }
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onNext()
                },
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = QuizletBlue,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = if (currentIndex >= cards.size - 1) "Hoàn thành" else "Tiếp theo",
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            itemsIndexed(cards) { idx, _ ->
                val isSelected = idx == currentIndex
                val isStudied = idx < currentIndex
                val width = if (isSelected) 24.dp else 8.dp
                val color = when {
                    isSelected -> IconCyan
                    isStudied -> QuizletGreen
                    else -> Color.White.copy(alpha = 0.2f)
                }
                Box(
                    modifier = Modifier
                        .size(width, 8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(color)
                )
            }
        }
    }
}

private data class LearnItem(
    val card: Flashcard,
    val mode: LearnModeStyle,
    val itemId: String
)

@OptIn(ExperimentalAnimationApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun LearnModeView(
    setId: String,
    cards: List<Flashcard>,
    onUpdateCardProgress: (String, Boolean) -> Unit,
    onResetProgress: () -> Unit,
    onFinishSession: (Int, Int, Int, Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val sharedPrefs = remember(setId) {
        context.getSharedPreferences("learn_progress_prefs", android.content.Context.MODE_PRIVATE)
    }

    // Configuration / Settings
    var includeMC by remember { mutableStateOf(true) }
    var includeTA by remember { mutableStateOf(true) }
    var settingsOpen by remember { mutableStateOf(false) }

    // Session States
    var sessionItems by remember { mutableStateOf<List<LearnItem>>(emptyList()) }
    var currentBatchIdx by remember { mutableIntStateOf(0) }
    var batchQueue by remember { mutableStateOf<List<LearnItem>>(emptyList()) }
    var queueIdx by remember { mutableIntStateOf(0) }
    var itemResults by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var firstTryResults by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var batchProgressCorrect by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }

    var answered by remember { mutableStateOf(false) }
    var selectedOption by remember { mutableStateOf<String?>(null) }
    var typedAnswer by remember { mutableStateOf("") }
    var isCorrectState by remember { mutableStateOf(false) }
    var showHint by remember { mutableStateOf(false) }
    var screen by remember { mutableStateOf("loading") }
    var isShuffled by remember { mutableStateOf(false) }

    val BATCH_SIZE = 7

    // Build session items list
    fun initSession(shuffled: Boolean = false) {
        if (cards.isEmpty() || (!includeMC && !includeTA)) return
        val list = if (shuffled) cards.shuffled() else cards
        
        val items = mutableListOf<LearnItem>()
        list.forEach { card ->
            if (includeMC) items.add(LearnItem(card, LearnModeStyle.MULTIPLE_CHOICE, "${card.id}:mc"))
            if (includeTA) items.add(LearnItem(card, LearnModeStyle.TYPE_ANSWER, "${card.id}:ta"))
        }
        sessionItems = items
        
        val totalItems = items.size
        val totalBatches = kotlin.math.max(1, kotlin.math.ceil(totalItems.toFloat() / BATCH_SIZE).toInt())
        val effectiveSize = kotlin.math.ceil(totalItems.toFloat() / totalBatches).toInt()

        val savedRound = if (shuffled) {
            android.util.Log.d("LearnProgress", "initSession: shuffled is true. Clearing learn_round_${setId}")
            sharedPrefs.edit().remove("learn_round_${setId}").commit()
            -1
        } else {
            val r = sharedPrefs.getInt("learn_round_${setId}", -1)
            android.util.Log.d("LearnProgress", "initSession: loaded learn_round_${setId} = $r")
            r
        }
        
        // Pre-populate results
        val initialResults = mutableMapOf<String, Boolean>()
        val initialProgress = mutableMapOf<Int, Int>()

        for (batchIdx in 0 until totalBatches) {
            val start = batchIdx * effectiveSize
            val size = kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
            val batchItems = items.subList(start, start + size)

            if (savedRound >= 0 && batchIdx < savedRound) {
                batchItems.forEach { item ->
                    initialResults[item.itemId] = true
                }
                initialProgress[batchIdx] = size
            } else {
                var correctCount = 0
                batchItems.forEach { item ->
                    if (item.card.correctStreak > 0) {
                        initialResults[item.itemId] = true
                        correctCount++
                    }
                }
                initialProgress[batchIdx] = correctCount
            }
        }

        var startBatchIdx = 0
        if (savedRound >= 0 && savedRound < totalBatches) {
            startBatchIdx = savedRound
        } else {
            // Find first incomplete batch
            for (batchIdx in 0 until totalBatches) {
                val start = batchIdx * effectiveSize
                val size = kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
                val correctCount = initialProgress[batchIdx] ?: 0
                if (correctCount < size) {
                    startBatchIdx = batchIdx
                    break
                }
                if (batchIdx == totalBatches - 1) {
                    startBatchIdx = totalBatches - 1
                }
            }
        }

        // Check if all batches are completed
        val allCorrect = initialProgress.all { (batchIdx, correct) ->
            val start = batchIdx * effectiveSize
            val size = kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
            correct >= size
        }

        if (allCorrect) {
            initialResults.clear()
            for (batchIdx in 0 until totalBatches) {
                initialProgress[batchIdx] = 0
            }
            startBatchIdx = 0
            val start = 0
            val size = kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
            batchQueue = items.subList(0, size)
        } else {
            val start = startBatchIdx * effectiveSize
            val size = kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
            val batchItems = items.subList(start, start + size)
            batchQueue = batchItems.filter { initialResults[it.itemId] != true }
        }

        itemResults = initialResults
        firstTryResults = initialResults
        batchProgressCorrect = initialProgress
        currentBatchIdx = startBatchIdx
        queueIdx = 0
        screen = "learning"
        
        // Reset state
        answered = false
        selectedOption = null
        typedAnswer = ""
        isCorrectState = false
        showHint = false
    }

    LaunchedEffect(cards, includeMC, includeTA, isShuffled) {
        initSession(shuffled = isShuffled)
    }

    val currentItem = batchQueue.getOrNull(queueIdx)
    val totalItems = sessionItems.size
    val totalBatches = kotlin.math.max(1, kotlin.math.ceil(totalItems.toFloat() / BATCH_SIZE).toInt())

    fun getBatchSize(batchIdx: Int): Int {
        if (totalItems == 0) return 0
        val effectiveSize = kotlin.math.ceil(totalItems.toFloat() / totalBatches).toInt()
        val start = batchIdx * effectiveSize
        return kotlin.math.min(effectiveSize, kotlin.math.max(0, totalItems - start))
    }

    fun getBatchesOffset(batchIdx: Int): Int {
        var sum = 0
        for (i in 0 until batchIdx) {
            sum += getBatchSize(i)
        }
        return sum
    }

    val actualBatchSize = getBatchSize(currentBatchIdx)
    val prevBatchesCorrect = getBatchesOffset(currentBatchIdx)
    val globalItemNum = prevBatchesCorrect + queueIdx + 1

    // Generate Multiple Choice distractor options
    val options = remember(currentItem, cards) {
        if (currentItem != null && currentItem.mode == LearnModeStyle.MULTIPLE_CHOICE) {
            val currentCard = currentItem.card
            val others = cards.filter { it.id != currentCard.id }.shuffled().take(3).map { it.front }
            (others + currentCard.front).shuffled()
        } else {
            emptyList()
        }
    }

    val handleAnswerMC = { option: String ->
        if (!answered && currentItem != null) {
            selectedOption = option
            answered = true
            val correct = option == currentItem.card.front
            isCorrectState = correct
            itemResults = itemResults + (currentItem.itemId to correct)
            if (!firstTryResults.containsKey(currentItem.itemId)) {
                firstTryResults = firstTryResults + (currentItem.itemId to correct)
            }
            
            if (correct) {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                val currentCorrect = batchProgressCorrect[currentBatchIdx] ?: 0
                batchProgressCorrect = batchProgressCorrect + (currentBatchIdx to (currentCorrect + 1))
            } else {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            }
            
            onUpdateCardProgress(currentItem.card.id, correct)
        }
    }

    val handleAnswerTA = {
        if (!answered && typedAnswer.isNotBlank() && currentItem != null) {
            answered = true
            val correct = typedAnswer.trim().equals(currentItem.card.front.trim(), ignoreCase = true)
            isCorrectState = correct
            itemResults = itemResults + (currentItem.itemId to correct)
            if (!firstTryResults.containsKey(currentItem.itemId)) {
                firstTryResults = firstTryResults + (currentItem.itemId to correct)
            }
            
            if (correct) {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                val currentCorrect = batchProgressCorrect[currentBatchIdx] ?: 0
                batchProgressCorrect = batchProgressCorrect + (currentBatchIdx to (currentCorrect + 1))
            } else {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            }
            
            onUpdateCardProgress(currentItem.card.id, correct)
        }
    }

    val handleDontKnow = {
        if (!answered && currentItem != null) {
            answered = true
            isCorrectState = false
            itemResults = itemResults + (currentItem.itemId to false)
            if (!firstTryResults.containsKey(currentItem.itemId)) {
                firstTryResults = firstTryResults + (currentItem.itemId to false)
            }
            onUpdateCardProgress(currentItem.card.id, false)
        }
    }

    val handleNext = {
        if (currentItem != null) {
            val wasCorrect = itemResults[currentItem.itemId] == true
            if (!wasCorrect) {
                // Move item to the end of the batch queue
                val updatedQueue = batchQueue.toMutableList()
                val removed = updatedQueue.removeAt(queueIdx)
                updatedQueue.add(removed)
                batchQueue = updatedQueue
                
                answered = false
                selectedOption = null
                typedAnswer = ""
                isCorrectState = false
                showHint = false
            } else {
                if (queueIdx < batchQueue.size - 1) {
                    queueIdx++
                    answered = false
                    selectedOption = null
                    typedAnswer = ""
                    isCorrectState = false
                    showHint = false
                } else {
                    val bpCorrect = batchProgressCorrect[currentBatchIdx] ?: 0
                    if (bpCorrect >= actualBatchSize) {
                        val batchStart = getBatchesOffset(currentBatchIdx)
                        val batchItems = sessionItems.subList(batchStart, batchStart + actualBatchSize)
                        val batchStudied = batchItems.size
                        val batchCorrect = batchItems.count { firstTryResults[it.itemId] == true }
                        val batchIncorrect = batchStudied - batchCorrect
                        val isFinal = currentBatchIdx + 1 >= totalBatches

                        if (isFinal) {
                            android.util.Log.d("LearnProgress", "handleNext: final batch. Clearing learn_round_${setId}")
                            sharedPrefs.edit().remove("learn_round_${setId}").commit()
                            screen = "session-complete"
                            onFinishSession(batchStudied, batchCorrect, batchIncorrect, true)
                        } else {
                            val nextRound = currentBatchIdx + 1
                            android.util.Log.d("LearnProgress", "handleNext: saving learn_round_${setId} = $nextRound")
                            sharedPrefs.edit().putInt("learn_round_${setId}", nextRound).commit()
                            screen = "batch-complete"
                            onFinishSession(batchStudied, batchCorrect, batchIncorrect, false)
                        }
                    } else {
                        // Recreate queue with wrong ones at the end
                        val batchStart = getBatchesOffset(currentBatchIdx)
                        val batchItems = sessionItems.subList(batchStart, batchStart + actualBatchSize)
                        val wrongItems = batchItems.filter { itemResults[it.itemId] != true }
                        val correctItems = batchItems.filter { itemResults[it.itemId] == true }
                        batchQueue = correctItems + wrongItems
                        queueIdx = 0
                        answered = false
                        selectedOption = null
                        typedAnswer = ""
                        isCorrectState = false
                        showHint = false
                    }
                }
            }
        }
    }

    // Auto-advance correct answers
    LaunchedEffect(answered, isCorrectState) {
        if (answered && isCorrectState) {
            delay(600)
            handleNext()
        }
    }

    val handleBatchContinue = {
        val nextBatchIdx = currentBatchIdx + 1
        val startIdx = getBatchesOffset(nextBatchIdx)
        val size = getBatchSize(nextBatchIdx)
        
        if (startIdx >= sessionItems.size) {
            android.util.Log.d("LearnProgress", "handleBatchContinue: startIdx >= size. Clearing learn_round_${setId}")
            sharedPrefs.edit().remove("learn_round_${setId}").commit()
            screen = "session-complete"
            val batchStart = getBatchesOffset(currentBatchIdx)
            val batchItems = sessionItems.subList(batchStart, batchStart + actualBatchSize)
            val batchStudied = batchItems.size
            val batchCorrect = batchItems.count { firstTryResults[it.itemId] == true }
            val batchIncorrect = batchStudied - batchCorrect
            onFinishSession(batchStudied, batchCorrect, batchIncorrect, true)
        } else {
            android.util.Log.d("LearnProgress", "handleBatchContinue: saving learn_round_${setId} = $nextBatchIdx")
            sharedPrefs.edit().putInt("learn_round_${setId}", nextBatchIdx).commit()
            val nextBatchItems = sessionItems.subList(startIdx, startIdx + size)
            batchQueue = nextBatchItems.filter { itemResults[it.itemId] != true }
            currentBatchIdx = nextBatchIdx
            queueIdx = 0
            // Keep batchProgressCorrect for nextBatchIdx as whatever was pre-populated
            screen = "learning"
            
            answered = false
            selectedOption = null
            typedAnswer = ""
            isCorrectState = false
            showHint = false
        }
    }

    val handleRestart = {
        android.util.Log.d("LearnProgress", "handleRestart: clearing learn_round_${setId}")
        sharedPrefs.edit().remove("learn_round_${setId}").commit()
        onResetProgress()
    }

    when (screen) {
        "loading" -> {
            Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = IconCyan)
            }
        }
        "batch-complete" -> {
            val completedCount = getBatchesOffset(currentBatchIdx + 1)
            val overallPct = if (totalItems > 0) (completedCount * 100) / totalItems else 0
            
            // Get unique cards in the completed batch
            val startIdx = getBatchesOffset(currentBatchIdx)
            val completedBatchItems = sessionItems.subList(startIdx, startIdx + actualBatchSize)
            val completedCards = completedBatchItems.map { it.card }.distinct()

            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Surface(
                    color = QuizletGreen.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.size(80.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Check, null, tint = QuizletGreen, modifier = Modifier.size(48.dp))
                    }
                }

                Text("Tuyệt vời!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Bạn đã hoàn thành vòng học này", style = MaterialTheme.typography.bodyMedium, color = TextGray)

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f))
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Tiến trình tổng thể", fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text("$overallPct%", fontWeight = FontWeight.Bold, color = QuizletGreen)
                        }
                        LinearProgressIndicator(
                            progress = { overallPct / 100f },
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                            color = QuizletGreen,
                            trackColor = IconBg
                        )
                    }
                }

                Text("Thuật ngữ vừa học:", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.Start))

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    completedCards.forEach { card ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBg),
                            border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.15f))
                        ) {
                            Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(card.front, fontWeight = FontWeight.Bold, color = IconCyan)
                                    Spacer(Modifier.height(4.dp))
                                    Text(card.back, style = MaterialTheme.typography.bodyMedium, color = TextGray)
                                }
                            }
                        }
                    }
                }

                Button(
                    onClick = handleBatchContinue,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White)
                ) {
                    Text("Tiếp tục", fontWeight = FontWeight.Bold)
                }
            }
        }
        "session-complete" -> {
            val totalStudied = firstTryResults.size
            val totalCorrect = firstTryResults.values.count { it }
            val accuracy = if (totalStudied > 0) (totalCorrect * 100) / totalStudied else 0

            Column(
                modifier = modifier
                    .fillMaxSize()
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(Icons.Default.EmojiEvents, null, modifier = Modifier.size(80.dp), tint = QuizletAmber)
                Spacer(Modifier.height(16.dp))
                Text(
                    text = when {
                        accuracy >= 80 -> "Xuất sắc!"
                        accuracy >= 50 -> "Khá tốt!"
                        else -> "Cần cố gắng thêm!"
                    },
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text("Bạn đã hoàn thành phiên học", style = MaterialTheme.typography.bodyMedium, color = TextGray)

                Spacer(Modifier.height(32.dp))

                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(160.dp)) {
                    CircularProgressIndicator(
                        progress = { accuracy / 100f },
                        modifier = Modifier.size(150.dp),
                        color = QuizletGreen,
                        strokeWidth = 10.dp,
                        trackColor = CardBg
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("$accuracy%", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Chính xác", style = MaterialTheme.typography.labelSmall, color = TextGray)
                    }
                }

                Spacer(Modifier.height(32.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = QuizletGreen.copy(alpha = 0.08f)),
                        border = BorderStroke(1.dp, QuizletGreen.copy(alpha = 0.3f))
                    ) {
                        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Đúng", color = QuizletGreen, fontWeight = FontWeight.Bold)
                            Text("$totalCorrect", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = QuizletCoral.copy(alpha = 0.08f)),
                        border = BorderStroke(1.dp, QuizletCoral.copy(alpha = 0.3f))
                    ) {
                        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Sai", color = QuizletCoral, fontWeight = FontWeight.Bold)
                            Text("${totalStudied - totalCorrect}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }

                Spacer(Modifier.height(48.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    FilledTonalButton(
                        onClick = handleRestart,
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = CardBg,
                            contentColor = Color.White
                        ),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
                    ) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Học lại", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        else -> {
            if (currentItem == null) return
            
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header settings strip
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { settingsOpen = !settingsOpen }) {
                        Icon(
                            Icons.Default.Settings,
                            null,
                            tint = if (settingsOpen) IconCyan else TextGray
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FilterChip(
                            selected = isShuffled,
                            onClick = {
                                isShuffled = !isShuffled
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            },
                            label = { Text("Xáo trộn") }
                        )
                    }
                }

                if (settingsOpen) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.2f))
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Cài đặt học", fontWeight = FontWeight.Bold, color = Color.White)
                            Divider(color = Color.White.copy(alpha = 0.1f))
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable {
                                    if (!(includeMC && !includeTA)) {
                                        includeMC = !includeMC
                                    }
                                },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Trắc nghiệm", color = TextWhite)
                                Checkbox(
                                    checked = includeMC,
                                    onCheckedChange = {
                                        if (!(includeMC && !includeTA)) {
                                            includeMC = it
                                        }
                                    },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = QuizletBlue,
                                        uncheckedColor = TextGray
                                    )
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable {
                                    if (!(includeTA && !includeMC)) {
                                        includeTA = !includeTA
                                    }
                                },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Tự luận", color = TextWhite)
                                Checkbox(
                                    checked = includeTA,
                                    onCheckedChange = {
                                        if (!(includeTA && !includeMC)) {
                                            includeTA = it
                                        }
                                    },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = QuizletBlue,
                                        uncheckedColor = TextGray
                                    )
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Quizlet Progress bar
                QuizletProgressBar(
                    totalBatches = totalBatches,
                    currentBatchIdx = currentBatchIdx,
                    queueIdx = queueIdx,
                    actualBatchSize = actualBatchSize,
                    globalItemNum = globalItemNum,
                    totalItems = totalItems,
                    batchProgressCorrect = batchProgressCorrect,
                    sessionItems = sessionItems
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Question card (displays Definition)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.2f))
                ) {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .fillMaxHeight()
                                .width(6.dp)
                                .background(IconCyan)
                        )

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp)
                                .padding(start = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                color = IconCyan.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Text(
                                    text = "ĐỊNH NGHĨA",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IconCyan
                                )
                            }
                            Spacer(Modifier.height(16.dp))
                            
                            val backText = currentItem.card.back
                            val backFontSize = if (backText.length > 40) 20.sp else 24.sp
                            Text(
                                text = backText,
                                fontSize = backFontSize,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (currentItem.mode == LearnModeStyle.MULTIPLE_CHOICE) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        options.forEachIndexed { idx, option ->
                            val isCorrect = option == currentItem.card.front
                            val isSelected = selectedOption == option
                            
                            val letter = when (idx) {
                                0 -> "A"
                                1 -> "B"
                                2 -> "C"
                                else -> "D"
                            }

                            val bgColor = when {
                                !answered && isSelected -> QuizletBlue.copy(alpha = 0.12f)
                                answered && isCorrect -> QuizletGreen.copy(alpha = 0.1f)
                                answered && isSelected && !isCorrect -> QuizletCoral.copy(alpha = 0.1f)
                                else -> CardBg
                            }
                            val borderColor = when {
                                !answered && isSelected -> QuizletBlue
                                answered && isCorrect -> QuizletGreen
                                answered && isSelected && !isCorrect -> QuizletCoral
                                else -> Color.White.copy(alpha = 0.12f)
                            }
                            
                            val letterColor = when {
                                !answered && isSelected -> QuizletBlue
                                answered && isCorrect -> QuizletGreen
                                answered && isSelected && !isCorrect -> QuizletCoral
                                else -> TextGray
                            }
                            
                            val letterBg = when {
                                !answered && isSelected -> QuizletBlue.copy(alpha = 0.15f)
                                answered && isCorrect -> QuizletGreen.copy(alpha = 0.15f)
                                answered && isSelected && !isCorrect -> QuizletCoral.copy(alpha = 0.15f)
                                else -> IconBg
                            }

                            OutlinedCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(enabled = !answered) { 
                                        handleAnswerMC(option) 
                                    },
                                colors = CardDefaults.outlinedCardColors(containerColor = bgColor),
                                border = BorderStroke(if (isSelected || (answered && isCorrect)) 2.dp else 1.5.dp, borderColor),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(letterBg),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = letter,
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = letterColor
                                        )
                                    }
                                    
                                    Spacer(modifier = Modifier.width(12.dp))
                                    
                                    Text(
                                        text = option,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Medium,
                                        color = Color.White,
                                        modifier = Modifier.weight(1f)
                                    )
                                    
                                    if (answered && isCorrect) {
                                        Icon(Icons.Default.CheckCircle, null, tint = QuizletGreen)
                                    }
                                    if (answered && isSelected && !isCorrect) {
                                        Icon(Icons.Default.Cancel, null, tint = QuizletCoral)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = typedAnswer,
                        onValueChange = { typedAnswer = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Nhập thuật ngữ tương ứng...") },
                        placeholder = { Text("Nhập thuật ngữ...") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = IconCyan,
                            focusedLabelColor = IconCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            unfocusedLabelColor = TextGray,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            cursorColor = IconCyan,
                            disabledBorderColor = when {
                                answered && isCorrectState -> QuizletGreen
                                answered && !isCorrectState -> QuizletCoral
                                else -> Color.White.copy(alpha = 0.1f)
                            },
                            disabledTextColor = when {
                                answered && isCorrectState -> QuizletGreen
                                answered && !isCorrectState -> QuizletCoral
                                else -> Color.White
                            },
                            disabledLabelColor = when {
                                answered && isCorrectState -> QuizletGreen
                                answered && !isCorrectState -> QuizletCoral
                                else -> TextGray
                            },
                            disabledContainerColor = when {
                                answered && isCorrectState -> QuizletGreen.copy(alpha = 0.05f)
                                answered && !isCorrectState -> QuizletCoral.copy(alpha = 0.05f)
                                else -> Color.Transparent
                            }
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { 
                            handleAnswerTA() 
                        }),
                        enabled = !answered
                    )
                    
                    if (answered && !isCorrectState) {
                        Spacer(Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = QuizletGreen.copy(alpha = 0.08f)),
                            border = BorderStroke(1.dp, QuizletGreen.copy(alpha = 0.3f))
                        ) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, null, tint = QuizletGreen)
                                Spacer(Modifier.width(10.dp))
                                Text("Đáp án đúng: ", style = MaterialTheme.typography.bodyMedium, color = TextGray)
                                Text(currentItem.card.front, fontWeight = FontWeight.Bold, color = QuizletGreen)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(32.dp))

                val buttonEnabled = (currentItem.mode == LearnModeStyle.MULTIPLE_CHOICE && answered) ||
                                    (currentItem.mode == LearnModeStyle.TYPE_ANSWER && (typedAnswer.isNotBlank() || answered))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (!answered) {
                        OutlinedButton(
                            onClick = handleDontKnow,
                            modifier = Modifier.weight(1f).height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.2f))
                        ) {
                            Text("Chưa biết", color = TextGray, fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = {
                            if (!answered) {
                                if (currentItem.mode == LearnModeStyle.TYPE_ANSWER) {
                                    handleAnswerTA()
                                }
                            } else {
                                handleNext()
                            }
                        },
                        enabled = buttonEnabled,
                        modifier = Modifier.weight(if (answered) 1f else 1.5f).height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        val buttonText = when {
                            !answered -> "Kiểm tra"
                            else -> "Tiếp tục"
                        }
                        Text(
                            text = buttonText,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuizletProgressBar(
    totalBatches: Int,
    currentBatchIdx: Int,
    queueIdx: Int,
    actualBatchSize: Int,
    globalItemNum: Int,
    totalItems: Int,
    batchProgressCorrect: Map<Int, Int>,
    sessionItems: List<LearnItem>
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Vòng học ${currentBatchIdx + 1} / $totalBatches",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = IconCyan
            )
            Text(
                text = "Câu $globalItemNum / $totalItems",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextGray
            )
        }
        
        Spacer(modifier = Modifier.height(10.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth().height(8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            for (batchIdx in 0 until totalBatches) {
                val isCompleted = batchIdx < currentBatchIdx
                val isCurrent = batchIdx == currentBatchIdx
                val progress = if (isCurrent) queueIdx.toFloat() / actualBatchSize else if (isCompleted) 1f else 0f
                
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(4.dp))
                        .background(CardBg)
                ) {
                    if (progress > 0f) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .fillMaxHeight()
                                .background(if (isCompleted || isCurrent) QuizletGreen else TextGray)
                        )
                    }
                }
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
        Icon(Icons.AutoMirrored.Filled.Assignment, null, modifier = Modifier.size(64.dp), tint = IconCyan)
        Spacer(Modifier.height(16.dp))
        Text("Kiểm tra", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(Modifier.height(8.dp))
        Text("$cardCount thẻ trong bộ này", style = MaterialTheme.typography.bodyMedium, color = TextGray)
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onStart,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White)
        ) {
            Text("Bắt đầu kiểm tra", fontWeight = FontWeight.Bold)
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
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = IconCyan,
            trackColor = CardBg
        )
        Spacer(Modifier.height(4.dp))
        Text("Câu ${currentIndex + 1} / ${questions.size}", style = MaterialTheme.typography.bodySmall, color = TextGray)

        Spacer(Modifier.height(24.dp))

        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.2f))
        ) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(color = IconCyan.copy(alpha = 0.1f), shape = RoundedCornerShape(20.dp)) {
                    Text(
                        when (q.type) {
                            TestQuestionType.MULTIPLE_CHOICE -> "Chọn đáp án đúng"
                            TestQuestionType.TRUE_FALSE -> "Đúng hay sai?"
                            TestQuestionType.TYPE_ANSWER -> "Nhập đáp án"
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = IconCyan
                    )
                }
                Spacer(Modifier.height(16.dp))
                Text(q.question, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, color = Color.White)
            }
        }

        Spacer(Modifier.height(24.dp))

        when (q.type) {
            TestQuestionType.MULTIPLE_CHOICE -> {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    q.options.forEach { option ->
                        val isSelected = selectedAnswer == option
                        val bgColor = if (isSelected) QuizletBlue.copy(alpha = 0.12f) else CardBg
                        val borderColor = if (isSelected) QuizletBlue else Color.White.copy(alpha = 0.12f)
                        OutlinedCard(
                            modifier = Modifier.fillMaxWidth().clickable { onAnswer(option) },
                            colors = CardDefaults.outlinedCardColors(containerColor = bgColor),
                            border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(borderColor))
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(option, Modifier.weight(1f), color = Color.White)
                            }
                        }
                    }
                }
            }
            TestQuestionType.TRUE_FALSE -> {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    listOf(true to "Đúng", false to "Sai").forEach { (value, label) ->
                        val isSelected = selectedAnswer == value
                        val bgColor = if (isSelected) QuizletBlue.copy(alpha = 0.12f) else CardBg
                        val borderColor = if (isSelected) QuizletBlue else Color.White.copy(alpha = 0.12f)
                        OutlinedCard(
                            modifier = Modifier.weight(1f).clickable { onAnswer(value) },
                            colors = CardDefaults.outlinedCardColors(containerColor = bgColor),
                            border = BorderStroke(1.5.dp, borderColor)
                        ) {
                            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(if (value) Icons.Default.Check else Icons.Default.Close, null, modifier = Modifier.size(32.dp),
                                    tint = if (isSelected) QuizletBlue else TextGray)
                                Text(label, color = Color.White)
                            }
                        }
                    }
                }
            }
            TestQuestionType.TYPE_ANSWER -> {
                var typed by remember(currentIndex) { mutableStateOf((selectedAnswer as? String) ?: "") }
                OutlinedTextField(
                    value = typed,
                    onValueChange = {
                        typed = it
                        onAnswer(it)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Nhập đáp án...") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = IconCyan,
                        focusedLabelColor = IconCyan,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                        unfocusedLabelColor = TextGray,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = IconCyan
                    )
                )
            }
        }

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White)
        ) {
            Text(if (currentIndex < questions.size - 1) "Tiếp" else "Xong", fontWeight = FontWeight.Bold)
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
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(Modifier.height(8.dp))
        Text("$accuracy%", style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold, color = QuizletBlue)
        Text("Đúng $correct / ${questions.size} câu", style = MaterialTheme.typography.bodyMedium, color = TextGray)

        Spacer(Modifier.height(24.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, QuizletGreen.copy(alpha = 0.3f))
            ) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Check, null, tint = QuizletGreen, modifier = Modifier.size(24.dp))
                    Text("$correct", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = QuizletGreen)
                    Text("Đúng", style = MaterialTheme.typography.bodySmall, color = TextGray)
                }
            }
            Card(shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, QuizletCoral.copy(alpha = 0.3f))
            ) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Close, null, tint = QuizletCoral, modifier = Modifier.size(24.dp))
                    Text("${questions.size - correct}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = QuizletCoral)
                    Text("Sai", style = MaterialTheme.typography.bodySmall, color = TextGray)
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onRestart,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White)
        ) {
            Icon(Icons.Default.Refresh, null)
            Spacer(Modifier.width(8.dp))
            Text("Làm lại", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onClose,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
        ) {
            Text("Đóng", color = Color.White, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MatchModeView(
    terms: List<Pair<Int, String>>,
    defs: List<Pair<Int, String>>,
    selected: List<Int>,
    mismatched: List<Int>,
    matched: Set<Int>,
    timer: Int,
    done: Boolean,
    onTileClick: (Int) -> Unit,
    onRestart: () -> Unit,
    modifier: Modifier = Modifier
) {
    val secs = timer / 10
    val tenths = timer % 10
    val timeFormatted = "$secs.${tenths}s"

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Ghép thẻ",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Surface(
                color = IconCyan.copy(alpha = 0.08f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, IconCyan.copy(alpha = 0.25f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = "Time",
                        modifier = Modifier.size(16.dp),
                        tint = IconCyan
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = timeFormatted,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium,
                        color = IconCyan
                    )
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        if (done) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(
                    color = QuizletAmber.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(32.dp),
                    modifier = Modifier.padding(bottom = 16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.EmojiEvents,
                        contentDescription = null,
                        modifier = Modifier
                            .size(96.dp)
                            .padding(20.dp),
                        tint = QuizletAmber
                    )
                }
                
                Text(
                    text = "Hoàn thành xuất sắc!",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                Spacer(Modifier.height(8.dp))
                
                Text(
                    text = "Thời gian hoàn thành của bạn:",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextGray
                )
                
                Text(
                    text = timeFormatted,
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = QuizletBlue
                )
                
                Spacer(Modifier.height(32.dp))
                
                Button(
                    onClick = onRestart,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = QuizletBlue, contentColor = Color.White),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Chơi lại",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        } else {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    terms.forEach { (id, text) ->
                        val isSelected = selected.contains(id)
                        val isMismatched = mismatched.contains(id)
                        val isMatched = matched.contains(id)
                        
                        MatchTile(
                            id = id,
                            text = text,
                            isSelected = isSelected,
                            isMismatched = isMismatched,
                            isMatched = isMatched,
                            isDef = false,
                            onClick = { onTileClick(id) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    defs.forEach { (id, text) ->
                        val isSelected = selected.contains(id)
                        val isMismatched = mismatched.contains(id)
                        val isMatched = matched.contains(id)
                        
                        MatchTile(
                            id = id,
                            text = text,
                            isSelected = isSelected,
                            isMismatched = isMismatched,
                            isMatched = isMatched,
                            isDef = true,
                            onClick = { onTileClick(id) },
                            modifier = Modifier.weight(1f)
                        )
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
    isMismatched: Boolean,
    isMatched: Boolean,
    isDef: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val alphaAnim by animateFloatAsState(
        targetValue = if (isMatched) 0.2f else 1.0f,
        animationSpec = tween(400),
        label = "alpha"
    )
    
    val scaleAnim by animateFloatAsState(
        targetValue = when {
            isMismatched -> 0.95f
            isSelected -> 1.05f
            else -> 1.0f
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "scale"
    )

    val cardBgGradient = when {
        isMatched -> Brush.verticalGradient(
            colors = listOf(Color(0xFF00C853).copy(alpha = 0.08f), Color(0xFF00C853).copy(alpha = 0.02f))
        )
        isMismatched -> Brush.verticalGradient(
            colors = listOf(Color(0xFFFF3B30).copy(alpha = 0.15f), Color(0xFFFF3B30).copy(alpha = 0.05f))
        )
        isSelected -> Brush.verticalGradient(
            colors = listOf(Color(0xFF4255FF).copy(alpha = 0.25f), Color(0xFF38BDF8).copy(alpha = 0.1f))
        )
        else -> Brush.verticalGradient(
            colors = listOf(Color(0xFF1E214A).copy(alpha = 0.7f), Color(0xFF161A3F).copy(alpha = 0.9f))
        )
    }
    
    val borderColor = when {
        isMatched -> Color(0xFF00C853)
        isMismatched -> Color(0xFFFF3B30)
        isSelected -> Color(0xFF38BDF8)
        else -> Color(0xFF2E3272)
    }

    val borderWidth = when {
        isMatched || isMismatched || isSelected -> 2.dp
        else -> 1.dp
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer {
                alpha = alphaAnim
                scaleX = scaleAnim
                scaleY = scaleAnim
            }
            .clip(RoundedCornerShape(16.dp))
            .background(cardBgGradient)
            .border(borderWidth, borderColor, RoundedCornerShape(16.dp))
            .clickable(enabled = !isMatched && !isMismatched) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis,
                color = if (isMatched) Color(0xFF00C853) else Color.White
            )
            
            if (isMatched) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier
                        .size(16.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = 4.dp, y = (-2).dp),
                    tint = Color(0xFF00C853)
                )
            }
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
