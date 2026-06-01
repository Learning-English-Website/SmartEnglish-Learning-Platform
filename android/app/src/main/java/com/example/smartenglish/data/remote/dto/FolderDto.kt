package com.example.smartenglish.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class FolderDto(
    @Json(name = "_id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "parentId") val parentId: String? = null,
    @Json(name = "sets") val sets: List<String> = emptyList(),
    @Json(name = "createdAt") val createdAt: String? = null,
    @Json(name = "updatedAt") val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class CreateFolderRequest(
    @Json(name = "name") val name: String,
    @Json(name = "parent") val parent: String? = null
)

@JsonClass(generateAdapter = true)
data class UpdateFolderRequest(
    @Json(name = "name") val name: String? = null,
    @Json(name = "parent") val parent: String? = null
)

@JsonClass(generateAdapter = true)
data class AddSetToFolderRequest(
    @Json(name = "setId") val setId: String
)

@JsonClass(generateAdapter = true)
data class FolderSetsResponse(
    @Json(name = "_id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "parent") val parent: String? = null,
    @Json(name = "sets") val sets: List<FlashcardSetDto> = emptyList()
)
