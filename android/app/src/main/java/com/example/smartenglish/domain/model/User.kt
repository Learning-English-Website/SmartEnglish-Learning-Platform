package com.example.smartenglish.domain.model

data class Streak(
    val current: Int = 0,
    val longest: Int = 0,
    val lastStudyDate: String? = null
)

data class Gamification(
    val xp: Int = 0,
    val level: Int = 1
) {
    val xpToNextLevel: Int get() = 500
    val xpProgress: Float get() = (xp % xpToNextLevel).toFloat() / xpToNextLevel
}

data class User(
    val id: String,
    val email: String,
    val username: String,
    val role: String,
    val avatar: String?,
    val premium: String,
    val streak: Streak = Streak(),
    val gamification: Gamification = Gamification(),
    val createdAt: String?
)

fun com.example.smartenglish.data.remote.dto.UserDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        username = username,
        role = role,
        avatar = avatar,
        premium = premium,
        streak = streak?.let {
            Streak(
                current = it.current,
                longest = it.longest,
                lastStudyDate = it.lastStudyDate
            )
        } ?: Streak(),
        gamification = gamification?.let {
            Gamification(xp = it.xp, level = it.level)
        } ?: Gamification(),
        createdAt = createdAt
    )
}
