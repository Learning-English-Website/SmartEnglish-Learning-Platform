package com.example.smartenglish.domain.usecase.auth

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.AuthRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, password: String): ApiResult<User> {
        return authRepository.login(email, password)
    }
}
