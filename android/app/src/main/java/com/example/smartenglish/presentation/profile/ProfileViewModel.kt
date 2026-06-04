package com.example.smartenglish.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.model.Streak
import com.example.smartenglish.domain.model.Gamification
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.domain.usecase.auth.LogoutUseCase
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class ProfileUiState {
    data object Loading : ProfileUiState()
    data class Success(val user: User) : ProfileUiState()
    data class Error(val message: String) : ProfileUiState()
}

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val logoutUseCase: LogoutUseCase,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile(isSilent: Boolean = false) {
        viewModelScope.launch {
            if (!isSilent) {
                _uiState.value = ProfileUiState.Loading
            }

            if (!networkMonitor.isOnline.value) {
                val offlineUser = User(
                    id = "offline_user",
                    email = "offline@memoris.com",
                    username = "Người dùng ngoại tuyến",
                    role = "user",
                    avatar = null,
                    premium = "none",
                    isVerified = false,
                    streak = Streak(current = 0, longest = 0, lastStudyDate = null),
                    gamification = Gamification(xp = 0, level = 1),
                    createdAt = null,
                    updatedAt = null
                )
                _uiState.value = ProfileUiState.Success(offlineUser)
                return@launch
            }

            when (val result = userRepository.getMe()) {
                is ApiResult.Success -> _uiState.value = ProfileUiState.Success(result.data)
                is ApiResult.Error -> {
                    // Fallback to offline user as well on network error
                    val offlineUser = User(
                        id = "offline_user",
                        email = "offline@memoris.com",
                        username = "Người dùng ngoại tuyến",
                        role = "user",
                        avatar = null,
                        premium = "none",
                        isVerified = false,
                        streak = Streak(current = 0, longest = 0, lastStudyDate = null),
                        gamification = Gamification(xp = 0, level = 1),
                        createdAt = null,
                        updatedAt = null
                    )
                    _uiState.value = ProfileUiState.Success(offlineUser)
                }
                is ApiResult.Loading -> {
                    if (!isSilent) {
                        _uiState.value = ProfileUiState.Loading
                    }
                }
                else -> {}
            }
        }
    }

    fun logout(onLogoutComplete: () -> Unit) {
        viewModelScope.launch {
            logoutUseCase()
            onLogoutComplete()
        }
    }
}
