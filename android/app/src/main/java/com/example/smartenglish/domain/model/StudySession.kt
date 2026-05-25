package com.example.smartenglish.domain.model

data class StudySession(
    val id: String,
    val userId: String,
    val setId: String,
    val setName: String?,
    val cardsStudied: Int = 0,
    val correctCount: Int = 0,
    val incorrectCount: Int = 0,
    val duration: Int = 0,
    val startedAt: String?,
    val completedAt: String?
)

fun com.example.smartenglish.data.remote.dto.StudySessionDto.toDomain(): StudySession {
    return StudySession(
        id = id,
        userId = userId,
        setId = setId,
        setName = setName,
        cardsStudied = cardsStudied,
        correctCount = correctCount,
        incorrectCount = incorrectCount,
        duration = duration,
        startedAt = startedAt,
        completedAt = completedAt
    )
}
