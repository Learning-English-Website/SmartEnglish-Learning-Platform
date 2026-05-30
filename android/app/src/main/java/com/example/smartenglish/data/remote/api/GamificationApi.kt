package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface GamificationApi {

    /** GET /api/gamification/stats — streak + XP + level */
    @GET("gamification/stats")
    suspend fun getStats(): Response<ApiResponse<GamificationStatsDto>>

    /** GET /api/gamification/achievements — tất cả badges */
    @GET("gamification/achievements")
    suspend fun getAchievements(): Response<ApiListResponse<AchievementDto>>

    /** POST /api/gamification/learn/complete — trigger sau Learn/Flashcard mode */
    @POST("gamification/learn/complete")
    suspend fun triggerLearnComplete(
        @Body request: SessionCompleteRequest
    ): Response<ApiResponse<SessionCompleteResponseDto>>

    /** POST /api/gamification/test/complete — trigger sau Test mode */
    @POST("gamification/test/complete")
    suspend fun triggerTestComplete(
        @Body request: SessionCompleteRequest
    ): Response<ApiResponse<SessionCompleteResponseDto>>

    /** POST /api/gamification/match/submit — trigger sau Match mode */
    @POST("gamification/match/submit")
    suspend fun submitMatchScore(
        @Body request: MatchSubmitRequest
    ): Response<ApiResponse<SessionCompleteResponseDto>>
}
