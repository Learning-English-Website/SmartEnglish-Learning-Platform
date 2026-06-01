package com.example.smartenglish.presentation.sets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SetListViewModel @Inject constructor(
    private val setRepository: SetRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SetListState())
    val state: StateFlow<SetListState> = _state.asStateFlow()

    init {
        observeMySets()
        refreshMySets()
        refreshCommunitySets()
    }

    private fun observeMySets() {
        viewModelScope.launch {
            setRepository.getMySets().collect { sets ->
                _state.update { currentState ->
                    currentState.copy(
                        mySets = sets,
                        displayedSets = computeDisplayedSets(sets, currentState.communitySets, currentState.selectedTab, currentState.selectedFilter, currentState.searchQuery)
                    )
                }
            }
        }
    }

    private fun computeDisplayedSets(
        mySets: List<com.example.smartenglish.domain.model.FlashcardSet>,
        communitySets: List<com.example.smartenglish.domain.model.FlashcardSet>,
        tab: LibraryTab,
        filter: SetFilter,
        query: String
    ): List<com.example.smartenglish.domain.model.FlashcardSet> {
        val source = if (tab == LibraryTab.MY_SETS) mySets else communitySets
        val filtered = when (filter) {
            SetFilter.ALL -> source
            SetFilter.PUBLIC -> source.filter { it.isPublic }
            SetFilter.PRIVATE -> source.filter { !it.isPublic }
        }
        if (query.isBlank()) return filtered
        return filtered.filter {
            it.title.contains(query, ignoreCase = true) ||
                    it.description?.contains(query, ignoreCase = true) == true
        }
    }

    private fun refreshMySets() {
        viewModelScope.launch {
            setRepository.syncSets()
        }
    }

    private fun refreshCommunitySets() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val result = setRepository.getPublicSets(null, null)) {
                is ApiResult.Success -> {
                    _state.update { currentState ->
                        currentState.copy(
                            communitySets = result.data,
                            displayedSets = computeDisplayedSets(
                                currentState.mySets,
                                result.data,
                                currentState.selectedTab,
                                currentState.selectedFilter,
                                currentState.searchQuery
                            ),
                            isLoading = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoading = false) }
                }
                else -> {}
            }
        }
    }

    fun onEvent(event: SetListEvent) {
        when (event) {
            is SetListEvent.SearchSets -> searchSets(event.query)
            is SetListEvent.CreateSet -> createSet(event.title, event.description, event.language, event.isPublic)
            is SetListEvent.DeleteSet -> deleteSet(event.setId)
            SetListEvent.Refresh -> {
                refreshMySets()
                refreshCommunitySets()
            }
            SetListEvent.ClearError -> _state.update { it.copy(error = null) }
            SetListEvent.ClearCreateSetSuccess -> _state.update { it.copy(isCreateSetSuccess = false, error = null) }
            is SetListEvent.SelectTab -> selectTab(event.tab)
            is SetListEvent.SelectFilter -> selectFilter(event.filter)
        }
    }

    private fun selectTab(tab: LibraryTab) {
        _state.update { currentState ->
            currentState.copy(
                selectedTab = tab,
                displayedSets = computeDisplayedSets(
                    currentState.mySets,
                    currentState.communitySets,
                    tab,
                    currentState.selectedFilter,
                    currentState.searchQuery
                ),
                searchQuery = ""
            )
        }
    }

    private fun selectFilter(filter: SetFilter) {
        _state.update { currentState ->
            currentState.copy(
                selectedFilter = filter,
                displayedSets = computeDisplayedSets(
                    currentState.mySets,
                    currentState.communitySets,
                    currentState.selectedTab,
                    filter,
                    currentState.searchQuery
                )
            )
        }
    }

    private fun searchSets(query: String) {
        _state.update { currentState ->
            currentState.copy(
                searchQuery = query,
                displayedSets = computeDisplayedSets(
                    currentState.mySets,
                    currentState.communitySets,
                    currentState.selectedTab,
                    currentState.selectedFilter,
                    query
                )
            )
        }
    }

    private fun createSet(title: String, description: String?, language: String?, isPublic: Boolean) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null, isCreateSetSuccess = false) }
            when (val result = setRepository.createSet(title, description, language, isPublic, emptyList())) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isLoading = false, isCreateSetSuccess = true) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {
                    _state.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    private fun deleteSet(setId: String) {
        viewModelScope.launch {
            when (val result = setRepository.deleteSet(setId)) {
                is ApiResult.Success -> {}
                is ApiResult.Error -> _state.update { it.copy(error = result.message) }
                else -> {}
            }
        }
    }
}
