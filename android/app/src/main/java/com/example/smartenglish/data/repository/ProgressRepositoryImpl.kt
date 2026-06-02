package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.ProgressApi
import com.example.smartenglish.data.remote.dto.ProgressStatsDto
import com.example.smartenglish.domain.repository.ProgressRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProgressRepositoryImpl @Inject constructor(
    private val progressApi: ProgressApi,
    private val networkMonitor: NetworkMonitor
) : ProgressRepository {

    override suspend fun getOverallStats(): ApiResult<ProgressStatsDto> = withContext(Dispatchers.IO) {
        if (!networkMonitor.isOnline.value) {
            return@withContext ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return@withContext try {
            val response = progressApi.getOverallStats()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("No stats data received")
                }
            } else {
                val errorMsg = response.body()?.error?.message ?: "Failed to load stats"
                ApiResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
