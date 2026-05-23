package com.example.smartenglish.domain.usecase.user

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject

class UpdateProfileUseCase @Inject constructor(
    private val userRepository: UserRepository
) {
    suspend operator fun invoke(username: String?, avatar: String?): ApiResult<User> {
        return userRepository.updateProfile(username, avatar)
    }
}
