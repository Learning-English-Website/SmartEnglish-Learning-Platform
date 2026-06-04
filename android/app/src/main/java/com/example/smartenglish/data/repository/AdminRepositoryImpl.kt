package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.AdminApi
import com.example.smartenglish.data.remote.dto.UpdateAdminUserRequest
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.AdminRepository
import com.example.smartenglish.domain.repository.AdminUserPage
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepositoryImpl @Inject constructor(
    private val adminApi: AdminApi,
    private val networkMonitor: NetworkMonitor
) : AdminRepository {

    override suspend fun getUsers(
        search: String?,
        role: String?,
        page: Int,
        limit: Int
    ): ApiResult<AdminUserPage> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }

        return@withContext try {
            val response = adminApi.getUsers(
                search = search?.takeIf { it.isNotBlank() },
                role = role?.takeIf { it.isNotBlank() },
                page = page,
                limit = limit
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(
                        AdminUserPage(
                            users = data.users.map { it.toDomain() },
                            total = data.total,
                            premiumUsers = data.premiumUsers,
                            verifiedUsers = data.verifiedUsers,
                            page = data.page,
                            pages = data.pages
                        )
                    )
                } else {
                    ApiResult.Error("Failed to get users: No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to get users"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getUserById(userId: String): ApiResult<User> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }

        return@withContext try {
            val response = adminApi.getUserById(userId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to get user: No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to get user"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateUser(
        userId: String,
        username: String?,
        avatar: String?,
        premium: String?
    ): ApiResult<User> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }

        return@withContext try {
            val response = adminApi.updateUser(
                userId = userId,
                body = UpdateAdminUserRequest(
                    username = username,
                    avatar = avatar,
                    premium = premium
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to update user: No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to update user"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun deleteUser(userId: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }

        return@withContext try {
            val response = adminApi.deleteUser(userId)
            if (response.isSuccessful) {
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.errorBody()?.string()
                    ?: response.message()
                    ?: "Failed to delete user"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
