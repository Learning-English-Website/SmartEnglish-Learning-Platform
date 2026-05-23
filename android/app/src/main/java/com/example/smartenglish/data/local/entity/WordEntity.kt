package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "words",
    foreignKeys = [
        ForeignKey(
            entity = WordSetEntity::class,
            parentColumns = ["id"],
            childColumns = ["setId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("setId")]
)
data class WordEntity(
    @PrimaryKey val id: String,
    val setId: String,
    val word: String,
    val meaning: String,
    val pronunciation: String?,
    val example: String?,
    val note: String?
)
