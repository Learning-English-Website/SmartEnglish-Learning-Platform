package com.example.smartenglish.presentation.sets

import com.example.smartenglish.domain.model.FlashcardSet

data class SetListState(
    val sets: List<FlashcardSet> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val searchQuery: String = ""
)

sealed class SetListEvent {
    data class SearchSets(val query: String) : SetListEvent()
    data class CreateSet(val title: String, val description: String?, val language: String?, val isPublic: Boolean) : SetListEvent()
    data class DeleteSet(val setId: String) : SetListEvent()
    data object Refresh : SetListEvent()
    data object ClearError : SetListEvent()
}
