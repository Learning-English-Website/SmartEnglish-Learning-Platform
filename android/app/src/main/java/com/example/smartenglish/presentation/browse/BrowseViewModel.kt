package com.example.smartenglish.presentation.browse

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SortOption { NEWEST, MOST_CARDS, POPULAR }

data class BrowseState(
    val sets: List<FlashcardSet> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val sortOption: SortOption = SortOption.NEWEST,
    val hasMore: Boolean = false,
    val page: Int = 1
)

@HiltViewModel
class BrowseViewModel @Inject constructor(
    private val setRepository: SetRepository
) : ViewModel() {

    private val _state = MutableStateFlow(BrowseState())
    val state: StateFlow<BrowseState> = _state.asStateFlow()

    private var currentJob: kotlinx.coroutines.Job? = null

    init {
        loadSets()
    }

    fun onSearch(query: String) {
        _state.update { it.copy(searchQuery = query, page = 1) }
        loadSets()
    }

    fun onSortChange(sort: SortOption) {
        _state.update { it.copy(sortOption = sort, page = 1) }
        loadSets()
    }

    fun loadMore() {
        val current = _state.value
        if (current.isLoading || !current.hasMore) return
        _state.update { it.copy(page = current.page + 1) }
        loadSets(append = true)
    }

    fun loadSets(append: Boolean = false) {
        currentJob?.cancel()
        currentJob = viewModelScope.launch {
            val current = _state.value
            if (!append) {
                _state.update { it.copy(isLoading = true, error = null) }
            }

            when (val result = setRepository.getPublicSets(
                query = current.searchQuery.ifBlank { null },
                tags = null
            )) {
                is ApiResult.Success -> {
                    val sorted = sortSets(result.data, current.sortOption)
                    _state.update {
                        it.copy(
                            sets = if (append) it.sets + sorted else sorted,
                            isLoading = false,
                            hasMore = false // pagination not needed for MVP
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update {
                        it.copy(
                            sets = if (append) it.sets else emptyList(),
                            error = result.message,
                            isLoading = false
                        )
                    }
                }
                else -> {}
            }
        }
    }

    private fun sortSets(sets: List<FlashcardSet>, sort: SortOption): List<FlashcardSet> {
        return when (sort) {
            SortOption.NEWEST -> sets.sortedByDescending { it.updatedAt ?: it.createdAt }
            SortOption.MOST_CARDS -> sets.sortedByDescending { it.cardCount }
            SortOption.POPULAR -> sets.sortedByDescending { it.cardCount } // reuse cardCount as popularity proxy
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }
}
