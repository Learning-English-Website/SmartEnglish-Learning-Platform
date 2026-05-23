package com.example.smartenglish.domain.usecase.auth

import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class ForgotPasswordUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String): ApiResult<Unit> {
        return authRepository.forgotPassword(email)
    }
}
