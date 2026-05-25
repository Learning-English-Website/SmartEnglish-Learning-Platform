package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.ShareApi
import com.example.smartenglish.data.remote.api.TagApi
import com.example.smartenglish.data.remote.dto.CreateShareRequest
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.ShareInfo
import com.example.smartenglish.domain.model.Tag
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.ShareRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShareRepositoryImpl @Inject constructor(
    private val shareApi: ShareApi,
    private val tagApi: TagApi
) : ShareRepository {

    override suspend fun getSharedSet(shareCode: String): ApiResult<FlashcardSet> {
        return try {
            val response = shareApi.getSharedSet(shareCode)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to get shared set"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun createShare(setId: String, expiresIn: Int?): ApiResult<ShareInfo> {
        return try {
            val response = shareApi.createShare(CreateShareRequest(setId, expiresIn))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to create share"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun deleteShare(setId: String): ApiResult<Unit> {
        return try {
            val response = shareApi.deleteShare(setId)
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(Unit)
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to delete share"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getShareBySetId(setId: String): ApiResult<ShareInfo> {
        return try {
            val response = shareApi.getUserShares()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                val share = data.find { it.setId == setId }
                if (share != null) {
                    ApiResult.Success(share.toDomain())
                } else {
                    ApiResult.Error("No share found for this set")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to get share"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getPublicTags(): ApiResult<List<Tag>> {
        return try {
            val response = tagApi.getPublicTags()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                ApiResult.Success(data.map { it.toDomain() })
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to get tags"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
