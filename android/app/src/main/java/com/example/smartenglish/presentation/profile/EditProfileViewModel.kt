package com.example.smartenglish.presentation.profile

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class EditProfileUiState {
    data object Loading : EditProfileUiState()
    data class Success(val user: User) : EditProfileUiState()
    data class Error(val message: String) : EditProfileUiState()
    data object Saving : EditProfileUiState()
    data object SaveSuccess : EditProfileUiState()
}

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<EditProfileUiState>(EditProfileUiState.Loading)
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    private val _username = MutableStateFlow("")
    val username: StateFlow<String> = _username.asStateFlow()

    private val _avatar = MutableStateFlow("")
    val avatar: StateFlow<String> = _avatar.asStateFlow()

    private val _isUploading = MutableStateFlow(false)
    val isUploading: StateFlow<Boolean> = _isUploading.asStateFlow()

    private val _uploadError = MutableStateFlow<String?>(null)
    val uploadError: StateFlow<String?> = _uploadError.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = EditProfileUiState.Loading
            when (val result = userRepository.getMe()) {
                is ApiResult.Success -> {
                    _username.value = result.data.username
                    _avatar.value = result.data.avatar ?: ""
                    _uiState.value = EditProfileUiState.Success(result.data)
                }
                is ApiResult.Error -> _uiState.value = EditProfileUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = EditProfileUiState.Loading
                else -> {}
            }
        }
    }

    fun updateUsername(value: String) {
        _username.value = value
    }

    fun updateAvatar(value: String) {
        _avatar.value = value
    }

    fun uploadAvatar(bytes: ByteArray, fileName: String) {
        viewModelScope.launch {
            _isUploading.value = true
            _uploadError.value = null
            when (val result = userRepository.uploadImage(bytes, fileName)) {
                is ApiResult.Success -> {
                    _avatar.value = result.data
                }
                is ApiResult.Error -> {
                    _uploadError.value = result.message
                }
                else -> {}
            }
            _isUploading.value = false
        }
    }

    fun clearUploadError() {
        _uploadError.value = null
    }

    fun saveProfile() {
        viewModelScope.launch {
            _uiState.value = EditProfileUiState.Saving
            val newUsername = _username.value.takeIf { it.isNotBlank() }
            val newAvatar = _avatar.value.takeIf { it.isNotBlank() }

            when (val result = userRepository.updateProfile(newUsername, newAvatar)) {
                is ApiResult.Success -> {
                    _uiState.value = EditProfileUiState.SaveSuccess
                }
                is ApiResult.Error -> _uiState.value = EditProfileUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = EditProfileUiState.Saving
                else -> {}
            }
        }
    }
}
