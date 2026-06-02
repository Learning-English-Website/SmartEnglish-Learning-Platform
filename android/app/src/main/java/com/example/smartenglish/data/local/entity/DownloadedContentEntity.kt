package com.example.smartenglish.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "downloaded_content")
data class DownloadedContentEntity(
    @PrimaryKey val contentId: String,
    val contentType: String,   // "set" or "folder"
    val title: String,
    val cardCount: Int,
    val downloadedAt: Long,
    val sizeBytes: Long = 0,
    val mediaIncluded: Boolean = false
)
