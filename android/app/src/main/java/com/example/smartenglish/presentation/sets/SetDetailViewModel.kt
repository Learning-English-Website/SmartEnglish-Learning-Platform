package com.example.smartenglish.presentation.sets

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.repository.SetRepository
import com.example.smartenglish.domain.repository.ShareRepository
import com.example.smartenglish.domain.repository.CardRepository
import com.example.smartenglish.domain.repository.DownloadRepository
import com.example.smartenglish.data.sync.SyncManager
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.example.smartenglish.util.NetworkMonitor

data class SetDetailState(
    val set: FlashcardSet? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isEditing: Boolean = false,
    val isCreatingShare: Boolean = false,
    val shareCode: String? = null
)

@HiltViewModel
class SetDetailViewModel @Inject constructor(
    private val setRepository: SetRepository,
    private val shareRepository: ShareRepository,
    private val cardRepository: CardRepository,
    private val downloadRepository: DownloadRepository,
    private val syncManager: SyncManager,
    private val networkMonitor: NetworkMonitor,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val setId: String = savedStateHandle.get<String>("setId") ?: ""

    val isDownloaded: StateFlow<Boolean> = downloadRepository.getDownloadedContent()
        .map { list -> list.any { it.contentId == setId } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val cardsState: StateFlow<List<Flashcard>> = cardRepository.getCardsBySet(setId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _state = MutableStateFlow(SetDetailState())
    val state: StateFlow<SetDetailState> = _state.asStateFlow()

    init {
        loadSet()
        fetchCards()
        observeNetworkChanges()
    }

    private fun observeNetworkChanges() {
        viewModelScope.launch {
            var wasOffline = false
            networkMonitor.isOnline.collect { online ->
                if (online && wasOffline) {
                    loadSet()
                    fetchCards()
                }
                wasOffline = !online
            }
        }
    }

    private fun fetchCards() {
        viewModelScope.launch {
            cardRepository.getCardsBySetList(setId)
        }
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

    fun createShareCode() {
        val currentSet = _state.value.set ?: return
        viewModelScope.launch {
            _state.update { it.copy(isCreatingShare = true, error = null) }
            when (val result = shareRepository.createShare(currentSet.id, null)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(shareCode = result.data.shareCode, isCreatingShare = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message, isCreatingShare = false) }
                }
                else -> {}
            }
        }
    }

    suspend fun getCardsForSet(setId: String): List<Flashcard> {
        return cardRepository.getCardsBySetList(setId)
    }

    private val _isDownloading = MutableStateFlow(false)
    val isDownloading = _isDownloading.asStateFlow()

    private val _downloadEvent = MutableSharedFlow<DownloadResultEvent>()
    val downloadEvent = _downloadEvent.asSharedFlow()

    sealed interface DownloadResultEvent {
        object Success : DownloadResultEvent
        data class Error(val message: String) : DownloadResultEvent
        object Deleted : DownloadResultEvent
    }

    fun downloadSet() {
        viewModelScope.launch {
            _isDownloading.value = true
            val result = syncManager.downloadSet(setId, includeMedia = true)
            _isDownloading.value = false
            if (result.isSuccess) {
                _downloadEvent.emit(DownloadResultEvent.Success)
            } else {
                val errorMsg = result.exceptionOrNull()?.message ?: "Lỗi tải xuống"
                _downloadEvent.emit(DownloadResultEvent.Error(errorMsg))
            }
        }
    }

    fun removeDownload() {
        viewModelScope.launch {
            syncManager.removeDownload(setId, "set")
            _downloadEvent.emit(DownloadResultEvent.Deleted)
        }
    }
}
