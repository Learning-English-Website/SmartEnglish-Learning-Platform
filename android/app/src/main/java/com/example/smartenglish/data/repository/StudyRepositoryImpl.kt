package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.StudyApi
import com.example.smartenglish.data.remote.dto.CreateStudySessionRequest
import com.example.smartenglish.data.remote.dto.UpdateStudySessionRequest
import com.example.smartenglish.domain.model.StudySession
import com.example.smartenglish.domain.model.toDomain
import com.example.smartenglish.domain.repository.StudyRepository
import com.example.smartenglish.util.ApiResult
import com.example.smartenglish.util.NetworkMonitor
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudyRepositoryImpl @Inject constructor(
    private val studyApi: StudyApi,
    private val networkMonitor: NetworkMonitor
) : StudyRepository {

    override suspend fun getStudySessionsBySet(setId: String): ApiResult<List<StudySession>> {
        if (!networkMonitor.isOnline.value) {
            return ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return try {
            val response = studyApi.getStudySessionsBySet(setId)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                ApiResult.Success(data.map { it.toDomain() })
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to get study sessions"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getAllStudySessions(): ApiResult<List<StudySession>> {
        if (!networkMonitor.isOnline.value) {
            return ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return try {
            val response = studyApi.getAllStudySessions()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                ApiResult.Success(data.map { it.toDomain() })
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to get study sessions"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun createStudySession(setId: String): ApiResult<StudySession> {
        if (!networkMonitor.isOnline.value) {
            return ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return try {
            val response = studyApi.createStudySession(CreateStudySessionRequest(setId))
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to create study session"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun updateStudySession(
        id: String,
        cardsStudied: Int,
        correctCount: Int,
        incorrectCount: Int,
        duration: Int
    ): ApiResult<StudySession> {
        if (!networkMonitor.isOnline.value) {
            return ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return try {
            // Submit answer for the session
            val response = studyApi.submitAnswer(
                id,
                UpdateStudySessionRequest(
                    cardsStudied = cardsStudied,
                    correctCount = correctCount,
                    incorrectCount = incorrectCount,
                    duration = duration
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to update study session"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    override suspend fun completeStudySession(id: String): ApiResult<StudySession> {
        if (!networkMonitor.isOnline.value) {
            return ApiResult.Error("Thiết bị đang ngoại tuyến")
        }
        return try {
            val response = studyApi.completeSession(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toDomain())
                } else {
                    ApiResult.Error("No data received")
                }
            } else {
                val errorMessage = response.body()?.error?.message ?: "Failed to complete study session"
                ApiResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}
