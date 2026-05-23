package com.example.smartenglish.presentation.home

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

sealed class HomeUiState {
    data object Loading : HomeUiState()
    data class Success(val user: User) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            when (val result = userRepository.getMe()) {
                is ApiResult.Success -> _uiState.value = HomeUiState.Success(result.data)
                is ApiResult.Error -> _uiState.value = HomeUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = HomeUiState.Loading
                is ApiResult.EmailVerificationRequired -> _uiState.value = HomeUiState.Error("Email verification required")
            }
        }
    }
}
