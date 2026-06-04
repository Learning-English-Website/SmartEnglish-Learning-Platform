package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.UserApi
import com.example.smartenglish.data.remote.api.MediaApi
import com.example.smartenglish.data.remote.dto.UpdateProfileRequest
import com.example.smartenglish.domain.model.User
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.UserRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import com.example.smartenglish.util.ErrorParser
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val userApi: UserApi,
    private val mediaApi: MediaApi,
    private val networkMonitor: NetworkMonitor
) : UserRepository {

    override suspend fun getMe(): ApiResult<User> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return@withContext try {
            val response = userApi.getMe()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to get user: No data received")
                }
            } else {
                val rawError = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to get user"
                ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateProfile(username: String?, avatar: String?): ApiResult<User> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return@withContext try {
            val response = userApi.updateProfile(UpdateProfileRequest(username, avatar))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("Failed to update profile: No data received")
                }
            } else {
                val rawError = response.body()?.error?.message
                    ?: response.errorBody()?.string()
                    ?: "Failed to update profile"
                ApiResult.Error(ErrorParser.parseErrorMessage(rawError))
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun uploadImage(bytes: ByteArray, fileName: String): ApiResult<String> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return@withContext try {
            val extension = fileName.substringAfterLast('.', "jpg").lowercase()
            val mimeType = when (extension) {
                "png" -> "image/png"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "svg" -> "image/svg+xml"
                else -> "image/jpeg"
            }
            val requestFile = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("image", fileName, requestFile)
            val response = mediaApi.uploadImage(body)
            if (response.isSuccessful && response.body()?.success == true) {
                val url = response.body()?.url
                if (url != null) {
                    ApiResult.Success(url)
                } else {
                    ApiResult.Error("Không có đường dẫn trả về từ server")
                }
            } else {
                ApiResult.Error(response.body()?.message ?: "Tải ảnh lên thất bại")
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Lỗi kết nối khi tải ảnh")
        }
    }
}
