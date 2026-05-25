package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.smartenglish.domain.model.FlashcardSet
import com.example.smartenglish.domain.model.SyncStatus

@Entity(tableName = "flashcard_sets")
data class FlashcardSetEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String?,
    val language: String? = null,
    val isPublic: Boolean = false,
    val shareCode: String?,
    val cardCount: Int = 0,
    val userId: String?,
    val tags: String = "",
    val createdAt: String?,
    val updatedAt: String?,
    val syncStatus: String = SyncStatus.SYNCED.name,
    val localCreatedAt: Long = System.currentTimeMillis(),
    val localUpdatedAt: Long = System.currentTimeMillis()
) {
    fun toDomain(): FlashcardSet {
        return FlashcardSet(
            id = id,
            title = title,
            description = description,
            language = language,
            isPublic = isPublic,
            shareCode = shareCode,
            cardCount = cardCount,
            userId = userId,
            tags = if (tags.isBlank()) emptyList() else tags.split(","),
            createdAt = createdAt,
            updatedAt = updatedAt,
            syncStatus = SyncStatus.valueOf(syncStatus)
        )
    }

    companion object {
        fun fromDomain(set: FlashcardSet): FlashcardSetEntity {
            return FlashcardSetEntity(
                id = set.id,
                title = set.title,
                description = set.description,
                language = set.language,
                isPublic = set.isPublic,
                shareCode = set.shareCode,
                cardCount = set.cardCount,
                userId = set.userId,
                tags = set.tags.joinToString(","),
                createdAt = set.createdAt,
                updatedAt = set.updatedAt,
                syncStatus = set.syncStatus.name,
                localCreatedAt = System.currentTimeMillis(),
                localUpdatedAt = System.currentTimeMillis()
            )
        }
    }
}
