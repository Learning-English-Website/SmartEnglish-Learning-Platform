package com.example.smartenglish.domain.model

import com.example.smartenglish.data.remote.dto.FolderDto

data class Folder(
    val id: String,
    val name: String,
    val parentId: String? = null,
    val sets: List<String> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

fun FolderDto.toDomain(): Folder {
    return Folder(
        id = id,
        name = name,
        parentId = parentId,
        sets = sets,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}
