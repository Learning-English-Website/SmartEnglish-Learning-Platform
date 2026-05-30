package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── XP Result ────────────────────────────────────────────────────────────────
@JsonClass(generateAdapter = true)
data class XpResultDto(
    @Json(name = "gained")       val gained: Int = 0,
    @Json(name = "oldXP")        val oldXP: Int = 0,
    @Json(name = "total")        val total: Int = 0,
    @Json(name = "oldLevel")     val oldLevel: Int = 1,
    @Json(name = "level")        val level: Int = 1,
    @Json(name = "levelUp")      val levelUp: Boolean = false,
    @Json(name = "xpPerLevel")   val xpPerLevel: Int = 500,
    @Json(name = "xpToNextLevel") val xpToNextLevel: Int = 500
)

// ── Streak Result ─────────────────────────────────────────────────────────────
@JsonClass(generateAdapter = true)
data class StreakResultDto(
    @Json(name = "current")      val current: Int = 0,
    @Json(name = "longest")      val longest: Int = 0,
    @Json(name = "streakBroken") val streakBroken: Boolean = false,
    @Json(name = "isNewRecord")  val isNewRecord: Boolean = false
)

// ── Achievement ───────────────────────────────────────────────────────────────
@JsonClass(generateAdapter = true)
data class AchievementDto(
    @Json(name = "key")         val key: String,
    @Json(name = "title")       val title: String,
    @Json(name = "description") val description: String,
    @Json(name = "emoji")       val emoji: String,
    @Json(name = "xpReward")    val xpReward: Int = 0,
    // Chỉ có trong GET /achievements (danh sách đầy đủ)
    @Json(name = "unlocked")    val unlocked: Boolean = false,
    @Json(name = "unlockedAt")  val unlockedAt: String? = null
)

// ── Session Complete Response (learn/complete hoặc test/complete) ─────────────
@JsonClass(generateAdapter = true)
data class SessionCompleteResponseDto(
    @Json(name = "streak")          val streak: StreakResultDto? = null,
    @Json(name = "xp")              val xp: XpResultDto? = null,
    @Json(name = "newAchievements") val newAchievements: List<AchievementDto> = emptyList()
)

// ── Gamification Stats (GET /gamification/stats) ──────────────────────────────
@JsonClass(generateAdapter = true)
data class GamificationStatDto(
    @Json(name = "xp")          val xp: Int = 0,
    @Json(name = "level")       val level: Int = 1,
    @Json(name = "xpToNextLevel")    val xpToNextLevel: Int = 500,
    @Json(name = "xpCurrentLevel")   val xpCurrentLevel: Int = 0,
    @Json(name = "xpPerLevel")       val xpPerLevel: Int = 500
)

@JsonClass(generateAdapter = true)
data class StreakStatDto(
    @Json(name = "current")       val current: Int = 0,
    @Json(name = "longest")       val longest: Int = 0,
    @Json(name = "studiedToday")  val studiedToday: Boolean = false,
    @Json(name = "lastStudyDate") val lastStudyDate: String? = null
)

@JsonClass(generateAdapter = true)
data class GamificationStatsDto(
    @Json(name = "streak")       val streak: StreakStatDto = StreakStatDto(),
    @Json(name = "gamification") val gamification: GamificationStatDto = GamificationStatDto()
)

// ── Requests ──────────────────────────────────────────────────────────────────
@JsonClass(generateAdapter = true)
data class SessionCompleteRequest(
    @Json(name = "accuracy")     val accuracy: Int,
    @Json(name = "cardsStudied") val cardsStudied: Int
)

@JsonClass(generateAdapter = true)
data class MatchSubmitRequest(
    @Json(name = "setId")  val setId: String,
    @Json(name = "timeMs") val timeMs: Long
)
