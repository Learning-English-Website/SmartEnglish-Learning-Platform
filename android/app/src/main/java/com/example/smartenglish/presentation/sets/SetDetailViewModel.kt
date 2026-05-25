package com.example.smartenglish.presentation.sets

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SetDetailState(
    val set: FlashcardSet? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isEditing: Boolean = false
)

@HiltViewModel
class SetDetailViewModel @Inject constructor(
    private val setRepository: SetRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val setId: String = savedStateHandle.get<String>("setId") ?: ""

    private val _state = MutableStateFlow(SetDetailState())
    val state: StateFlow<SetDetailState> = _state.asStateFlow()

    init {
        loadSet()
    }

    private fun loadSet() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = setRepository.getSetById(setId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(set = result.data, isLoading = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    fun refresh() {
        loadSet()
    }

    fun toggleEditMode() {
        _state.update { it.copy(isEditing = !it.isEditing) }
    }

    fun updateSet(
        title: String?,
        description: String?,
        language: String?,
        isPublic: Boolean?,
        tags: List<String>?
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = setRepository.updateSet(
                id = setId,
                title = title,
                description = description,
                language = language,
                isPublic = isPublic,
                tags = tags
            )) {
                is ApiResult.Success -> {
                    _state.update { it.copy(set = result.data, isLoading = false, isEditing = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }
}
