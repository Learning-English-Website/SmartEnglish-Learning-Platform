package com.example.smartenglish.domain.model

data class FlashcardSet(
    val id: String,
    val title: String,
    val description: String? = null,
    val language: String? = null,
    val isPublic: Boolean = false,
    val shareCode: String? = null,
    val cardCount: Int = 0,
    val userId: String? = null,
    val userName: String? = null,
    val tags: List<String> = emptyList(),
    val tagObjects: List<Tag> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: SyncStatus = SyncStatus.SYNCED
)

enum class SyncStatus {
    SYNCED,
    PENDING,
    DIRTY,
    DELETED
}

fun com.example.smartenglish.data.remote.dto.FlashcardSetDto.toDomain(): FlashcardSet {
    return FlashcardSet(
        id = id,
        title = title,
        description = description,
        language = language,
        isPublic = isPublic,
        shareCode = shareCode,
        cardCount = cardCount,
        userId = userId,
        userName = userName,
        tags = tags.mapNotNull { if (it is String) it else null },
        tagObjects = tagObjects.map { Tag(id = it.id, name = it.name, category = it.category, count = it.count) },
        createdAt = createdAt,
        updatedAt = updatedAt,
        syncStatus = SyncStatus.SYNCED
    )
}
