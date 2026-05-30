package com.example.smartenglish.data.remote.api

import com.example.smartenglish.data.remote.dto.ApiResponse
import com.example.smartenglish.data.remote.dto.ProgressStatsDto
import retrofit2.Response
import retrofit2.http.GET

interface ProgressApi {

    /**
     * GET /api/progress/stats
     * Trả về tổng hợp: totalCards, masteredCards, dueToday, streak, ...
     */
    @GET("progress/stats")
    suspend fun getOverallStats(): Response<ApiResponse<ProgressStatsDto>>
}
