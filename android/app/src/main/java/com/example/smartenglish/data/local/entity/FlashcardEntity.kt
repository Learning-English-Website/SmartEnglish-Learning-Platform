package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.example.smartenglish.domain.model.Flashcard
import com.example.smartenglish.domain.model.SyncStatus

@Entity(
    tableName = "flashcards",
    foreignKeys = [
        ForeignKey(
            entity = FlashcardSetEntity::class,
            parentColumns = ["id"],
            childColumns = ["setId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("setId")]
)
data class FlashcardEntity(
    @PrimaryKey val id: String,
    val setId: String,
    val front: String,
    val back: String,
    val pronunciation: String?,
    val example: String?,
    val note: String?,
    val collocation: String? = null,
    val relatedWords: String? = null,
    val imageUrl: String?,
    val createdAt: String?,
    val updatedAt: String?,
    val syncStatus: String = SyncStatus.SYNCED.name,
    val nextReviewDate: String? = null,
    val correctStreak: Int = 0,
    val localCreatedAt: Long = System.currentTimeMillis(),
    val localUpdatedAt: Long = System.currentTimeMillis(),
    val localImagePath: String? = null,
    val localAudioPath: String? = null,
    val lastSyncedAt: Long? = null
) {
    fun toDomain(): Flashcard {
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
            syncStatus = SyncStatus.valueOf(syncStatus),
            nextReviewDate = nextReviewDate,
            correctStreak = correctStreak
        )
    }

    companion object {
        fun fromDomain(card: Flashcard): FlashcardEntity {
            return FlashcardEntity(
                id = card.id,
                setId = card.setId,
                front = card.front,
                back = card.back,
                pronunciation = card.pronunciation,
                example = card.example,
                note = card.note,
                collocation = card.collocation,
                relatedWords = card.relatedWords,
                imageUrl = card.imageUrl,
                createdAt = card.createdAt,
                updatedAt = card.updatedAt,
                syncStatus = card.syncStatus.name,
                nextReviewDate = card.nextReviewDate,
                correctStreak = card.correctStreak,
                localCreatedAt = System.currentTimeMillis(),
                localUpdatedAt = System.currentTimeMillis(),
                localImagePath = null,
                localAudioPath = null,
                lastSyncedAt = null
            )
        }
    }
}
