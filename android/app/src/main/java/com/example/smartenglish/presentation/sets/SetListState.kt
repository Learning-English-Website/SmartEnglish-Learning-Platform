package com.example.smartenglish.presentation.sets

import com.example.smartenglish.domain.model.FlashcardSet

enum class LibraryTab { MY_SETS, COMMUNITY }

enum class SetFilter { ALL, PUBLIC, PRIVATE }

data class SetListState(
    val mySets: List<FlashcardSet> = emptyList(),
    val communitySets: List<FlashcardSet> = emptyList(),
    val displayedSets: List<FlashcardSet> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val selectedTab: LibraryTab = LibraryTab.MY_SETS,
    val selectedFilter: SetFilter = SetFilter.ALL
)

sealed class SetListEvent {
    data class SearchSets(val query: String) : SetListEvent()
    data class CreateSet(val title: String, val description: String?, val language: String?, val isPublic: Boolean) : SetListEvent()
    data class DeleteSet(val setId: String) : SetListEvent()
    data object Refresh : SetListEvent()
    data object ClearError : SetListEvent()
    data class SelectTab(val tab: LibraryTab) : SetListEvent()
    data class SelectFilter(val filter: SetFilter) : SetListEvent()
}
