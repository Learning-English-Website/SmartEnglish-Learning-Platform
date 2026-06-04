package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * DTO cho GET /api/progress/stats
 * Khớp với getOverallStats() trong progress.service.js
 */
@JsonClass(generateAdapter = true)
data class ProgressStatsDto(
    @Json(name = "totalCardsStudied") val totalCardsStudied: Int = 0,
    @Json(name = "totalSessionsCompleted") val totalSessionsCompleted: Int = 0,
    @Json(name = "totalTimeSpentMs") val totalTimeSpentMs: Long = 0L,
    @Json(name = "averageAccuracy") val averageAccuracy: Int = 0,
    @Json(name = "currentStreak") val currentStreak: Int = 0,
    @Json(name = "longestStreak") val longestStreak: Int = 0,
    @Json(name = "masteredCards") val masteredCards: Int = 0,
    @Json(name = "learningCards") val learningCards: Int = 0,
    @Json(name = "newCards") val newCards: Int = 0,
    @Json(name = "level") val level: Int = 1,
    @Json(name = "xp") val xp: Int = 0,
    @Json(name = "xpToNextLevel") val xpToNextLevel: Int = 500,
    @Json(name = "dueToday") val dueToday: Int = 0,
    @Json(name = "todayXp") val todayXp: Int = 0
)
