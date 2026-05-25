package com.example.smartenglish.presentation.share

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.ShareInfo
import com.example.smartenglish.domain.repository.ShareRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ShareState(
    val shareInfo: ShareInfo? = null,
    val isLoading: Boolean = false,
    val isCreating: Boolean = false,
    val error: String? = null,
    val shareLink: String? = null
)

sealed class ShareEvent {
    data object CreateShare : ShareEvent()
    data object DeleteShare : ShareEvent()
    data object CopyLink : ShareEvent()
}

@HiltViewModel
class ShareViewModel @Inject constructor(
    private val shareRepository: ShareRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val setId: String = savedStateHandle.get<String>("setId") ?: ""

    private val _state = MutableStateFlow(ShareState())
    val state: StateFlow<ShareState> = _state.asStateFlow()

    init {
        loadShareInfo()
    }

    private fun loadShareInfo() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = shareRepository.getShareBySetId(setId)) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            shareInfo = result.data,
                            shareLink = "smartenglish://set/${result.data.shareCode}",
                            isLoading = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoading = false) }
                    // Share might not exist yet, that's OK
                }
                else -> {}
            }
        }
    }

    fun onEvent(event: ShareEvent) {
        when (event) {
            ShareEvent.CreateShare -> createShare()
            ShareEvent.DeleteShare -> deleteShare()
            ShareEvent.CopyLink -> { /* Handled in UI */ }
        }
    }

    private fun createShare() {
        viewModelScope.launch {
            _state.update { it.copy(isCreating = true, error = null) }
            when (val result = shareRepository.createShare(setId, null)) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            shareInfo = result.data,
                            shareLink = "smartenglish://set/${result.data.shareCode}",
                            isCreating = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isCreating = false) }
                }
                else -> {}
            }
        }
    }

    private fun deleteShare() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = shareRepository.deleteShare(setId)) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            shareInfo = null,
                            shareLink = null,
                            isLoading = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isLoading = false) }
                }
                else -> {}
            }
        }
    }
}
