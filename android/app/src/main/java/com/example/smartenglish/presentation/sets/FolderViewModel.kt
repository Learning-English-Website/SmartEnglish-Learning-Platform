package com.example.smartenglish.presentation.sets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.Folder
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.repository.FolderRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FolderState(
    val folders: List<Folder> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val folderSets: List<FlashcardSet> = emptyList(),
    val currentFolder: Folder? = null,
    val isCreateFolderSuccess: Boolean = false
)

sealed interface FolderEvent {
    data object LoadFolders : FolderEvent
    data class CreateFolder(val name: String, val parentId: String? = null) : FolderEvent
    data class DeleteFolder(val folderId: String) : FolderEvent
    data class LoadFolderSets(val folderId: String) : FolderEvent
    data class AddSetToFolder(val folderId: String, val setId: String) : FolderEvent
    data class RemoveSetFromFolder(val folderId: String, val setId: String) : FolderEvent
    data object ClearError : FolderEvent
    data object ClearCreateFolderSuccess : FolderEvent
}

@HiltViewModel
class FolderViewModel @Inject constructor(
    private val folderRepository: FolderRepository,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {

    private val _state = MutableStateFlow(FolderState())
    val state: StateFlow<FolderState> = _state.asStateFlow()

    init {
        observeFolders()
        loadFolders()
    }

    private fun observeFolders() {
        viewModelScope.launch {
            folderRepository.observeFolders().collect { foldersList ->
                _state.update { it.copy(folders = foldersList) }
            }
        }
    }

    fun onEvent(event: FolderEvent) {
        when (event) {
            FolderEvent.LoadFolders -> loadFolders()
            is FolderEvent.CreateFolder -> createFolder(event.name, event.parentId)
            is FolderEvent.DeleteFolder -> deleteFolder(event.folderId)
            is FolderEvent.LoadFolderSets -> loadFolderSets(event.folderId)
            is FolderEvent.AddSetToFolder -> addSetToFolder(event.folderId, event.setId)
            is FolderEvent.RemoveSetFromFolder -> removeSetFromFolder(event.folderId, event.setId)
            FolderEvent.ClearError -> _state.update { it.copy(error = null) }
            FolderEvent.ClearCreateFolderSuccess -> _state.update { it.copy(isCreateFolderSuccess = false, error = null) }
        }
    }

    private fun loadFolders() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            if (!networkMonitor.isOnline.value) {
                kotlinx.coroutines.delay(500)
                _state.update { it.copy(isLoading = false, error = "Không thể kết nối Internet. Thiết bị đang ngoại tuyến.") }
                return@launch
            }
            when (val result = folderRepository.getFolders()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isLoading = false) }
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

    private fun createFolder(name: String, parentId: String?) {
        if (!networkMonitor.isOnline.value) {
            _state.update { it.copy(error = "Không thể tạo thư mục khi thiết bị đang ngoại tuyến.", isLoading = false) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null, isCreateFolderSuccess = false) }
            when (val result = folderRepository.createFolder(name, parentId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(isLoading = false, isCreateFolderSuccess = true) }
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

    private fun deleteFolder(folderId: String) {
        if (!networkMonitor.isOnline.value) {
            _state.update { it.copy(error = "Không thể xóa thư mục khi thiết bị đang ngoại tuyến.", isLoading = false) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = folderRepository.deleteFolder(folderId)) {
                is ApiResult.Success -> {
                    loadFolders() // Refresh
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

    private fun loadFolderSets(folderId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            if (!networkMonitor.isOnline.value) {
                kotlinx.coroutines.delay(500)
                _state.update { it.copy(isLoading = false, error = "Không thể kết nối Internet. Thiết bị đang ngoại tuyến.") }
                return@launch
            }
            
            // Get folder details first to set currentFolder
            when (val folderResult = folderRepository.getFolderById(folderId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(currentFolder = folderResult.data) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = folderResult.message) }
                }
                else -> {}
            }

            // Get sets
            when (val setsResult = folderRepository.getFolderSets(folderId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(folderSets = setsResult.data, isLoading = false) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = setsResult.message, isLoading = false) }
                }
                else -> {
                    _state.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    private fun addSetToFolder(folderId: String, setId: String) {
        if (!networkMonitor.isOnline.value) {
            _state.update { it.copy(error = "Không thể thêm học phần vào thư mục khi thiết bị đang ngoại tuyến.", isLoading = false) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = folderRepository.addSetToFolder(folderId, setId)) {
                is ApiResult.Success -> {
                    loadFolderSets(folderId) // Refresh folder sets
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

    private fun removeSetFromFolder(folderId: String, setId: String) {
        if (!networkMonitor.isOnline.value) {
            _state.update { it.copy(error = "Không thể xóa học phần khỏi thư mục khi thiết bị đang ngoại tuyến.", isLoading = false) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = folderRepository.removeSetFromFolder(folderId, setId)) {
                is ApiResult.Success -> {
                    loadFolderSets(folderId) // Refresh
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
}
