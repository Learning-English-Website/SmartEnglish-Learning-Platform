package com.example.smartenglish.data.repository

import com.example.smartenglish.data.remote.api.GamificationApi
import com.example.smartenglish.data.remote.dto.MatchSubmitRequest
import com.example.smartenglish.data.remote.dto.SessionCompleteRequest
import com.example.smartenglish.domain.model.Achievement
import com.example.smartenglish.domain.model.SessionCompleteResult
import com.example.smartenglish.domain.model.StreakResult
import com.example.smartenglish.domain.model.XpResult
import com.example.smartenglish.domain.repository.GamificationRepository
import com.example.smartenglish.util.ApiResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GamificationRepositoryImpl @Inject constructor(
    private val api: GamificationApi
) : GamificationRepository {

    override suspend fun triggerLearnComplete(
        accuracy: Int,
        cardsStudied: Int
    ): ApiResult<SessionCompleteResult> = safeCall {
        api.triggerLearnComplete(SessionCompleteRequest(accuracy, cardsStudied))
    }

    override suspend fun triggerTestComplete(
        accuracy: Int,
        cardsStudied: Int
    ): ApiResult<SessionCompleteResult> = safeCall {
        api.triggerTestComplete(SessionCompleteRequest(accuracy, cardsStudied))
    }

    override suspend fun submitMatchScore(
        setId: String,
        timeMs: Long
    ): ApiResult<SessionCompleteResult> = safeCall {
        api.submitMatchScore(MatchSubmitRequest(setId, timeMs))
    }

    override suspend fun getAchievements(): ApiResult<List<Achievement>> {
        return try {
            val response = api.getAchievements()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: emptyList()
                ApiResult.Success(data.map { dto ->
                    Achievement(
                        key = dto.key,
                        title = dto.title,
                        description = dto.description,
                        emoji = dto.emoji,
                        xpReward = dto.xpReward,
                        unlocked = dto.unlocked,
                        unlockedAt = dto.unlockedAt
                    )
                })
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Failed to load achievements")
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    // ── Shared helper ─────────────────────────────────────────────────────────
    private suspend fun safeCall(
        block: suspend () -> retrofit2.Response<com.example.smartenglish.data.remote.dto.ApiResponse<com.example.smartenglish.data.remote.dto.SessionCompleteResponseDto>>
    ): ApiResult<SessionCompleteResult> {
        return try {
            val response = block()
            if (response.isSuccessful && response.body()?.success == true) {
                val dto = response.body()?.data
                ApiResult.Success(dto.toDomain())
            } else {
                ApiResult.Error(response.body()?.error?.message ?: "Request failed")
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }

    private fun com.example.smartenglish.data.remote.dto.SessionCompleteResponseDto?.toDomain(): SessionCompleteResult {
        if (this == null) return SessionCompleteResult()
        return SessionCompleteResult(
            streak = streak?.let {
                StreakResult(
                    current = it.current,
                    longest = it.longest,
                    streakBroken = it.streakBroken,
                    isNewRecord = it.isNewRecord
                )
            },
            xp = xp?.let {
                XpResult(
                    gained = it.gained,
                    total = it.total,
                    oldLevel = it.oldLevel,
                    newLevel = it.level,
                    levelUp = it.levelUp,
                    xpPerLevel = it.xpPerLevel,
                    xpToNextLevel = it.xpToNextLevel
                )
            },
            newAchievements = newAchievements.map { dto ->
                Achievement(
                    key = dto.key,
                    title = dto.title,
                    description = dto.description,
                    emoji = dto.emoji,
                    xpReward = dto.xpReward,
                    unlocked = true
                )
            }
        )
    }
}
