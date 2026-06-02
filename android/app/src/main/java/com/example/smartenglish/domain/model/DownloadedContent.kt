package com.example.smartenglish.domain.model

data class DownloadedContent(
    val contentId: String,
    val contentType: String,
    val title: String,
    val cardCount: Int,
    val downloadedAt: Long,
    val sizeBytes: Long,
    val mediaIncluded: Boolean
)
