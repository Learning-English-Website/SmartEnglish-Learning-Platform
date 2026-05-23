package com.example.smartenglish.domain.usecase.auth

import android.util.Log
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class VerifyOtpUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, otp: String): ApiResult<Unit> {
        Log.d("VerifyOtpUseCase", "invoke called - email: $email, otp: $otp")
        val result = authRepository.verifyOtp(email, otp)
        Log.d("VerifyOtpUseCase", "result: $result")
        return result
    }
}
