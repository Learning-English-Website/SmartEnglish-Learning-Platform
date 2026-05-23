package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "study_progress",
    foreignKeys = [
        ForeignKey(
            entity = WordEntity::class,
            parentColumns = ["id"],
            childColumns = ["wordId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("wordId")]
)
data class StudyProgressEntity(
    @PrimaryKey val id: String,
    val wordId: String,
    val status: String,
    val easeFactor: Float,
    val interval: Int,
    val nextReviewAt: String
)
