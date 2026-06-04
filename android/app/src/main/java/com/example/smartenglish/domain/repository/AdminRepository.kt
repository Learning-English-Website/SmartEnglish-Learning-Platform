package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.User
import com.example.smartenglish.util.ApiResult

interface AdminRepository {
    suspend fun getUsers(
        search: String? = null,
        role: String? = null,
        page: Int = 1,
        limit: Int = 10
    ): ApiResult<AdminUserPage>

    suspend fun getUserById(userId: String): ApiResult<User>

    suspend fun updateUser(
        userId: String,
        username: String? = null,
        avatar: String? = null,
        premium: String? = null
    ): ApiResult<User>

    suspend fun deleteUser(userId: String): ApiResult<Unit>
}

data class AdminUserPage(
    val users: List<User>,
    val total: Int,
    val premiumUsers: Int,
    val verifiedUsers: Int,
    val page: Int,
    val pages: Int
)
