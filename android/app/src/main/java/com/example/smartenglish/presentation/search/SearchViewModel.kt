package com.example.smartenglish.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.Tag
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.ShareRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchState(
    val query: String = "",
    val results: List<FlashcardSet> = emptyList(),
    val tags: List<Tag> = emptyList(),
    val selectedTags: Set<String> = emptySet(),
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val error: String? = null,
    val searchType: SearchType = SearchType.MY_SETS
)

enum class SearchType {
    MY_SETS,
    PUBLIC_SETS
}

sealed class SearchEvent {
    data class UpdateQuery(val query: String) : SearchEvent()
    data class SelectTag(val tag: String) : SearchEvent()
    data class ChangeSearchType(val type: SearchType) : SearchEvent()
    data object ClearFilters : SearchEvent()
    data object Search : SearchEvent()
    data object ClearError : SearchEvent()
}

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val setRepository: SetRepository,
    private val shareRepository: ShareRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadTags()
    }

    private fun loadTags() {
        viewModelScope.launch {
            when (val result = shareRepository.getPublicTags()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(tags = result.data) }
                }
                is ApiResult.Error -> {
                    // Tags are optional, don't show error
                }
                else -> {}
            }
        }
    }

    fun onEvent(event: SearchEvent) {
        when (event) {
            is SearchEvent.UpdateQuery -> updateQuery(event.query)
            is SearchEvent.SelectTag -> toggleTag(event.tag)
            is SearchEvent.ChangeSearchType -> changeSearchType(event.type)
            SearchEvent.ClearFilters -> clearFilters()
            SearchEvent.Search -> search()
            SearchEvent.ClearError -> _state.update { it.copy(error = null) }
        }
    }

    private fun updateQuery(query: String) {
        _state.update { it.copy(query = query) }
        
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            search()
        }
    }

    private fun toggleTag(tag: String) {
        _state.update { state ->
            val newTags = if (tag in state.selectedTags) {
                state.selectedTags - tag
            } else {
                state.selectedTags + tag
            }
            state.copy(selectedTags = newTags)
        }
        search()
    }

    private fun changeSearchType(type: SearchType) {
        _state.update { it.copy(searchType = type, results = emptyList()) }
        search()
    }

    private fun clearFilters() {
        _state.update { 
            it.copy(
                selectedTags = emptySet(),
                query = ""
            )
        }
        search()
    }

    private fun search() {
        viewModelScope.launch {
            _state.update { it.copy(isSearching = true, error = null) }

            val currentState = _state.value
            val tagsList = currentState.selectedTags.toList()

            val result = when (currentState.searchType) {
                SearchType.MY_SETS -> {
                    if (currentState.query.isBlank()) {
                        ApiResult.Success(emptyList())
                    } else {
                        setRepository.searchSets(currentState.query)
                    }
                }
                SearchType.PUBLIC_SETS -> {
                    setRepository.getPublicSets(
                        query = currentState.query.ifBlank { null },
                        tags = tagsList.ifEmpty { null }
                    )
                }
            }

            when (result) {
                is ApiResult.Success -> {
                    _state.update { it.copy(results = result.data, isSearching = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isSearching = false) }
                }
                else -> {}
            }
        }
    }
}
