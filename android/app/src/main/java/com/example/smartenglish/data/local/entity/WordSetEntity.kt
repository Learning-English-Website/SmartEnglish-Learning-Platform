package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "word_sets")
data class WordSetEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val language: String,
    val wordCount: Int,
    val createdAt: String
)
