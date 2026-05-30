package com.example.smartenglish.presentation.study

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.SessionCompleteResult
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.domain.repository.GamificationRepository
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.StudyRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class StudyAnswer(val value: Int) {
    AGAIN(0),
    HARD(1),
    GOOD(2),
    EASY(3)
}

data class StudyState(
    val set: FlashcardSet? = null,
    val cards: List<Flashcard> = emptyList(),
    val currentIndex: Int = 0,
    val isFlipped: Boolean = false,
    val correctCount: Int = 0,
    val incorrectCount: Int = 0,
    val isLoading: Boolean = false,
    val isFinished: Boolean = false,
    val sessionId: String? = null,
    val startTime: Long = 0,
    val error: String? = null,
    val studiedCardIds: Set<String> = emptySet(),
    val incorrectCardIds: Set<String> = emptySet()
) {
    val currentCard: Flashcard? get() = cards.getOrNull(currentIndex)
    val totalCards: Int get() = cards.size
    val progress: Float get() = if (totalCards > 0) (currentIndex + 1).toFloat() / totalCards else 0f
    val isLastCard: Boolean get() = currentIndex >= totalCards - 1
}

sealed class StudyEvent {
    data object FlipCard : StudyEvent()
    data class AnswerCard(val answer: StudyAnswer) : StudyEvent()
    data object NextCard : StudyEvent()
    data object Restart : StudyEvent()
    data object FinishSession : StudyEvent()
    data class UpdateCardStudyProgress(val cardId: String, val correct: Boolean) : StudyEvent()
    data class FinishCustomSession(val cardsStudied: Int, val correctCount: Int, val incorrectCount: Int) : StudyEvent()
}

