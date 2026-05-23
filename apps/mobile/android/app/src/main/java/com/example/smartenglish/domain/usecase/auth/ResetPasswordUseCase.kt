package com.example.smartenglish.domain.usecase.auth

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class ResetPasswordUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, otp: String, newPassword: String): ApiResult<User> {
        return authRepository.resetPassword(email, otp, newPassword)
    }
}
