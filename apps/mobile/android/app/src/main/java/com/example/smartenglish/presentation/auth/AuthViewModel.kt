package com.example.smartenglish.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.domain.usecase.auth.ForgotPasswordUseCase
import com.example.smartenglish.domain.usecase.auth.LoginUseCase
import com.example.smartenglish.domain.usecase.auth.RegisterUseCase
import com.example.smartenglish.domain.usecase.auth.VerifyOtpUseCase
import com.example.smartenglish.domain.usecase.auth.ResetPasswordUseCase
import com.example.smartenglish.util.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthUiState {
    data object Idle : AuthUiState()
    data object Loading : AuthUiState()
    data class Success(val user: User) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
    data class ForgotPasswordSuccess(val message: String) : AuthUiState()
    data class OtpVerified(val email: String) : AuthUiState()
    data class ResetPasswordSuccess(val user: User) : AuthUiState()
    data class EmailVerificationRequired(val email: String) : AuthUiState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val forgotPasswordUseCase: ForgotPasswordUseCase,
    private val verifyOtpUseCase: VerifyOtpUseCase,
    private val resetPasswordUseCase: ResetPasswordUseCase,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _pendingEmail = MutableStateFlow<String?>(null)
    val pendingEmail: StateFlow<String?> = _pendingEmail.asStateFlow()

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = loginUseCase(email, password)) {
                is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                is ApiResult.EmailVerificationRequired -> {
                    _pendingEmail.value = result.email
                    _uiState.value = AuthUiState.EmailVerificationRequired(result.email)
                }
                is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
            }
        }
    }

    fun register(email: String, username: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            _pendingEmail.value = email
            when (val result = registerUseCase(email, username, password)) {
                is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                is ApiResult.EmailVerificationRequired -> _uiState.value = AuthUiState.EmailVerificationRequired(email)
                is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
            }
        }
    }

    fun forgotPassword(email: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            _pendingEmail.value = email
            when (val result = forgotPasswordUseCase(email)) {
                is ApiResult.Success -> _uiState.value = AuthUiState.ForgotPasswordSuccess("OTP sent to your email")
                is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
                is ApiResult.EmailVerificationRequired -> {}
            }
        }
    }

    fun verifyOtp(otp: String) {
        val email = _pendingEmail.value ?: return
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = verifyOtpUseCase(email, otp)) {
                is ApiResult.Success -> _uiState.value = AuthUiState.OtpVerified(email)
                is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
                is ApiResult.EmailVerificationRequired -> {}
            }
        }
    }

    fun resetPassword(newPassword: String, confirmPassword: String) {
        val email = _pendingEmail.value ?: return
        if (newPassword != confirmPassword) {
            _uiState.value = AuthUiState.Error("Passwords do not match")
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = resetPasswordUseCase(email, "", newPassword)) {
                is ApiResult.Success -> _uiState.value = AuthUiState.ResetPasswordSuccess(result.data)
                is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
                is ApiResult.EmailVerificationRequired -> {}
            }
        }
    }

    fun setPendingEmail(email: String) {
        _pendingEmail.value = email
    }

    fun checkAuthState() {
        if (authRepository.isLoggedIn()) {
            viewModelScope.launch {
                when (val result = authRepository.getMe()) {
                    is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                    is ApiResult.EmailVerificationRequired -> {
                        _uiState.value = AuthUiState.EmailVerificationRequired(result.email)
                    }
                    is ApiResult.Error -> authRepository.logout()
                    is ApiResult.Loading -> {}
                }
            }
        }
    }

    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()
}
