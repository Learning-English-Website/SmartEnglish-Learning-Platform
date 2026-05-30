package com.example.smartenglish.domain.model

/** Kết quả XP nhận được sau 1 session */
data class XpResult(
    val gained: Int = 0,
    val total: Int = 0,
    val oldLevel: Int = 1,
    val newLevel: Int = 1,
    val levelUp: Boolean = false,
    val xpPerLevel: Int = 500,
    val xpToNextLevel: Int = 500
)

/** Kết quả cập nhật streak */
data class StreakResult(
    val current: Int = 0,
    val longest: Int = 0,
    val streakBroken: Boolean = false,
    val isNewRecord: Boolean = false
)

/** 1 achievement (có thể locked hoặc unlocked) */
data class Achievement(
    val key: String,
    val title: String,
    val description: String,
    val emoji: String,
    val xpReward: Int = 0,
    val unlocked: Boolean = false,
    val unlockedAt: String? = null
)

/** Response sau khi hoàn thành 1 session */
data class SessionCompleteResult(
    val streak: StreakResult? = null,
    val xp: XpResult? = null,
    val newAchievements: List<Achievement> = emptyList()
) {
    val hasRewards: Boolean get() =
        (xp?.gained ?: 0) > 0 || newAchievements.isNotEmpty()
}
