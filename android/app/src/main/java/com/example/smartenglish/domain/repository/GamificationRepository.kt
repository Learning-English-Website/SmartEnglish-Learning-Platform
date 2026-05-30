package com.example.smartenglish.domain.repository

import com.example.smartenglish.domain.model.Achievement
import com.example.smartenglish.domain.model.SessionCompleteResult
import com.example.smartenglish.util.ApiResult

interface GamificationRepository {
    /** Trigger XP + streak + achievements sau Learn/Flashcard mode */
    suspend fun triggerLearnComplete(accuracy: Int, cardsStudied: Int): ApiResult<SessionCompleteResult>

    /** Trigger XP + streak + achievements sau Test mode */
    suspend fun triggerTestComplete(accuracy: Int, cardsStudied: Int): ApiResult<SessionCompleteResult>

    /** Trigger sau Match mode */
    suspend fun submitMatchScore(setId: String, timeMs: Long): ApiResult<SessionCompleteResult>

    /** Lấy tất cả achievements của user */
    suspend fun getAchievements(): ApiResult<List<Achievement>>
}
