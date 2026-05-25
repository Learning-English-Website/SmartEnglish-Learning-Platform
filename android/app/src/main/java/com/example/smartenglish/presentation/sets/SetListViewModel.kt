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
        observeSets()
        // Don't call refresh() here - Flow will emit initial data from local DB
        // Refresh will be called when user manually pulls to refresh
    }

    private fun observeSets() {
        viewModelScope.launch {
            setRepository.getSets().collect { sets ->
                _state.update { it.copy(sets = sets) }
            }
        }
    }

    fun onEvent(event: SetListEvent) {
        when (event) {
            is SetListEvent.SearchSets -> searchSets(event.query)
            is SetListEvent.CreateSet -> createSet(event.title, event.description, event.language, event.isPublic)
            is SetListEvent.DeleteSet -> deleteSet(event.setId)
            SetListEvent.Refresh -> refresh()
            SetListEvent.ClearError -> _state.update { it.copy(error = null) }
        }
    }

    private fun searchSets(query: String) {
        _state.update { it.copy(searchQuery = query) }
        if (query.isBlank()) {
            refresh()
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = setRepository.searchSets(query)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(sets = result.data, isLoading = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    private fun createSet(title: String, description: String?, language: String?, isPublic: Boolean) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = setRepository.createSet(title, description, language, isPublic, emptyList())) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isLoading = false) }
                    // Don't call refresh() here - the Flow will automatically emit the new set
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    private fun deleteSet(setId: String) {
        viewModelScope.launch {
            when (val result = setRepository.deleteSet(setId)) {
                is ApiResult.Success -> {
                    // Don't call refresh() - Flow will automatically update when DB changes
                }
                is ApiResult.Error -> _state.update { it.copy(error = result.message) }
                else -> {}
            }
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true, error = null) }
            setRepository.syncSets()
            _state.update { it.copy(isRefreshing = false) }
        }
    }
}
