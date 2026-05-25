package com.example.smartenglish.presentation.cards

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CardEditorState(
    val card: Flashcard? = null,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val isNewCard: Boolean = true,
    val saveSuccess: Boolean = false
)

sealed class CardEditorEvent {
    data class UpdateFront(val front: String) : CardEditorEvent()
    data class UpdateBack(val back: String) : CardEditorEvent()
    data class UpdatePronunciation(val pronunciation: String?) : CardEditorEvent()
    data class UpdateExample(val example: String?) : CardEditorEvent()
    data class UpdateNote(val note: String?) : CardEditorEvent()
    data object Save : CardEditorEvent()
    data object ClearError : CardEditorEvent()
}

@HiltViewModel
class CardEditorViewModel @Inject constructor(
    private val cardRepository: CardRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val setId: String = savedStateHandle.get<String>("setId") ?: ""
    private val cardId: String? = savedStateHandle.get<String>("cardId")

    private val _state = MutableStateFlow(CardEditorState())
    val state: StateFlow<CardEditorState> = _state.asStateFlow()

    init {
        if (cardId != null) {
            loadCard(cardId)
        } else {
            _state.update { it.copy(isNewCard = true) }
        }
    }

    private fun loadCard(cardId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = cardRepository.getCardById(cardId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(card = result.data, isLoading = false, isNewCard = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    fun onEvent(event: CardEditorEvent) {
        when (event) {
            is CardEditorEvent.UpdateFront -> {
                _state.update { it.copy(card = it.card?.copy(front = event.front) ?: createNewCard(front = event.front)) }
            }
            is CardEditorEvent.UpdateBack -> {
                _state.update { it.copy(card = it.card?.copy(back = event.back) ?: createNewCard(back = event.back)) }
            }
            is CardEditorEvent.UpdatePronunciation -> {
                _state.update { it.copy(card = it.card?.copy(pronunciation = event.pronunciation)) }
            }
            is CardEditorEvent.UpdateExample -> {
                _state.update { it.copy(card = it.card?.copy(example = event.example)) }
            }
            is CardEditorEvent.UpdateNote -> {
                _state.update { it.copy(card = it.card?.copy(note = event.note)) }
            }
            CardEditorEvent.Save -> saveCard()
            CardEditorEvent.ClearError -> _state.update { it.copy(error = null) }
        }
    }

    private fun createNewCard(front: String = "", back: String = ""): Flashcard {
        return Flashcard(
            id = "",
            setId = setId,
            front = front,
            back = back,
            pronunciation = null,
            example = null,
            note = null,
            imageUrl = null,
            createdAt = null,
            updatedAt = null
        )
    }

    private fun saveCard() {
        val card = _state.value.card ?: return

        if (card.front.isBlank() || card.back.isBlank()) {
            _state.update { it.copy(error = "Front and back are required") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, error = null) }

            val result = if (_state.value.isNewCard) {
                cardRepository.createCard(
                    setId = setId,
                    front = card.front,
                    back = card.back,
                    pronunciation = card.pronunciation,
                    example = card.example,
                    note = card.note,
                    imageUrl = card.imageUrl
                )
            } else {
                cardRepository.updateCard(
                    id = card.id,
                    front = card.front,
                    back = card.back,
                    pronunciation = card.pronunciation,
                    example = card.example,
                    note = card.note,
                    imageUrl = card.imageUrl
                )
            }

            when (result) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isSaving = false, saveSuccess = true) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isSaving = false) }
                }
                else -> {}
            }
        }
    }

    fun setCardData(card: Flashcard) {
        _state.update { it.copy(card = card) }
    }
}
