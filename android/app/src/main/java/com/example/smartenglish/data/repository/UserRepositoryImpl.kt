package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.UserApi
import com.example.smartenglish.data.remote.dto.UpdateProfileRequest
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val userApi: UserApi
) : UserRepository {

    override suspend fun getMe(): ApiResult<User> {
        return try {
            val response = userApi.getMe()
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

    override suspend fun updateProfile(username: String?, avatar: String?): ApiResult<User> {
        return try {
            val response = userApi.updateProfile(UpdateProfileRequest(username, avatar))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to update profile: No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to update profile"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
