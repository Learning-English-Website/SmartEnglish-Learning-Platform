package com.example.smartenglish.domain.model

data class Flashcard(
    val id: String,
    val setId: String,
    val front: String,
    val back: String,
    val pronunciation: String? = null,
    val example: String? = null,
    val note: String? = null,
    val collocation: String? = null,
    val relatedWords: String? = null,
    val imageUrl: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val nextReviewDate: String? = null,
    val correctStreak: Int = 0
)

fun com.example.smartenglish.data.remote.dto.FlashcardDto.toDomain(): Flashcard {
    return Flashcard(
        id = id,
        setId = setId,
        front = front,
        back = back,
        pronunciation = pronunciation,
        example = example,
        note = note,
        collocation = collocation,
        relatedWords = relatedWords,
        imageUrl = imageUrl,
        createdAt = createdAt,
        updatedAt = updatedAt,
        syncStatus = SyncStatus.SYNCED
    )
}
