package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.AuthApi
import com.example.smartenglish.data.remote.dto.LoginRequest
import com.example.smartenglish.data.remote.dto.RegisterRequest
import com.example.smartenglish.data.remote.dto.ForgotPasswordRequest
import com.example.smartenglish.data.remote.dto.VerifyOtpRequest
import com.example.smartenglish.data.remote.dto.ResetPasswordRequest
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.TokenManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) : AuthRepository {

    override suspend fun login(email: String, password: String): ApiResult<User> {
        return try {
            val response = authApi.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data?.accessToken != null && data.refreshToken != null && data.user != null) {
                    tokenManager.saveTokens(data.accessToken, data.refreshToken)
                    ApiResult.Success(data.user.toDomain())
                } else {
                    ApiResult.Error("Login failed: Incomplete data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Login failed"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun register(email: String, username: String, password: String): ApiResult<User> {
        return try {
            val response = authApi.register(RegisterRequest(email, username, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data?.accessToken != null && data.refreshToken != null && data.user != null) {
                    tokenManager.saveTokens(data.accessToken, data.refreshToken)
                    ApiResult.Success(data.user.toDomain())
                } else if (data?.requiresEmailVerification == true) {
                    ApiResult.EmailVerificationRequired(email)
                } else {
                    ApiResult.Error("Registration successful, but no user data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Registration failed"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getMe(): ApiResult<User> {
        return try {
            val response = authApi.getMe()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to get user: No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to get user"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun forgotPassword(email: String): ApiResult<Unit> {
        return try {
            val response = authApi.forgotPassword(ForgotPasswordRequest(email))
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to send reset email"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun verifyOtp(email: String, otp: String): ApiResult<Unit> {
        return try {
            val response = authApi.verifyOtp(VerifyOtpRequest(email, otp))
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Invalid OTP"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun resetPassword(email: String, otp: String, newPassword: String): ApiResult<User> {
        return try {
            val response = authApi.resetPassword(ResetPasswordRequest(email, otp, newPassword))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data?.accessToken != null && data.refreshToken != null && data.user != null) {
                    tokenManager.saveTokens(data.accessToken, data.refreshToken)
                    ApiResult.Success(data.user.toDomain())
                } else {
                    ApiResult.Error("Password reset failed: Incomplete data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to reset password"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun logout() {
        try {
            authApi.logout()
        } catch (_: Exception) {
            // Ignore errors during logout
        } finally {
            tokenManager.clearTokens()
        }
    }

    override fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
}
