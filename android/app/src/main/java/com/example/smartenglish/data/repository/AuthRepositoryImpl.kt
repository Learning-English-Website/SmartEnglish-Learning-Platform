package com.example.smartenglish.data.repository

import android.util.Log
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
                // Tokens are saved via CookieJar from cookies
                // If tokens are in body, save them too
                if (data?.accessToken != null && data.refreshToken != null) {
                    tokenManager.saveTokens(data.accessToken, data.refreshToken)
                }
                if (data?.user != null) {
                    ApiResult.Success(data.user.toDomain())
                } else {
                    ApiResult.Error("Login failed: No user data received")
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
                // Check if email verification is required first
                if (data?.requiresEmailVerification == true) {
                    ApiResult.EmailVerificationRequired(email)
                } else if (data?.accessToken != null && data.refreshToken != null && data.user != null) {
                    tokenManager.saveTokens(data.accessToken, data.refreshToken)
                    ApiResult.Success(data.user.toDomain())
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
                val message = response.body()?.data?.message ?: "Email sent successfully"
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
            Log.d("AuthRepository", "verifyOtp called - email: $email, otp: $otp")
            val request = VerifyOtpRequest(email, otp)
            Log.d("AuthRepository", "Request body: email=${request.email}, otp=${request.otp}")
            val response = authApi.verifyOtp(request)
            Log.d("AuthRepository", "Response isSuccessful: ${response.isSuccessful}")
            Log.d("AuthRepository", "Response code: ${response.code()}")
            Log.d("AuthRepository", "Response body: ${response.body()}")
            Log.d("AuthRepository", "Response errorBody: ${response.errorBody()?.string()}")
            if (response.isSuccessful && response.body()?.success == true) {
                Log.d("AuthRepository", "OTP verification SUCCESS")
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Invalid OTP"
                Log.e("AuthRepository", "OTP verification FAILED: $errorMessage")
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "OTP verification EXCEPTION: ${e.message}", e)
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun verifyResetOtp(email: String, otp: String): ApiResult<Unit> {
        return try {
            Log.d("AuthRepository", "verifyResetOtp called - email: $email, otp: $otp")
            val response = authApi.verifyResetOtp(VerifyOtpRequest(email, otp))
            if (response.isSuccessful && response.body()?.success == true) {
                Log.d("AuthRepository", "Reset OTP verification SUCCESS")
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Invalid OTP"
                Log.e("AuthRepository", "Reset OTP verification FAILED: $errorMessage")
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Reset OTP verification EXCEPTION: ${e.message}", e)
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun resetPassword(email: String, otp: String, newPassword: String): ApiResult<Unit> {
        return try {
            val response = authApi.resetPassword(ResetPasswordRequest(email, otp, newPassword))
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
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
