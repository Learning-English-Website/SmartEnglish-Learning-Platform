package com.example.smartenglish.domain.usecase.auth

import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class VerifyOtpUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, otp: String): ApiResult<Unit> {
        return authRepository.verifyOtp(email, otp)
    }
}
