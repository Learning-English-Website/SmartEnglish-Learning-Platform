package com.example.smartenglish.domain.model

data class ShareInfo(
    val id: String,
    val setId: String,
    val shareCode: String,
    val isActive: Boolean = true,
    val expiresAt: String?,
    val createdAt: String?
)

data class Tag(
    val id: String,
    val name: String,
    val category: String?,
    val count: Int = 0
)

fun com.example.smartenglish.data.remote.dto.TagDto.toDomain(): Tag {
    return Tag(
        id = id,
        name = name,
        category = category,
        count = count
    )
}

fun com.example.smartenglish.data.remote.dto.ShareDto.toDomain(): ShareInfo {
    return ShareInfo(
        id = id,
        setId = setId,
        shareCode = shareCode,
        isActive = isActive,
        expiresAt = expiresAt,
        createdAt = createdAt
    )
}
