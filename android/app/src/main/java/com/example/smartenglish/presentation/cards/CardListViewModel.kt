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

data class CardListState(
    val cards: List<Flashcard> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val searchQuery: String = ""
)

sealed class CardListEvent {
    data class SearchCards(val query: String) : CardListEvent()
    data class DeleteCard(val cardId: String) : CardListEvent()
    data object Refresh : CardListEvent()
    data object ClearError : CardListEvent()
}

@HiltViewModel
class CardListViewModel @Inject constructor(
    private val cardRepository: CardRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    val setId: String = savedStateHandle.get<String>("setId") ?: ""

    private val _state = MutableStateFlow(CardListState())
    val state: StateFlow<CardListState> = _state.asStateFlow()

    init {
        observeCards()
        refresh()
    }

    private fun observeCards() {
        viewModelScope.launch {
            cardRepository.getCardsBySet(setId).collect { cards ->
                _state.update { it.copy(cards = cards) }
            }
        }
    }

    fun onEvent(event: CardListEvent) {
        when (event) {
            is CardListEvent.SearchCards -> searchCards(event.query)
            is CardListEvent.DeleteCard -> deleteCard(event.cardId)
            CardListEvent.Refresh -> refresh()
            CardListEvent.ClearError -> _state.update { it.copy(error = null) }
        }
    }

    private fun searchCards(query: String) {
        _state.update { it.copy(searchQuery = query) }
        if (query.isBlank()) {
            refresh()
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = cardRepository.searchCards(setId, query)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(cards = result.data, isLoading = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    private fun deleteCard(cardId: String) {
        viewModelScope.launch {
            when (val result = cardRepository.deleteCard(cardId)) {
                is ApiResult.Success -> refresh()
                is ApiResult.Error -> _state.update { it.copy(error = result.message) }
                else -> {}
            }
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true, error = null) }
            cardRepository.syncCards(setId)
            _state.update { it.copy(isRefreshing = false) }
        }
    }
}
