package com.example.smartenglish.presentation.study

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.repository.CardRepository
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
    val studiedCardIds: Set<String> = emptySet()
) {
    val currentCard: Flashcard? get() = cards.getOrNull(currentIndex)
    val totalCards: Int get() = cards.size
    val progress: Float get() = if (totalCards > 0) currentIndex.toFloat() / totalCards else 0f
    val isLastCard: Boolean get() = currentIndex >= totalCards - 1
}

sealed class StudyEvent {
    data object FlipCard : StudyEvent()
    data class AnswerCard(val answer: StudyAnswer) : StudyEvent()
    data object NextCard : StudyEvent()
    data object Restart : StudyEvent()
    data object FinishSession : StudyEvent()
}

@HiltViewModel
class StudyViewModel @Inject constructor(
    private val setRepository: SetRepository,
    private val cardRepository: CardRepository,
    private val studyRepository: StudyRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val setId: String = savedStateHandle.get<String>("setId") ?: ""

    private val _state = MutableStateFlow(StudyState())
    val state: StateFlow<StudyState> = _state.asStateFlow()

    init {
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

            // Load cards for study
            val cards = cardRepository.getCardsForStudy(setId)
            if (cards.isEmpty()) {
                // If no cards due for review, load all cards
                val allCards = cardRepository.getCardsBySet(setId).first()
                _state.update { it.copy(cards = allCards, isLoading = false) }
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
        }
    }

    private fun flipCard() {
        _state.update { it.copy(isFlipped = !it.isFlipped) }
    }

    private fun answerCard(answer: StudyAnswer) {
        val currentCard = _state.value.currentCard ?: return

        viewModelScope.launch {
            // Update card study progress (for spaced repetition)
            val correct = answer.value >= StudyAnswer.GOOD.value
            cardRepository.updateCardStudyProgress(currentCard.id, correct)

            // Update counts
            _state.update { state ->
                state.copy(
                    correctCount = if (correct) state.correctCount + 1 else state.correctCount,
                    incorrectCount = if (!correct) state.incorrectCount + 1 else state.incorrectCount,
                    studiedCardIds = state.studiedCardIds + currentCard.id
                )
            }

            // Auto advance after short delay
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
                startTime = System.currentTimeMillis()
            )
        }
        startSession()
    }

    private fun finishSession() {
        viewModelScope.launch {
            val sessionId = _state.value.sessionId
            if (sessionId != null) {
                val duration = ((System.currentTimeMillis() - _state.value.startTime) / 1000).toInt()
                studyRepository.updateStudySession(
                    id = sessionId,
                    cardsStudied = _state.value.currentIndex + 1,
                    correctCount = _state.value.correctCount,
                    incorrectCount = _state.value.incorrectCount,
                    duration = duration
                )
            }
        }
    }
}
