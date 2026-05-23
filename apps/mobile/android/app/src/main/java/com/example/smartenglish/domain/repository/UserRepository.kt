package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.util.ApiResult

interface UserRepository {
    suspend fun getMe(): ApiResult<User>
    suspend fun updateProfile(username: String?, avatar: String?): ApiResult<User>
}
