package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.util.ApiResult

interface AuthRepository {
    suspend fun login(email: String, password: String): ApiResult<User>
    suspend fun register(email: String, username: String, password: String): ApiResult<User>
    suspend fun getMe(): ApiResult<User>
    suspend fun forgotPassword(email: String): ApiResult<Unit>
    suspend fun verifyOtp(email: String, otp: String): ApiResult<Unit>
    suspend fun resetPassword(email: String, otp: String, newPassword: String): ApiResult<User>
    suspend fun logout()
    fun isLoggedIn(): Boolean
}
