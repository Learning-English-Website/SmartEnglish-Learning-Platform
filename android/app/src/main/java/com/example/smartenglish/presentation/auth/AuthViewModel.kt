package com.example.smartenglish.presentation.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.domain.usecase.auth.ForgotPasswordUseCase
import com.example.smartenglish.domain.usecase.auth.LoginUseCase
import com.example.smartenglish.domain.usecase.auth.RegisterUseCase
import com.example.smartenglish.domain.usecase.auth.VerifyOtpUseCase
import com.example.smartenglish.domain.usecase.auth.VerifyResetOtpUseCase
import com.example.smartenglish.domain.usecase.auth.ResetPasswordUseCase
import com.example.smartenglish.util.ApiResult
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.common.api.ApiException
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
    data object OtpVerified : AuthUiState()
    data class EmailVerificationRequired(val email: String) : AuthUiState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val forgotPasswordUseCase: ForgotPasswordUseCase,
    private val verifyOtpUseCase: VerifyOtpUseCase,
    private val verifyResetOtpUseCase: VerifyResetOtpUseCase,
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
        val email = _pendingEmail.value
        Log.d("AuthViewModel", "verifyOtp called - email: $email, otp: $otp")
        if (email == null) {
            Log.e("AuthViewModel", "email is null!")
            _uiState.value = AuthUiState.Error("Email not found. Please register again.")
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = verifyOtpUseCase(email, otp)) {
                is ApiResult.Success -> {
                    Log.d("AuthViewModel", "verifyOtp SUCCESS")
                    _uiState.value = AuthUiState.OtpVerified
                }
                is ApiResult.Error -> {
                    Log.e("AuthViewModel", "verifyOtp ERROR: ${result.message}")
                    _uiState.value = AuthUiState.Error(result.message)
                }
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
                is ApiResult.EmailVerificationRequired -> {}
            }
        }
    }

    fun verifyResetOtp(email: String, otp: String) {
        Log.d("AuthViewModel", "verifyResetOtp called - email: $email, otp: $otp")
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = verifyResetOtpUseCase(email, otp)) {
                is ApiResult.Success -> {
                    Log.d("AuthViewModel", "verifyResetOtp SUCCESS")
                    _uiState.value = AuthUiState.OtpVerified
                }
                is ApiResult.Error -> {
                    Log.e("AuthViewModel", "verifyResetOtp ERROR: ${result.message}")
                    _uiState.value = AuthUiState.Error(result.message)
                }
                is ApiResult.Loading -> _uiState.value = AuthUiState.Loading
                is ApiResult.EmailVerificationRequired -> {}
            }
        }
    }

    fun resetPassword(otp: String, newPassword: String, confirmPassword: String) {
        val email = _pendingEmail.value ?: return
        if (newPassword != confirmPassword) {
            _uiState.value = AuthUiState.Error("Passwords do not match")
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = resetPasswordUseCase(email, otp, newPassword)) {
                is ApiResult.Success -> {
                    _uiState.value = AuthUiState.ForgotPasswordSuccess("Password reset successfully! Please login.")
                }
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

    fun handleGoogleSignInResult(task: com.google.android.gms.tasks.Task<com.google.android.gms.auth.api.signin.GoogleSignInAccount>) {
        viewModelScope.launch {
            try {
                val account = task.getResult(ApiException::class.java)
                val idToken = account.idToken
                if (idToken != null) {
                    _uiState.value = AuthUiState.Loading
                    when (val result = authRepository.googleAuth(idToken)) {
                        is ApiResult.Success -> _uiState.value = AuthUiState.Success(result.data)
                        is ApiResult.Error -> _uiState.value = AuthUiState.Error(result.message)
                        else -> {}
                    }
                } else {
                    _uiState.value = AuthUiState.Error("Google token missing")
                }
            } catch (e: ApiException) {
                _uiState.value = AuthUiState.Error("Google sign-in failed: ${e.statusCode}")
            }
        }
    }
}
