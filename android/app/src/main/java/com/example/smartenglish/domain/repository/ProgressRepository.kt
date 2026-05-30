package com.example.smartenglish.domain.repository

import com.example.smartenglish.data.remote.dto.ProgressStatsDto
import com.example.smartenglish.util.ApiResult

interface ProgressRepository {
    suspend fun getOverallStats(): ApiResult<ProgressStatsDto>
}