@HiltViewModel
class StudyViewModel @Inject constructor(
    private val setRepository: SetRepository,
    private val cardRepository: CardRepository,
    private val studyRepository: StudyRepository,
    private val gamificationRepository: GamificationRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private var setId: String = savedStateHandle.get<String>("setId") ?: ""

    private val _state = MutableStateFlow(StudyState())
    val state: StateFlow<StudyState> = _state.asStateFlow()

    // Kết quả gamification sau khi hoàn thành session (XP, level up, achievements)
    private val _gamificationResult = MutableStateFlow<SessionCompleteResult?>(null)
    val gamificationResult: StateFlow<SessionCompleteResult?> = _gamificationResult.asStateFlow()

    private var initialized = false

    fun setSetId(id: String) {
        if (initialized) return
        if (id.isBlank()) return
        setId = id
        initialized = true
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            // Load set info
            when (val setResult = setRepository.getSetById(setId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(set = setResult.data) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = setResult.message, isLoading = false) }
                    return@launch
                }
                else -> {}
            }

            // Load cards from server (not just local cache)
            val cards = cardRepository.getCardsBySetList(setId)
            if (cards.isEmpty()) {
                // If still no cards, try getCardsForStudy for due cards
                val dueCards = cardRepository.getCardsForStudy(setId)
                _state.update { it.copy(cards = dueCards.ifEmpty { emptyList() }, isLoading = false) }
            } else {
                _state.update { it.copy(cards = cards, isLoading = false) }
            }

            // Start study session
            startSession()
        }
    }

    private fun startSession() {
        viewModelScope.launch {
            _state.update { it.copy(startTime = System.currentTimeMillis()) }
            when (val result = studyRepository.createStudySession(setId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(sessionId = result.data.id) }
                }
                is ApiResult.Error -> {
                    // Continue without session ID
                }
                else -> {}
            }
        }
    }

    fun onEvent(event: StudyEvent) {
        when (event) {
            StudyEvent.FlipCard -> flipCard()
            is StudyEvent.AnswerCard -> answerCard(event.answer)
            StudyEvent.NextCard -> nextCard()
            StudyEvent.Restart -> restart()
            StudyEvent.FinishSession -> finishSession()
            is StudyEvent.UpdateCardStudyProgress -> {
                viewModelScope.launch {
                    cardRepository.updateCardStudyProgress(event.cardId, event.correct)
                }
            }
            is StudyEvent.FinishCustomSession -> {
                finishCustomSession(event.cardsStudied, event.correctCount, event.incorrectCount)
            }
        }
    }

    private fun flipCard() {
        _state.update { it.copy(isFlipped = !it.isFlipped) }
    }

    private fun answerCard(answer: StudyAnswer) {
        val currentCard = _state.value.currentCard ?: return

        viewModelScope.launch {
            val correct = answer.value >= StudyAnswer.GOOD.value
            cardRepository.updateCardStudyProgress(currentCard.id, correct)

            _state.update { state ->
                state.copy(
                    correctCount = if (correct) state.correctCount + 1 else state.correctCount,
                    incorrectCount = if (!correct) state.incorrectCount + 1 else state.incorrectCount,
                    studiedCardIds = state.studiedCardIds + currentCard.id,
                    incorrectCardIds = if (!correct) state.incorrectCardIds + currentCard.id else state.incorrectCardIds
                )
            }

            delay(300)
            nextCard()
        }
    }

    private fun nextCard() {
        _state.update { state ->
            if (state.isLastCard) {
                state.copy(isFinished = true)
            } else {
                state.copy(
                    currentIndex = state.currentIndex + 1,
                    isFlipped = false
                )
            }
        }
    }

    private fun restart() {
        _state.update { state ->
            state.copy(
                currentIndex = 0,
                isFlipped = false,
                correctCount = 0,
                incorrectCount = 0,
                isFinished = false,
                studiedCardIds = emptySet(),
                incorrectCardIds = emptySet(),
                startTime = System.currentTimeMillis()
            )
        }
        startSession()
    }

    private fun finishSession() {
        viewModelScope.launch {
            val sessionId = _state.value.sessionId
            val totalCards = _state.value.totalCards
            val correctCount = _state.value.correctCount

            if (sessionId != null) {
                val duration = ((System.currentTimeMillis() - _state.value.startTime) / 1000).toInt()
                studyRepository.updateStudySession(
                    id = sessionId,
                    cardsStudied = _state.value.currentIndex + 1,
                    correctCount = correctCount,
                    incorrectCount = _state.value.incorrectCount,
                    duration = duration
                )
            }

            // Trigger gamification (XP + streak + achievements)
            val accuracy = if (totalCards > 0) (correctCount * 100) / totalCards else 0
            val cardsStudied = _state.value.currentIndex + 1
            val gamResult = gamificationRepository.triggerLearnComplete(accuracy, cardsStudied)
            if (gamResult is ApiResult.Success) {
                _gamificationResult.value = gamResult.data
            }

            // Đánh dấu session hoàn thành để Screen navigate back
            _state.update { it.copy(isFinished = true) }
        }
    }

    private fun finishCustomSession(cardsStudied: Int, correctCount: Int, incorrectCount: Int) {
        viewModelScope.launch {
            val sessionId = _state.value.sessionId
            if (sessionId != null) {
                val duration = ((System.currentTimeMillis() - _state.value.startTime) / 1000).toInt()
                studyRepository.updateStudySession(
                    id = sessionId,
                    cardsStudied = cardsStudied,
                    correctCount = correctCount,
                    incorrectCount = incorrectCount,
                    duration = duration
                )
            }
            // Trigger gamification
            val accuracy = if (cardsStudied > 0) (correctCount * 100) / cardsStudied else 0
            val gamResult = gamificationRepository.triggerLearnComplete(accuracy, cardsStudied)
            if (gamResult is ApiResult.Success) {
                _gamificationResult.value = gamResult.data
            }
        }
    }

    /** Gọi sau khi đã show gamification UI để reset state */
    fun clearGamificationResult() {
        _gamificationResult.value = null
    }
}
