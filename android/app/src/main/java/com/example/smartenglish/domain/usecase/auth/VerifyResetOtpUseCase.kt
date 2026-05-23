package com.example.smartenglish.domain.usecase.auth

import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class VerifyResetOtpUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, otp: String): ApiResult<Unit> {
        return authRepository.verifyResetOtp(email, otp)
    }
}
